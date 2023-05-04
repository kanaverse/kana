import React, { useEffect, useContext, useState } from "react";
import {
  Button,
  HTMLSelect,
  Classes,
  Card,
  Elevation,
  Label,
  Divider,
  ButtonGroup,
} from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { TableVirtuoso } from "react-virtuoso";

import { AppContext } from "../../context/AppContext";

import {
  code,
  getMinMax,
  defaultColor,
  default_cluster,
  default_selection,
  getComputedCols,
  getSuppliedCols,
  showComputedSection,
} from "../../utils/utils";
// import Histogram from '../Plots/Histogram';
import "./cellanno.css";

const CellAnnotation = (props) => {
  const { annotationObj, annotationCols } = useContext(AppContext);

  // what clusters are available
  const [clusSel, setClusSel] = useState(null);

  // records to show in the table
  const [prosRecords, setProsRecords] = useState(null);

  // update clusters when custom selection is made in the UI
  useEffect(() => {
    if (default_cluster === props?.selectedCellAnnAnnotation) {
      if (annotationObj[props?.selectedCellAnnAnnotation]) {
        let max_clusters = getMinMax(annotationObj[default_cluster])[1];

        let clus = [];
        for (let i = 0; i < max_clusters + 1; i++) {
          clus.push(i + 1);
        }

        setClusSel(clus);
        if (props?.selectedCellAnnCluster === null) {
          props?.setSelectedCellAnnCluster(0);
        }
      }
      // currently no custom selection allowed
      // } else if (default_selection === props?.selectedCellAnnAnnotation) {
      //   let clus = [];
      //   clus = clus.concat(Object.keys(props?.customSelection));
      //   if (props?.selectedCellAnnCluster === null) {
      //     props?.setSelectedCellAnnCluster(Object.keys(props?.customSelection)[0]);
      //   }
      //   setClusSel(clus);
    } else {
      if (!(props?.selectedCellAnnAnnotation in annotationObj)) {
        props?.setReqAnnotation(props?.selectedCellAnnAnnotation);
        props?.setSelectedCellAnnCluster(null);
      } else {
        let tmp = annotationObj[props?.selectedCellAnnAnnotation];
        if (tmp.type === "array") {
          const uniqueTmp = [...new Set(tmp.values)];
          setClusSel(uniqueTmp);
          if (props?.selectedCellAnnCluster === null) {
            props?.setSelectedCellAnnCluster(uniqueTmp[0]);
          }
        } else if (tmp.type === "factor") {
          setClusSel(tmp.levels);
          if (props?.selectedCellAnnCluster === null) {
            props?.setSelectedCellAnnCluster(tmp.levels[0]);
          }
        }
      }
    }
  }, [
    annotationObj,
    props?.selectedCellAnnAnnotation,
    props?.setSelectedCellAnnCluster,
  ]);

  useEffect(() => {
    if (
      props?.cellLabelData !== null &&
      props?.cellLabelData !== undefined &&
      props?.selectedCellAnnCluster !== null
    ) {
      const recs = [];
      for (const [k, v] of Object.entries(
        props.cellLabelData["per_reference"]
      )) {
        recs.push({
          reference: k,
          value: v[props?.selectedCellAnnCluster],
        });
      }

      recs.sort(
        (a, b) =>
          (props?.cellLabelData["integrated"][props?.selectedCellAnnCluster] ===
            b.reference) -
          (props?.cellLabelData["integrated"][props?.selectedCellAnnCluster] ===
            a.reference)
      );

      setProsRecords(recs);
    }
  }, [props?.cellLabelData, props?.selectedCellAnnCluster]);

  const getTableHeight = () => {
    let defheight = 340;

    if (props?.windowWidth < 1200) {
      defheight += 270;
    }

    return `35px calc(100vh - ${defheight}px)`;
  };

  return (
    <div className="cellanno-container">
      <div className="cellanno-container-header">
        <div>
          <ButtonGroup
            fill={false}
            large={false}
            minimal={false}
            vertical={false}
          >
            <Button
              onClick={() => props?.setMarkersOrFsets("markers")}
              intent={props?.markersORFSets === "markers" ? "primary" : ""}
              text="Markers"
            />

            {props?.selectedFsetModality !== null && (
              <Button
                disabled={props?.selectedClusterSummary.length === 0}
                onClick={() => props?.setMarkersOrFsets("featuresets")}
                intent={
                  props?.markersORFSets === "featuresets" ? "primary" : ""
                }
                text="Gene sets"
              />
            )}

            {props?.cellLabelData !== null && (
              <Button
                disabled={
                  props?.cellLabelData === null ||
                  props?.cellLabelData === undefined
                }
                onClick={() => props?.setMarkersOrFsets("celltypeannotation")}
                intent={
                  props?.markersORFSets === "celltypeannotation"
                    ? "primary"
                    : ""
                }
                text="Cell types"
              />
            )}
          </ButtonGroup>
        </div>
        <div>
          <Popover2
            popoverClassName={Classes.POPOVER_CONTENT_SIZING}
            hasBackdrop={false}
            interactionKind="hover"
            placement="left"
            hoverOpenDelay={500}
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
                  This panel shows the celltype annotation for human and mouse
                  datasets using the{" "}
                  <a
                    target="_blank"
                    href="https://bioconductor.org/packages/release/bioc/html/SingleR.html"
                  >
                    SingleR
                  </a>{" "}
                  algorithm algorithm to label clusters based on their
                  similarity to reference expression profiles of curated cell
                  types. If multiple references are selected, an additional
                  round of scoring is performed to determine which reference has
                  the{" "}
                  <span
                    style={{
                      fontStyle: "italic",
                      color: "#2B95D6",
                      fontWeight: "bold",
                    }}
                  >
                    best label
                  </span>{" "}
                  for each cluster.
                </p>
              </Card>
            }
          >
            <Button minimal={true} icon="info-sign" small={true} />
          </Popover2>
        </div>
      </div>
      <Divider />
      {annotationCols && (
        <Label style={{ marginBottom: "0" }}>
          Choose annotation
          <HTMLSelect
            defaultValue={props?.selectedCellAnnAnnotation}
            onChange={(nval) => {
              props?.selectedCellAnnAnnotation(nval?.currentTarget?.value);
            }}
          >
            {getSuppliedCols(annotationCols).length > 0 && (
              <optgroup label="Supplied">
                {getSuppliedCols(annotationCols).map((x) => (
                  <option value={x} key={x}>
                    {x}
                  </option>
                ))}
              </optgroup>
            )}
            {showComputedSection(annotationCols) && (
              <optgroup label="Computed">
                {getComputedCols(annotationCols).map((x) => (
                  <option value={x} key={x}>
                    {x.replace(`${code}::`, "")}
                  </option>
                ))}
              </optgroup>
            )}
          </HTMLSelect>
        </Label>
      )}
      <div
        className="cellanno-cluster-header"
        style={{
          marginTop: "5px",
        }}
      >
        <Label
          style={{
            marginBottom: "0",
          }}
        >
          Select Cluster
        </Label>
      </div>
      {clusSel && (
        <div className="cellanno-cluster-selection">
          <HTMLSelect
            className="cellanno-cluster-selection-width"
            onChange={(x) => {
              let tmpselection = x.currentTarget?.value;
              tmpselection = parseInt(tmpselection.replace("Cluster ", "")) - 1;
              props?.setSelectedCellAnnCluster(tmpselection);
            }}
          >
            {clusSel.map((x, i) => (
              <option
                selected={
                  String(props?.selectedCellAnnCluster).startsWith("cs")
                    ? x === props?.selectedCellAnnCluster
                    : parseInt(x) - 1 ===
                      parseInt(props?.selectedCellAnnCluster)
                }
                key={i}
              >
                {String(x).startsWith("cs") ? "Custom Selection" : "Cluster"}{" "}
                {x}
              </option>
            ))}
          </HTMLSelect>
        </div>
      )}
      <Divider />
      {prosRecords !== null && (
        <div
          className="cellanno-table"
          style={{
            gridTemplateRows: getTableHeight(),
          }}
        >
          <div className="cellanno-header"></div>
          <TableVirtuoso
            className="cellanno-list"
            data={prosRecords}
            components={{
              Table: ({ style, ...props }) => (
                <table
                  {...props}
                  style={{ ...style, width: "100%", borderSpacing: 5 }}
                />
              ),
            }}
            fixedHeaderContent={() => {
              return (
                <tr>
                  <th style={{ width: "45%" }}>
                    Reference{" "}
                    <span
                      style={{
                        fontStyle: "italic",
                        color: "#2B95D6",
                        fontWeight: "bold",
                        fontSize: "xx-small",
                      }}
                    >
                      {" "}
                      (best match)
                    </span>
                  </th>
                  <th>Cell type</th>
                </tr>
              );
            }}
            itemContent={(index, row) => (
              <>
                <td
                  className={
                    props?.cellLabelData["integrated"][
                      props?.selectedCellAnnCluster
                    ] === row.reference
                      ? "td-highlight"
                      : ""
                  }
                >
                  {row.reference}
                </td>
                <td>{row.value}</td>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(CellAnnotation);
