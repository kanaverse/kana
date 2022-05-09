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
// import { ReactSortable } from "react-sortablejs";
import { DndContext, closestCenter } from "@dnd-kit/core";
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

    if (data?.config?.highlight) {
      String(data?.config?.highlight).startsWith("cs")
        ? (text += `⊃ Custom Selection ${data?.config?.highlight} `)
        : (text += `⊃ Cluster ${parseInt(data?.config?.highlight) + 1} `);
    }

    return text;
  }

  // TODO: Template for each item in the Gallery
  // <div className="gallery-cont">
  // <div className={props?.showQCLoader ? "gitem effect-opacitygrayscale" : "gitem"}>
  //   <div className="gitem-header">
  //     <div className="gitem-header-title">An example panel</div>
  //     <div className="gitem-header-actions">
  //       <Button icon="download" small={true} />
  //       <Button icon="trash" small={true} />
  //       <Button icon="select" small={true} />
  //     </div>
  //   </div>
  //   <Divider />
  //   <div className="gitem-content"></div>
  // </div>

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
          id: 1,
          content: (
            <div
              key={`qc-${x}`}
              className={
                props?.showQCLoader ? "gitem effect-opacitygrayscale" : "gitem"
              }
            >
              <div className="gitem-header">
                <div className="gitem-header-title">QC for {x}</div>
                <div className="gitem-header-actions">
                  <Button icon="download" small={true} />
                </div>
              </div>
              <Divider />
              <div className="gitem-content">
                {/* <Card key={x} className={props?.showQCLoader ? "gallery-elem effect-opacitygrayscale" : "gallery-elem"} elevation={Elevation.ONE}> */}
                <QCPlotMgr title={x} data={tqc} />
                {/* </Card> */}
              </div>
            </div>
          ),
        };
      });
    }

    if (props?.pcaVarExp) {
      tmpItems.push("2");

      tmpItemContent["2"] = {
        id: 2,
        content: (
          <div
            key={`pca`}
            className={
              props?.showPCALoader ? "gitem effect-opacitygrayscale" : "gitem"
            }
          >
            <div className="gitem-header">
              <div className="gitem-header-title">
                PCA: % variance explained
              </div>
              <div className="gitem-header-actions">
                <Button icon="download" small={true} />
              </div>
            </div>
            <Divider />
            <div className="gitem-content">
              {/* <Card className={props?.showPCALoader ? "gallery-elem effect-opacitygrayscale" : "gallery-elem"} elevation={Elevation.ONE}> */}
              <PCABarPlot
                title={datasetName.split(" ").join("_")}
                pca={props?.pcaVarExp}
              />
              {/* </Card> */}
            </div>
          </div>
        ),
      };
    }

    if (props?.clusterData && props?.clusterColors) {
      tmpItems.push("3");

      tmpItemContent["3"] = {
        id: 3,
        content: (
          <div
            key={`clus`}
            className={
              props?.showNClusLoader ? "gitem effect-opacitygrayscale" : "gitem"
            }
          >
            <div className="gitem-header">
              <div className="gitem-header-title">
                Cluster: Num. of cells per cluster
              </div>
              <div className="gitem-header-actions">
                <Button icon="download" small={true} />
              </div>
            </div>
            <Divider />
            <div className="gitem-content">
              {/* <Card className={props?.showNClusLoader ? "gallery-elem effect-opacitygrayscale" : "gallery-elem"} elevation={Elevation.ONE}> */}
              <ClusterBarPlot
                data={props?.clusterData}
                clusterColors={props?.clusterColors}
              />
              {/* </Card> */}
            </div>
          </div>
        ),
      };
    }

    if (
      props?.cellLabelData &&
      Object.keys(props?.cellLabelData?.per_reference).length > 0
    ) {
      tmpItems.push("4");

      tmpItemContent["4"] = {
        id: 4,
        content: (
          <div
            key={`celllabel`}
            className={
              props?.showCellLabelLoader
                ? "gitem effect-opacitygrayscale"
                : "gitem"
            }
          >
            <div className="gitem-header">
              <div className="gitem-header-title">
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
                        Perform cell type annotation for human and mouse
                        datasets. This uses the{" "}
                        <a
                          target="_blank"
                          href="https://bioconductor.org/packages/release/bioc/html/SingleR.html"
                        >
                          SingleR
                        </a>{" "}
                        algorithm to label clusters based on their similarity to
                        reference expression profiles of curated cell types.
                        Similarity is quantified using Spearman correlations on
                        the top marker genes for each reference type, with
                        additional fine-tuning iterations to improve resolution
                        between closely related labels.
                      </p>
                      <p>
                        <strong>Best match</strong>: Classification of the
                        clusters is performed separately for each chosen
                        reference reference. If multiple references are
                        selected, an additional round of scoring is performed to
                        determine which reference has the best label for each
                        cluster.
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
              </div>
              <div className="gitem-header-actions">
                <Button icon="download" small={true} />
              </div>
            </div>
            <Divider />
            <div className="gitem-content">
              {/* <Card className={props?.showCellLabelLoader ? "gallery-elem effect-opacitygrayscale" : "gallery-elem"} elevation={Elevation.ONE}> */}
              <CellLabelTable data={props?.cellLabelData} />
              {/* </Card> */}
            </div>
          </div>
        ),
      };
    }

    if (props?.savedPlot) {
      props?.savedPlot.map((x, i) => {
        tmpItems.push(`${5 + i}`);
        tmpItemContent[`${5 + i}`] = {
          id: 5 + i,
          content: (
            <div key={"img-" + i} className={"gitem"}>
              <div className="gitem-header">
                <div className="gitem-header-title">{get_image_title(x)}</div>
                <div className="gitem-header-actions">
                  <Button icon="select" small={true} />
                  <Button icon="download" small={true} />
                  <Button icon="trash" small={true} />
                </div>
              </div>
              <Divider />
              <div className="gitem-content">
                {/* <Card key={i} className="gallery-elem" elevation={Elevation.ONE}> */}
                <ImgPlot data={x} gene={props?.gene} />
                {/* </Card> */}
              </div>
            </div>
          ),
        };
      });
    }
    setItems(tmpItems);
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
            key={x}
            id={x}
            content={itemContent[x]?.content}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};

export default React.memo(Gallery);
