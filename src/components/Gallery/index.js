import React, { useEffect, useState } from "react";
import PCABarPlot from "../Plots/PCABarPlot";
import ClusterBarPlot from "../Plots/ClusterBarPlot";
import CellLabelTable from "../Plots/CellLabelTable";

import { useContext } from "react";
import { AppContext } from "./../../context/AppContext";
import { Card, Elevation, Classes, Button, Divider } from "@blueprintjs/core";
import QCPlotMgr from "../Plots/QCPlotMgr";

import { isObject } from "../../context/utils.js";

import "./Gallery.css";
import ImgPlot from "../Plots/ImgPlot";
import UDimPlot from "../Plots/uDimPlot";

import { DndContext } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { SortableItem } from "./SortableItem";

import { Popover2 } from "@blueprintjs/popover2";

const Gallery = (props) => {
  const [items, setItems] = useState([]);
  const [itemContent, setItemContent] = useState({});
  const { datasetName, genesInfo, geneColSel } = useContext(AppContext);

  function get_image_title(data) {
    let text = ` ${data?.config?.embedding} `;
    if (data?.config?.gene) {
      text += `⊃ ${genesInfo[geneColSel][props?.gene]} `;
    }

    if (data?.config?.annotation) {
      text += `⊃ ${data.config?.annotation} `;

      if (data?.config?.highlight) {
        if (String(data?.config?.highlight).startsWith("cs")) {
          text += `(selection ${data?.config?.highlight}) `;
        } else {
          text += `(cluster ${parseInt(data?.config?.highlight) + 1}) `;
        }
      }
    }

    return text;
  }

  useEffect(() => {
    get_children();
  }, [props]);

  function get_children() {
    let tmpItems = [];
    let tmpItemContent = {};

    if (props?.qcData && isObject(props?.qcData?.data)) {
      Object.keys(props?.qcData?.data).map((x) => {
        let tqc = {
          data: props?.qcData?.data[x],
          ranges: props?.qcData?.ranges[x],
          thresholds: props?.qcData?.thresholds[x],
        };

        tmpItems.push("1");
        tmpItemContent["1"] = {
          // id: 1,
          title: `QC for ${x}`,
          className: props?.showQCLoader
            ? "gitem effect-opacitygrayscale"
            : "gitem",
          actions: ["download"],
          content: <QCPlotMgr title={x} data={tqc} />,
        };
      });
    }

    if (props?.pcaVarExp) {
      tmpItems.push("2");

      tmpItemContent["2"] = {
        // id: 2,
        title: "PCA: % variance explained",
        className: props?.showPCALoader
          ? "gitem effect-opacitygrayscale"
          : "gitem",
        actions: ["download"],
        content: (
          <PCABarPlot
            title={datasetName.split(" ").join("_")}
            pca={props?.pcaVarExp}
          />
        ),
      };
    }

    if (props?.clusterData && props?.clusterColors) {
      tmpItems.push("3");
      tmpItemContent["3"] = {
        // id: 3,
        title: "Cluster: Num. of cells per cluster",
        className: props?.showNClusLoader
          ? "gitem effect-opacitygrayscale"
          : "gitem",
        actions: ["download"],
        content: (
          <ClusterBarPlot
            data={props?.clusterData}
            clusterColors={props?.clusterColors}
            setClusHighlight={props?.setClusHighlight}
            clusHighlight={props?.clusHighlight}
          />
        ),
      };
    }

    if (
      props?.cellLabelData &&
      Object.keys(props?.cellLabelData?.per_reference).length > 0
    ) {
      tmpItems.push("4");
      tmpItemContent["4"] = {
        // id: 4,
        title: (
          <>
            {" "}
            <Popover2
              popoverClassName={Classes.POPOVER_CONTENT_SIZING}
              hasBackdrop={false}
              interactionKind="hover"
              placement="auto"
              hoverOpenDelay={50}
              modifiers={{
                arrow: { enabled: true },
                flip: { enabled: true },
                preventOverflow: { enabled: true },
              }}
              content={
                <Card
                  style={{
                    width: "450px",
                  }}
                  elevation={Elevation.ZERO}
                >
                  <p>
                    Perform cell type annotation for human and mouse datasets.
                    This uses the{" "}
                    <a
                      target="_blank"
                      href="https://bioconductor.org/packages/release/bioc/html/SingleR.html"
                    >
                      SingleR
                    </a>{" "}
                    algorithm to label clusters based on their similarity to
                    reference expression profiles of curated cell types.
                    Similarity is quantified using Spearman correlations on the
                    top marker genes for each reference type, with additional
                    fine-tuning iterations to improve resolution between closely
                    related labels.
                  </p>
                  <p>
                    <strong>Best match</strong>: Classification of the clusters
                    is performed separately for each chosen reference reference.
                    If multiple references are selected, an additional round of
                    scoring is performed to determine which reference has the
                    best label for each cluster.
                  </p>
                </Card>
              }
            >
              <span
                style={{
                  textDecoration: "underline",
                  cursor: "help",
                }}
              >
                Cell Labels
              </span>
            </Popover2>
            <span
              style={{
                fontStyle: "italic",
                color: "#2B95D6",
                fontWeight: "bold",
              }}
            >
              {" "}
              (best match)
            </span>
          </>
        ),
        className: props?.showCellLabelLoader
          ? "gitem effect-opacitygrayscale"
          : "gitem",
        actions: ["download"],
        content: <CellLabelTable data={props?.cellLabelData} />,
      };
    }

    // default plots, tSNE and UMAP
    if (props?.redDims && props?.redDims.length > 0) {
      let actions = ["select", "download"];
      if (props?.selectedPoints && props?.selectedPoints.length > 0) {
        actions = ["highlight", "select", "download"];
      }

      let colors = [];
      props?.clusterData?.clusters?.forEach((x,i) => colors[i] = props?.clusterColors[x]);

      props?.redDims.map((x, i) => {
        tmpItems.push(`${5 + i}`);
        tmpItemContent[`${5 + i}`] = {
          // id: 5 + i,
          title: x,
          className: "gitem",
          actions: actions,
          data: {
            color: colors,
            config: {
              embedding: x,
              annotation: "clusters",
              highlight: null,
              gene: null,
            },
          },
          content: (
            <UDimPlot
              tsneData={props?.tsneData}
              umapData={props?.umapData}
              selectedPoints={props?.selectedPoints}
              setSelectedPoints={props?.setSelectedPoints}
              highlightPoints={props?.highlightPoints}
              data={{
                color: colors,
                config: {
                  embedding: x,
                  annotation: "clusters",
                  highlight: null,
                  gene: null,
                },
              }}
            />
          ),
        };
      });
    }

    if (props?.savedPlot) {
      let actions = ["select", "download", "trash"];
      if (props?.selectedPoints && props?.selectedPoints.length > 0) {
        actions = ["highlight", "select", "download", "trash"];
      }
      props?.savedPlot.map((x, i) => {
        tmpItems.push(`${100 + i}`);
        tmpItemContent[`${100 + i}`] = {
          // id: 5 + i,
          title: get_image_title(x),
          className: "gitem",
          actions: actions,
          data: x,
          content: (
            <UDimPlot
              tsneData={props?.tsneData}
              umapData={props?.umapData}
              selectedPoints={props?.selectedPoints}
              setSelectedPoints={props?.setSelectedPoints}
              highlightPoints={props?.highlightPoints}
              data={x}
            />
          ),
        };
      });
    }

    setItems(tmpItems.reverse());
    setItemContent(tmpItemContent);
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      // active.className.replace("high", "");
      setItems((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  // function handleDragStart(event) {
  //   const { active, over } = event;

  //   if (active.id !== over.id) {
  //     active.className += " high"
  //   }
  // }
  // onDragStart={handleDragStart}

  return (
    <DndContext modifiers={[restrictToWindowEdges]} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((x) => (
          <SortableItem 
            setSelectedPoints={props?.setSelectedPoints} 
            setRestoreState={props?.setRestoreState}
            savedPlot={props?.savedPlot}
            setSavedPlot={props?.setSavedPlot}
            key={x} id={x} {...itemContent[x]} />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export default React.memo(Gallery);
