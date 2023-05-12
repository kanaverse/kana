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
  Collapse,
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
  const [clusIdx, setClusIdx] = useState(null);

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
          setClusIdx(0);
        }
      }
    } else if (default_selection === props?.selectedCellAnnAnnotation) {
      let clus = [];
      clus = clus.concat(Object.keys(props?.customSelection));
      if (props?.selectedCellAnnCluster === null) {
        props?.setSelectedCellAnnCluster(
          Object.keys(props?.customSelection)[0]
        );
        setClusIdx(0);
      }
      setClusSel(clus);
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
        setClusIdx(0);
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
      props?.selectedCellAnnCluster !== null &&
      clusIdx !== -1
    ) {
      let recs = null;

      if ("integrated" in props?.cellLabelData) {
        recs = [];
        for (const [k, v] of Object.entries(
          props.cellLabelData["per_reference"]
        )) {
          recs.push({
            reference: k,
            value: v[clusIdx],
            expanded: false,
          });
        }

        // sort by best
        recs.sort(
          (a, b) =>
            (props?.cellLabelData["integrated"][clusIdx]["best"] ===
              b.reference) -
            (props?.cellLabelData["integrated"][clusIdx]["best"] ===
              a.reference)
        );
      }
      setProsRecords(recs);
    }
  }, [props?.cellLabelData, props?.selectedCellAnnCluster, clusIdx]);

  const getTableHeight = () => {
    let defheight = 270;

    if (props?.windowWidth < 1200) {
      defheight += 270;
    }

    return `35px calc(100vh - ${defheight}px)`;
  };

  const getRowWidths = () => {
    // let def  = "25% 14% 17% 25% 17%";
    let action = 52;
    let rem_width = props?.cellAnnWidth - action;
    let widths = [];
    //reference name
    widths.push(Math.ceil(rem_width * 0.43));
    // best match
    widths.push(Math.ceil(rem_width * 0.33));
    // score
    widths.push(Math.ceil(rem_width * 0.17));

    return [widths.join("px "), `${action}px`].join("px ");
  };

  const render_all_celltypes = (allCellTypes, best) => {
    let recs = [];
    for (const [k, v] of Object.entries(allCellTypes)) {
      recs.push({
        name: k,
        score: v,
      });
    }

    recs.sort((a, b) => b.score - a.score);
    return (
      <>
        <Divider />
        <TableVirtuoso
          style={{
            height: 400,
            width: 350,
            margin: "0 10px",
            wordWrap: "break-word",
          }}
          data={recs}
          fixedHeaderContent={() => (
            <tr style={{ wordWrap: "break-word" }}>
              <th style={{ width: "200px", background: "white" }}>
                <span>
                  celltypes{" "}
                  <span
                    style={{
                      fontStyle: "italic",
                      color: "#2B95D6",
                      fontWeight: "bold",
                      fontSize: "xx-small",
                    }}
                  >
                    (best match)
                  </span>
                </span>
              </th>
              <th style={{ width: "100px", background: "white" }}>
                celltype score
              </th>
            </tr>
          )}
          itemContent={(index, ct) => (
            <>
              <td
                style={{ width: 100, wordBreak: "break-all" }}
                className={best === ct.name ? "td-highlight" : ""}
              >
                {ct.name}
              </td>
              <td style={{ textAlign: "center" }}>{formatFloat(ct.score)}</td>
            </>
          )}
        />
      </>
    );
  };

  const render_references = () => {
    if (clusIdx === -1) {
      return;
    }

    return (
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
            TableRow: (props) => {
              return (
                <tr
                  {...props}
                  style={{
                    background: "white",
                    borderBottom: "1px solid black",
                  }}
                />
              );
            },
          }}
          fixedHeaderContent={() => {
            return (
              <div
                className="cellann-row-container cellann-row-header"
                style={{
                  gridTemplateColumns: getRowWidths(),
                  background: "white",
                }}
              >
                <span style={{ fontWeight: "bold" }}>
                  Reference{" "}
                  <span
                    style={{
                      fontStyle: "italic",
                      color: "#2B95D6",
                      fontWeight: "bold",
                      fontSize: "xx-small",
                    }}
                  >
                    (best match)
                  </span>
                </span>
                <span style={{ fontWeight: "bold" }}>cell type</span>
                <span style={{ fontWeight: "bold" }}>reference score</span>
              </div>
            );
          }}
          itemContent={(index, row) => (
            <div
              style={{
                paddingLeft: "2px",
                wordWrap: "break-word",
                borderBottom: "1px solid gainsboro",
              }}
            >
              <div
                className="row-container"
                style={{
                  gridTemplateColumns: getRowWidths(),
                }}
              >
                <span
                  className={
                    props?.cellLabelData["integrated"][clusIdx]["best"] ===
                    row.reference
                      ? "td-highlight"
                      : ""
                  }
                >
                  {row.reference}
                </span>
                <span style={{ textAlign: "center" }}>{row.value.best}</span>
                <span style={{ textAlign: "center" }}>
                  {formatFloat(
                    props?.cellLabelData["integrated"][clusIdx]["all"][
                      row.reference
                    ]
                  )}
                </span>
                <div className="row-action">
                  <Button
                    icon={row.expanded ? "minus" : "plus"}
                    small={true}
                    fill={false}
                    className="cellanno-row-action"
                    outlined={row.expanded ? false : true}
                    intent={row.expanded ? "primary" : null}
                    onClick={() => {
                      let tmprecs = [...prosRecords];
                      tmprecs[index].expanded = !tmprecs[index].expanded;
                      setProsRecords(tmprecs);
                    }}
                  ></Button>
                </div>
              </div>
              <Collapse isOpen={row.expanded}>
                {render_all_celltypes(row.value.all, row.value.best)}
              </Collapse>
            </div>
          )}
        />
      </div>
    );
  };

  const formatFloat = (val) => {
    return parseFloat(val).toFixed(2);
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
              props?.setSelectedCellAnnAnnotation(nval?.currentTarget?.value);
              setClusIdx(0);
              setClusSel(null);
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
            {showComputedSection(annotationCols, props?.customSelection) && (
              <optgroup label="Computed">
                {getComputedCols(annotationCols).map((x) => (
                  <option value={x} key={x}>
                    {x.replace(`${code}::`, "")}
                  </option>
                ))}
                {Object.keys(props?.customSelection).length > 0 && (
                  <option value={default_selection} key={default_selection}>
                    CUSTOM SELECTIONS
                  </option>
                )}
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
              if (default_cluster === props?.selectedCellAnnAnnotation) {
                tmpselection =
                  parseInt(tmpselection.replace("Cluster ", "")) - 1;
                props?.setSelectedCellAnnCluster(tmpselection);
                setClusIdx(tmpselection);
              } else if (
                default_selection === props?.selectedCellAnnAnnotation
              ) {
                tmpselection = tmpselection.replace("Custom Selection ", "");
                props?.setSelectedCellAnnCluster(tmpselection);
                setClusIdx(1);
              } else {
                props?.setSelectedCellAnnCluster(tmpselection);
                setClusIdx(clusSel.map((x) => String(x)).indexOf(tmpselection));
              }
            }}
          >
            {default_cluster === props?.selectedCellAnnAnnotation ||
            default_selection === props?.selectedCellAnnAnnotation
              ? clusSel.map((x, i) => (
                  <option
                    selected={
                      String(props?.selectedCellAnnCluster).startsWith("cs")
                        ? x === props?.selectedCellAnnCluster
                        : parseInt(x) - 1 ===
                          parseInt(props?.selectedCellAnnCluster)
                    }
                    key={i}
                    value={
                      String(x).startsWith("cs")
                        ? `Custom Selection ${x}`
                        : `Cluster ${x}`
                    }
                  >
                    {String(x).startsWith("cs") ? "Selection" : "Cluster"} {x}
                  </option>
                ))
              : clusSel.map((x, i) => (
                  <option
                    selected={x === props?.selectedCellAnnCluster}
                    key={i}
                    value={x}
                  >
                    {x}
                  </option>
                ))}
          </HTMLSelect>
        </div>
      )}
      <Divider />
      {prosRecords !== null && render_references()}
    </div>
  );
};

export default React.memo(CellAnnotation);
