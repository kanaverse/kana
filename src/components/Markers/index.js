import React, { useEffect, useContext, useState, useMemo } from "react";
import {
  Button,
  Icon,
  Collapse,
  InputGroup,
  Switch,
  RangeSlider,
  Tag,
  HTMLSelect,
  Classes,
  Card,
  Elevation,
  Label,
  Divider,
  ButtonGroup,
} from "@blueprintjs/core";
import { Popover2, Tooltip2 } from "@blueprintjs/popover2";
import { TableVirtuoso } from "react-virtuoso";
import * as d3 from "d3";
import { CSVLink } from "react-csv";

import { AppContext } from "../../context/AppContext";
import StackedHistogram from "../Plots/StackedHistogram";

import Cell from "../Plots/Cell.js";
import HeatmapCell from "../Plots/HeatmapCell";

import { code, getMinMax, defaultColor } from "../../utils/utils";
// import Histogram from '../Plots/Histogram';
import "./markers.css";

const MarkerPlot = (props) => {
  const {
    genesInfo,
    geneColSel,
    setGeneColSel,
    annotationObj,
    annotationCols,
    datasetName,
  } = useContext(AppContext);

  const default_cluster = `${code}::CLUSTERS`;
  const default_selection = `${code}::SELECTION`;

  const [showSettings, setShowSettings] = useState(false);
  const [showLogFC, setShowLogFC] = useState(true);
  const [showDelta, setShowDelta] = useState(true);
  const [showExpr, setShowExpt] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  const [showFilters, setShowFilters] = useState(false);

  // what cluster is selected
  const [clusSel, setClusSel] = useState(null);
  // binary vector for stacked histogram plots, this cluster (1) vs others (0)
  const [clusArrayStacked, setClusArrayStacked] = useState(null);
  // gene search
  const [searchInput, setSearchInput] = useState(null);

  // ranges for various marker stats
  const [meanMinMax, setMeanMinMax] = useState(null);
  const [deltaMinMax, setDeltaMinMax] = useState(null);
  const [lfcMinMax, setLfcMinMax] = useState(null);
  const [detectedMinMax, setDetectedMinMax] = useState(null);
  const [minMaxs, setMinMaxs] = useState(null);

  // stores range filters from UI
  const [markerFilter, setMarkerFilter] = useState({});
  // records to show after filtering
  const [prosRecords, setProsRecords] = useState(null);

  // toggle for vs mode
  const [vsmode, setVsmode] = useState(false);

  // scale to use for detected on expression bar
  const detectedScale = d3.interpolateRdYlBu; //d3.interpolateRdBu;
  // d3.scaleSequential()
  // .domain([0, 1])
  // .range(["red", "blue"])
  // .interpolate(d3.interpolateHcl);

  // if a cluster changes, its summary data is requested from the worker
  // pre-process results for UI
  useEffect(() => {
    if (props?.selectedClusterSummary) {
      let trecs = props?.selectedClusterSummary;

      if (trecs.length !== 0) {
        let tmpmeans = trecs.map((x) => (isNaN(x?.mean) ? 0 : x?.mean));
        let tmeanMinMax = d3.extent(tmpmeans);
        let tmeanval = tmeanMinMax[1] === 0 ? 0.01 : tmeanMinMax[1];
        setMeanMinMax([
          parseFloat(tmeanMinMax[0].toFixed(2)),
          parseFloat(tmeanval.toFixed(2)),
        ]);

        let tmpdeltas = trecs.map((x) => (isNaN(x?.delta) ? 0 : x?.delta));
        let tdeltaMinMax = d3.extent(tmpdeltas);
        let tdeltaval = tdeltaMinMax[1] === 0 ? 0.01 : tdeltaMinMax[1];
        setDeltaMinMax([
          parseFloat(tdeltaMinMax[0].toFixed(2)),
          parseFloat(tdeltaval.toFixed(2)),
        ]);

        let tmplfcs = trecs.map((x) => (isNaN(x?.lfc) ? 0 : x?.lfc));
        let tlfcsMinMax = d3.extent(tmplfcs);
        let tlfcsval = tlfcsMinMax[1] === 0 ? 0.01 : tlfcsMinMax[1];
        setLfcMinMax([
          parseFloat(tlfcsMinMax[0].toFixed(2)),
          parseFloat(tlfcsval.toFixed(2)),
        ]);

        let tmpdetects = trecs.map((x) =>
          isNaN(x?.detected) ? 0 : x?.detected
        );
        let tdetectsMinMax = d3.extent(tmpdetects);
        let tdetecval = tdetectsMinMax[1] === 0 ? 0.01 : tdetectsMinMax[1];
        setDetectedMinMax([
          parseFloat(tdetectsMinMax[0].toFixed(2)),
          parseFloat(tdetecval.toFixed(2)),
        ]);

        setMinMaxs({
          lfc: [
            parseFloat(tlfcsMinMax[0].toFixed(2)),
            parseFloat(tlfcsval.toFixed(2)),
          ],
          mean: [
            parseFloat(tmeanMinMax[0].toFixed(2)),
            parseFloat(tmeanval.toFixed(2)),
          ],
          detected: [
            parseFloat(tdetectsMinMax[0].toFixed(2)),
            parseFloat(tdetecval.toFixed(2)),
          ],
          delta: [
            parseFloat(tdeltaMinMax[0].toFixed(2)),
            parseFloat(tdeltaval.toFixed(2)),
          ],
        });

        let sortedRows = [...trecs];

        setMarkerFilter({
          lfc: markerFilter?.lfc
            ? markerFilter?.lfc
            : [0, parseFloat(tlfcsval.toFixed(2))],
          delta: markerFilter?.delta
            ? markerFilter?.delta
            : [0, parseFloat(tdeltaval.toFixed(2))],
          mean: markerFilter?.mean
            ? markerFilter?.mean
            : [
                parseFloat(tmeanMinMax[0].toFixed(2)),
                parseFloat(tmeanval.toFixed(2)),
              ],
          detected: markerFilter?.detected
            ? markerFilter?.detected
            : [
                parseFloat(tdetectsMinMax[0].toFixed(2)),
                parseFloat(tdetecval.toFixed(2)),
              ],
        });

        setProsRecords(sortedRows);
      }
    }
  }, [props?.selectedClusterSummary]);

  // genes to show, hook for filters and input
  const sortedRows = useMemo(() => {
    if (!prosRecords) return [];

    let sortedRows = prosRecords;
    if (markerFilter) {
      for (let key in markerFilter) {
        let range = markerFilter[key];
        if (!range) continue;
        if (range[0] === minMaxs[key][0] && range[1] === minMaxs[key][1])
          continue;
        sortedRows = sortedRows.filter(
          (x) => x[key] >= range[0] && x[key] <= range[1]
        );
      }
    }

    if (!searchInput || searchInput === "") return sortedRows;

    sortedRows = sortedRows.filter(
      (x) =>
        genesInfo[geneColSel[props?.selectedModality]][x.gene]
          .toLowerCase()
          .indexOf(searchInput.toLowerCase()) !== -1
    );
    return sortedRows;
  }, [prosRecords, searchInput, markerFilter]);

  // update clusters when custom selection is made in the UI
  useEffect(() => {
    if (default_cluster === props?.selectedMarkerAnnotation) {
      if (annotationObj[props?.selectedMarkerAnnotation]) {
        let max_clusters = getMinMax(
          annotationObj[props?.selectedMarkerAnnotation]
        )[1];

        let clus = [];
        for (let i = 0; i < max_clusters + 1; i++) {
          clus.push(i + 1);
        }

        // clus = clus.concat(Object.keys(props?.customSelection));

        setClusSel(clus);
        if (props?.selectedCluster === null) {
          props?.setSelectedCluster(0);

          if (String(props?.selectedVSCluster).startsWith("cs")) {
            props?.setSelectedVSCluster(null);
          }
        }
      }

      if (
        !String(props?.selectedCluster).startsWith("cs") &&
        String(props?.selectedVSCluster).startsWith("cs")
      ) {
        props?.setSelectedVSCluster(null);
      }

      return;
    } else if (default_selection === props?.selectedMarkerAnnotation) {
      let clus = [];
      clus = clus.concat(Object.keys(props?.customSelection));
      if (props?.selectedCluster === null) {
        props?.setSelectedCluster(Object.keys(props?.customSelection)[0]);

        if (String(props?.selectedVSCluster).startsWith("cs")) {
          props?.setSelectedVSCluster(null);
        }
      }
      setClusSel(clus);
    } else {
      if (!(props?.selectedMarkerAnnotation in annotationObj)) {
        props?.setReqAnnotation(props?.selectedMarkerAnnotation);
        props?.setSelectedCluster(null);
      } else {
        let tmp = annotationObj[props?.selectedMarkerAnnotation];
        if (tmp.type === "array") {
          const uniqueTmp = [...new Set(tmp.values)];
          setClusSel(uniqueTmp);
          if (props?.selectedCluster === null) {
            props?.setSelectedCluster(uniqueTmp[0]);
          }
        } else if (tmp.type === "factor") {
          setClusSel(tmp.levels);
          if (props?.selectedCluster === null) {
            props?.setSelectedCluster(tmp.levels[0]);
          }
        }
      }
    }
  }, [
    props?.customSelection,
    props?.selectedMarkerAnnotation,
    annotationObj,
    props?.selectedCluster,
  ]);

  // hook for figure out this vs other cells for stacked histograms
  useEffect(() => {
    var clusArray = [];
    if (default_selection === props?.selectedMarkerAnnotation) {
      annotationObj[props?.selectedMarkerAnnotation]?.forEach((x, i) =>
        props?.customSelection[props?.selectedCluster].includes(i)
          ? clusArray.push(1)
          : clusArray.push(0)
      );
    } else if (default_cluster === props?.selectedMarkerAnnotation) {
      annotationObj[props?.selectedMarkerAnnotation]?.forEach((x, i) =>
        x === props?.selectedCluster ? clusArray.push(1) : clusArray.push(0)
      );
    } else {
      if (!(props?.selectedMarkerAnnotation in annotationObj)) {
        props?.setReqAnnotation(props?.selectedMarkerAnnotation);
      } else {
        let vec = annotationObj[props?.selectedMarkerAnnotation];

        if (vec.type === "array") {
          annotationObj[props?.selectedMarkerAnnotation].values.map((x) =>
            x === props?.selectedCluster ? clusArray.push(1) : clusArray.push(0)
          );
        } else {
          let cindex = vec.levels.indexOf(props?.selectedCluster);
          vec.index.map((x) =>
            x === cindex ? clusArray.push(1) : clusArray.push(0)
          );
        }
      }
    }
    setClusArrayStacked(clusArray);
  }, [props?.selectedCluster, annotationObj]);

  useEffect(() => {
    setShowLogFC(isExpanded);
    setShowDelta(isExpanded);
    setShowExpt(isExpanded);
  }, [isExpanded]);

  const handleMarkerFilter = (val, key) => {
    let tmp = { ...markerFilter };
    tmp[key] = val;
    setMarkerFilter(tmp);
  };

  const createColorScale = (lower, upper) => {
    if (lower > 0) {
      return `linear-gradient(to right, yellow 0%, red 100%)`;
    } else if (upper < 0) {
      return `linear-gradient(to right, blue 0%, yellow 100%)`;
    } else {
      var limit = 0;
      if (lower < 0) {
        limit = -lower;
      }
      if (upper > 0 && upper > limit) {
        limit = upper;
      }
      var scaler = d3
        .scaleSequential(d3.interpolateRdYlBu)
        .domain([limit, -limit]);

      var leftcol = scaler(lower);
      var rightcol = scaler(upper);
      var midprop = Math.round((-lower / (upper - lower)) * 100);
      return `linear-gradient(to right, ${leftcol} 0%, yellow ${midprop}%, ${rightcol} 100%)`;
    }
  };

  useEffect(() => {
    let width = 350;

    if (!showLogFC) width -= 45;
    if (!showDelta) width -= 55;
    if (!showExpr) width -= 75;

    if (!showLogFC && !showDelta && !showExpr) width += 50;

    props?.setMarkersWidth(width);
  }, [showLogFC, showDelta, showExpr]);

  const getRowWidths = () => {
    // let def  = "25% 14% 17% 25% 17%";
    let action = 52;
    let rem_width = props?.markersWidth - action - 35;
    let widths = [];
    if (showLogFC) widths.push(Math.ceil(rem_width * 0.13));
    if (showDelta) widths.push(Math.ceil(rem_width * 0.17));
    if (showExpr) widths.push(Math.ceil(rem_width * 0.23));

    let current_total = widths.reduce((a, b) => a + b, 0);
    let geneWidth = rem_width - current_total;

    if (widths.length > 0)
      return [geneWidth, widths.join("px "), `${action}px`].join("px ");

    return [geneWidth, `${action}px`].join("px ");
  };

  const getTableHeight = () => {
    let defheight = 340;
    if (showFilters) defheight = 570;

    if (props?.windowWidth < 1200) {
      defheight += 270;
    }

    return `35px calc(100vh - ${defheight}px)`;
  };

  const render_download_link = () => {
    let dRows = [];

    sortedRows.forEach((x) => {
      let tmp = {
        mean: x.mean,
        delta_detected: x.delta,
        lfc: x.lfc,
        detected: x.detected,
      };

      for (const [k, v] of Object.entries(genesInfo)) {
        tmp[k] = v[x.gene];
      }

      dRows.push(tmp);
    });

    let fname = `${datasetName}_${props?.selectedModality}_${props?.selectedMarkerAnnotation}_${props?.selectedCluster}`;

    if (props?.selectedVSCluster) {
      fname += `${fname}_vs_${props?.selectedVSCluster}`;
    }

    return (
      <div>
        <CSVLink data={dRows} target="_blank" filename={`${fname}_markers.csv`}>
          <div>
            <Button minimal={true} icon="download" small={true} />
          </div>
        </CSVLink>
      </div>
    );
  };

  return (
    <div className="marker-container">
      <div className="marker-container-header">
        <div>
          <ButtonGroup
            // style={{ minWidth: 75, minHeight: 150 }}
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
                  This panel shows the marker genes that are upregulated in the
                  cluster of interest compared to some or all of the other
                  clusters. Hopefully, this allows us to assign some kind of
                  biological meaning to each cluster based on the functions of
                  the top markers. Several ranking schemes are available
                  depending on how we choose to quantify the strength of the
                  upregulation.
                </p>
              </Card>
            }
          >
            <Button minimal={true} icon="info-sign" small={true} />
          </Popover2>

          {/* <Tooltip2 content={isExpanded ? "Maximize" : "Minimize"}>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              minimal={true}
              icon={isExpanded ? "one-column" : "two-columns"}
              small={true}
              intent={isExpanded ? "none" : "none"}
            />
          </Tooltip2> */}

          <Tooltip2 content="Download markers as CSV">
            {render_download_link()}
          </Tooltip2>

          <Tooltip2 content={showSettings ? "Hide Settings" : "Show Settings"}>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              minimal={true}
              icon={"cog"}
              small={true}
              intent={showSettings ? "primary" : "none"}
            />
          </Tooltip2>
        </div>
      </div>
      <Collapse isOpen={showSettings}>
        <Divider />
        <Switch
          checked={showLogFC}
          label="Show Log-FC?"
          onChange={() => setShowLogFC(!showLogFC)}
        />
        <Switch
          checked={showDelta}
          label="Show Δ-detected?"
          onChange={() => setShowDelta(!showDelta)}
        />
        <Switch
          checked={showExpr}
          label="Show Expression?"
          onChange={() => setShowExpt(!showExpr)}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          Rank markers
          <Popover2
            popoverClassName={Classes.POPOVER_CONTENT_SIZING}
            hasBackdrop={false}
            interactionKind="hover"
            placement="left"
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
                  Choose the effect size and summary statistic to use for
                  ranking markers. For each gene, effect sizes are computed by
                  pairwise comparisons between clusters:
                </p>
                <ul>
                  <li>
                    <strong>
                      <em>Cohen's d</em>
                    </strong>{" "}
                    is the ratio of the log-fold change to the average standard
                    deviation between two clusters.
                  </li>
                  <li>
                    The area under the curve (
                    <strong>
                      <em>AUC</em>
                    </strong>
                    ) is the probability that a randomly chosen observation from
                    one cluster is greater than a randomly chosen observation
                    from another cluster.
                  </li>
                  <li>
                    The log-fold change (
                    <strong>
                      <em>lfc</em>
                    </strong>
                    ) is the difference in the mean log-expression between two
                    clusters.
                  </li>
                  <li>
                    The{" "}
                    <strong>
                      <em>Δ-detected</em>
                    </strong>{" "}
                    is the difference in the detected proportions between two
                    clusters.
                  </li>
                </ul>
                <p>
                  For each cluster, the effect sizes from the comparisons to all
                  other clusters are summarized into a single statistic for
                  ranking purposes:
                </p>
                <ul>
                  <li>
                    <strong>
                      <em>mean</em>
                    </strong>{" "}
                    uses the mean effect sizes from all pairwise comparisons.
                    This generally provides a good compromise between
                    exclusitivity and robustness.
                  </li>
                  <li>
                    <strong>
                      <em>min</em>
                    </strong>{" "}
                    uses the minimum effect size from all pairwise comparisons.
                    This promotes markers that are exclusively expressed in the
                    chosen cluster, but will perform poorly if no such genes
                    exist.
                  </li>
                  <li>
                    <strong>
                      <em>min-rank</em>
                    </strong>{" "}
                    ranks genes according to their best rank in each of the
                    individual pairwise comparisons. This is the most robust as
                    the combination of top-ranked genes will always be able to
                    distinguish the chosen cluster from the other clusters, but
                    may not give high rankings to exclusive genes.
                  </li>
                </ul>
              </Card>
            }
          >
            <Icon
              icon="small-info-sign"
              intent="primary"
              style={{
                padding: "0 5px",
              }}
            ></Icon>
          </Popover2>
          {"     "}
          <HTMLSelect
            onChange={(x) => {
              props?.setClusterRank(x.currentTarget.value);
            }}
            defaultValue={props?.clusterRank}
          >
            <option>cohen-min</option>
            <option>cohen-mean</option>
            <option>cohen-min-rank</option>
            <option>auc-min</option>
            <option>auc-mean</option>
            <option>auc-min-rank</option>
            <option>lfc-min</option>
            <option>lfc-mean</option>
            <option>lfc-min-rank</option>
            <option>delta-d-min</option>
            <option>delta-d-mean</option>
            <option>delta-d-min-rank</option>
          </HTMLSelect>
        </div>
      </Collapse>
      <Divider />
      {props?.modality != null && (
        <Label style={{ textAlign: "left", marginBottom: "5px" }}>
          Select Modality
          <HTMLSelect
            onChange={(x) => {
              props?.setSelectedModality(x.currentTarget?.value);

              props?.setGene(null);
              props?.setSelectedVSCluster(null);
              props?.setSelectedCluster(null);
              setMarkerFilter({});
            }}
          >
            {props?.modality.map((x, i) => (
              <option key={x} value={x}>
                {x === "" ? "unnamed" : x}
              </option>
            ))}
          </HTMLSelect>
        </Label>
      )}
      <Label style={{ marginBottom: "0" }}>
        Choose annotation
        <HTMLSelect
          defaultValue={props?.selectedMarkerAnnotation}
          onChange={(nval) => {
            props?.setGene(null);
            props?.setSelectedVSCluster(null);
            props?.setSelectedCluster(null);
            props?.setSelectedMarkerAnnotation(nval?.currentTarget?.value);
          }}
        >
          <optgroup label="Supplied">
            {Object.keys(annotationCols)
              .filter(
                (x) =>
                  !annotationCols[x].name.startsWith(code) &&
                  annotationCols[x].name !== "__batch__" &&
                  annotationCols[x].type !== "continuous" &&
                  (annotationCols[x]["type"] === "both" ||
                    (annotationCols[x]["type"] === "categorical" &&
                      annotationCols[x]["truncated"] === false))
              )
              .map((x) => (
                <option value={x} key={x}>
                  {x}
                </option>
              ))}
          </optgroup>
          <optgroup label="Computed">
            {Object.keys(annotationCols)
              .filter(
                (x) =>
                  annotationCols[x].name === default_cluster ||
                  ((annotationCols[x].name.startsWith(code) ||
                    annotationCols[x].name === "__batch__") &&
                    annotationCols[x].type !== "continuous" &&
                    (annotationCols[x]["type"] === "both" ||
                      (annotationCols[x]["type"] === "categorical" &&
                        annotationCols[x]["truncated"] === false)))
              )
              .filter(
                (x) =>
                  !annotationCols[x].name
                    .replace(`${code}::`, "")
                    .startsWith("QC")
              )
              .map((x) => (
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
        </HTMLSelect>
      </Label>
      <div
        className="marker-cluster-header"
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
        <div className="marker-vsmode">
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
                  By default, the <strong>general</strong> mode will rank
                  markers for a cluster or custom selection based on the
                  comparison to all other clusters or cells.
                  <br />
                  <br />
                  Users can instead enable <strong>versus</strong> mode to
                  compare markers between two clusters or between two custom
                  selections. This is useful for identifying subtle differences
                  between closely related groups of cells.
                </p>
              </Card>
            }
          >
            <Icon
              intent="warning"
              icon="help"
              style={{ paddingRight: "5px" }}
            ></Icon>
          </Popover2>
          <Switch
            large={false}
            checked={vsmode}
            innerLabelChecked="versus"
            innerLabel="general"
            style={{ paddingTop: "2px" }}
            onChange={(e) => {
              if (e.target.checked === false) {
                props?.setSelectedVSCluster(null);
              }
              setVsmode(e.target.checked);
            }}
          />
        </div>
      </div>
      {clusSel && (
        <div className="marker-cluster-selection">
          <HTMLSelect
            className="marker-cluster-selection-width"
            onChange={(x) => {
              let tmpselection = x.currentTarget?.value;

              if (default_cluster === props?.selectedMarkerAnnotation) {
                tmpselection =
                  parseInt(tmpselection.replace("Cluster ", "")) - 1;
              } else if (
                default_selection === props?.selectedMarkerAnnotation
              ) {
                tmpselection = tmpselection.replace("Custom Selection ", "");
              }

              props?.setSelectedCluster(tmpselection);

              setMarkerFilter({});
              props?.setGene(null);
              props?.setSelectedVSCluster(null);
            }}
          >
            {default_cluster === props?.selectedMarkerAnnotation ||
            default_selection === props?.selectedMarkerAnnotation
              ? clusSel.map((x, i) => (
                  <option
                    selected={
                      String(props?.selectedCluster).startsWith("cs")
                        ? x === props?.selectedCluster
                        : parseInt(x) - 1 === parseInt(props?.selectedCluster)
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
                    selected={x === props?.selectedCluster}
                    key={i}
                    value={x}
                  >
                    {x}
                  </option>
                ))}
          </HTMLSelect>
          {vsmode && (
            <>
              <Button
                style={{ margin: "0 3px" }}
                onClick={() => {
                  let mid = props?.selectedVSCluster;
                  props?.setSelectedVSCluster(props?.selectedCluster);
                  props?.setSelectedCluster(mid);

                  setMarkerFilter({});
                  props?.setGene(null);
                }}
                icon="exchange"
                disabled={props?.selectedVSCluster == null}
                outlined={true}
                intent="primary"
              ></Button>
              <HTMLSelect
                className="marker-cluster-selection-width"
                onChange={(x) => {
                  let tmpselection = x.currentTarget?.value;
                  if (default_cluster === props?.selectedMarkerAnnotation) {
                    tmpselection =
                      parseInt(tmpselection.replace("Cluster ", "")) - 1;
                  } else if (
                    default_selection === props?.selectedMarkerAnnotation
                  ) {
                    tmpselection = tmpselection.replace(
                      "Custom Selection ",
                      ""
                    );
                  }
                  props?.setSelectedVSCluster(tmpselection);

                  setMarkerFilter({});
                  props?.setGene(null);
                }}
              >
                {props?.selectedVSCluster == null && (
                  <option selected={true}>
                    Choose a{" "}
                    {default_selection === props?.selectedMarkerAnnotation
                      ? "Selection"
                      : "Cluster"}
                  </option>
                )}
                {default_cluster === props?.selectedMarkerAnnotation ||
                default_selection === props?.selectedMarkerAnnotation
                  ? clusSel
                      .filter((x, i) =>
                        String(props?.selectedCluster).startsWith("cs")
                          ? String(x).startsWith("cs") &&
                            String(x) !== String(props?.selectedCluster)
                          : !String(x).startsWith("cs") &&
                            parseInt(x) - 1 !== parseInt(props?.selectedCluster)
                      )
                      // .filter((x,i) => String(props?.selectedCluster) == String(x) )
                      .map((x, i) => (
                        <option
                          selected={
                            String(props?.selectedVSCluster).startsWith("cs")
                              ? x === props?.selectedVSCluster
                              : parseInt(x) - 1 ===
                                parseInt(props?.selectedVSCluster)
                          }
                          key={i}
                          value={
                            String(x).startsWith("cs")
                              ? `Custom Selection ${x}`
                              : `Cluster ${x}`
                          }
                        >
                          {String(x).startsWith("cs") ? "Selection" : "Cluster"}{" "}
                          {x}
                        </option>
                      ))
                  : clusSel
                      .filter((x, i) => x !== props?.selectedCluster)
                      .map((x, i) => (
                        <option
                          selected={x === props?.selectedCluster}
                          key={i}
                          value={x}
                        >
                          {x}
                        </option>
                      ))}
              </HTMLSelect>
            </>
          )}
        </div>
      )}
      <Divider />
      {props?.selectedClusterSummary &&
        genesInfo &&
        geneColSel[props?.selectedModality] && (
          <div
            className="marker-table"
            style={{
              gridTemplateRows: getTableHeight(),
            }}
          >
            <div className="marker-header">
              <InputGroup
                leftIcon="search"
                small={true}
                placeholder="Search gene..."
                type={"text"}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <TableVirtuoso
              fixedHeaderContent={() => {
                return (
                  <div
                    className="row-container row-header"
                    style={{
                      gridTemplateColumns: getRowWidths(),
                      background: "white",
                    }}
                  >
                    <span>
                      <HTMLSelect
                        large={false}
                        minimal={true}
                        defaultValue={geneColSel[props?.selectedModality]}
                        onChange={(nval, val) => {
                          let tmp = { ...geneColSel };
                          tmp[props?.selectedModality] =
                            nval?.currentTarget?.value;
                          setGeneColSel(tmp);
                        }}
                      >
                        {Object.keys(genesInfo).map((x, i) => (
                          <option key={i}>{x}</option>
                        ))}
                      </HTMLSelect>
                    </span>
                    {showLogFC && (
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
                              width: "250px",
                            }}
                            elevation={Elevation.ZERO}
                          >
                            <p>
                              Log-fold change in mean expression between cells
                              inside and outside the cluster.
                            </p>
                            <p>
                              Use the color scale below to apply a filter on
                              this statistic.
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
                          Log-FC
                        </span>
                      </Popover2>
                    )}
                    {showDelta && (
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
                              width: "250px",
                            }}
                            elevation={Elevation.ZERO}
                          >
                            <p>
                              Difference in the proportion of detected genes
                              inside and outside the cluster.
                            </p>
                            <p>
                              Use the color scale below to apply a filter on
                              this statistic.
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
                          Δ-detected
                        </span>
                      </Popover2>
                    )}
                    {showExpr && (
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
                              width: "250px",
                            }}
                            elevation={Elevation.ZERO}
                          >
                            <p>
                              The intensity of color represents the mean
                              expression of the gene in this cluster, while the
                              length of the bar represents the percentage of
                              cells in which any expression is detected.
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
                          Expression
                        </span>
                      </Popover2>
                    )}
                  </div>
                );
              }}
              className="marker-list"
              totalCount={sortedRows.length}
              itemContent={(index) => {
                const row = sortedRows[index];
                const rowexp = row.expanded;
                const rowExpr = row.expr;

                return (
                  <div>
                    <div
                      className="row-container"
                      style={{
                        gridTemplateColumns: getRowWidths(),
                      }}
                    >
                      <span
                        style={{
                          color:
                            row.gene === props?.gene
                              ? String(props?.selectedCluster).startsWith("cs")
                                ? props?.clusterColors
                                  ? props?.clusterColors[
                                      getMinMax(
                                        annotationObj[default_cluster]
                                      )[1] +
                                        parseInt(
                                          props?.selectedCluster.replace(
                                            "cs",
                                            ""
                                          )
                                        )
                                    ]
                                  : defaultColor
                                : props?.clusterColors
                                ? props?.clusterColors[props?.selectedCluster]
                                : defaultColor
                              : "black",
                        }}
                        className={
                          row.gene === props?.gene
                            ? "marker-gene-title-selected"
                            : "marker-gene-title"
                        }
                      >
                        {
                          genesInfo[geneColSel[props?.selectedModality]][
                            row.gene
                          ]
                        }
                      </span>
                      {showLogFC && (
                        <Popover2
                          popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                          hasBackdrop={false}
                          interactionKind="hover"
                          placement="auto"
                          hoverOpenDelay={500}
                          modifiers={{
                            arrow: { enabled: true },
                            flip: { enabled: true },
                            preventOverflow: { enabled: true },
                          }}
                          content={
                            <Card elevation={Elevation.ZERO}>
                              <table>
                                <tr>
                                  <td></td>
                                  <th scope="col">
                                    {
                                      genesInfo[
                                        geneColSel[props?.selectedModality]
                                      ][row.gene]
                                    }
                                  </th>
                                  <th scope="col">This cluster</th>
                                </tr>
                                <tr>
                                  <th scope="row">Log-FC</th>
                                  <td>{row.lfc.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{lfcMinMax[0].toFixed(2)},{" "}
                                    {lfcMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Δ-detected</th>
                                  <td>{row.delta.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{deltaMinMax[0].toFixed(2)},{" "}
                                    {deltaMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Detected</th>
                                  <td>{row.detected.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{detectedMinMax[0].toFixed(2)},{" "}
                                    {detectedMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Expression</th>
                                  <td>{row.mean.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{meanMinMax[0].toFixed(2)},{" "}
                                    {meanMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                              </table>
                            </Card>
                          }
                        >
                          <HeatmapCell
                            minmax={lfcMinMax}
                            colorscale={d3.interpolateRdYlBu}
                            score={row.lfc}
                          />
                        </Popover2>
                      )}
                      {showDelta && (
                        <Popover2
                          popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                          hasBackdrop={false}
                          interactionKind="hover"
                          placement="auto"
                          hoverOpenDelay={500}
                          modifiers={{
                            arrow: { enabled: true },
                            flip: { enabled: true },
                            preventOverflow: { enabled: true },
                          }}
                          content={
                            <Card elevation={Elevation.ZERO}>
                              <table>
                                <tr>
                                  <td></td>
                                  <th scope="col">
                                    {
                                      genesInfo[
                                        geneColSel[props?.selectedModality]
                                      ][row.gene]
                                    }
                                  </th>
                                  <th scope="col">This cluster</th>
                                </tr>
                                <tr>
                                  <th scope="row">Δ-detected</th>
                                  <td>{row.delta.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{deltaMinMax[0].toFixed(2)},{" "}
                                    {deltaMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Detected</th>
                                  <td>{row.detected.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{detectedMinMax[0].toFixed(2)},{" "}
                                    {detectedMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Log-FC</th>
                                  <td>{row.lfc.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{lfcMinMax[0].toFixed(2)},{" "}
                                    {lfcMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Expression</th>
                                  <td>{row.mean.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{meanMinMax[0].toFixed(2)},{" "}
                                    {meanMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                              </table>
                            </Card>
                          }
                        >
                          <HeatmapCell
                            minmax={deltaMinMax}
                            colorscale={d3.interpolateRdYlBu}
                            score={row.delta}
                          />
                        </Popover2>
                      )}
                      {showExpr && (
                        <Popover2
                          popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                          hasBackdrop={false}
                          interactionKind="hover"
                          placement="auto"
                          hoverOpenDelay={500}
                          modifiers={{
                            arrow: { enabled: true },
                            flip: { enabled: true },
                            preventOverflow: { enabled: true },
                          }}
                          content={
                            <Card elevation={Elevation.ZERO}>
                              <table>
                                <tr>
                                  <td></td>
                                  <th scope="col">
                                    {
                                      genesInfo[
                                        geneColSel[props?.selectedModality]
                                      ][row.gene]
                                    }
                                  </th>
                                  <th scope="col">This cluster</th>
                                </tr>
                                <tr>
                                  <th scope="row">Expression</th>
                                  <td>{row.mean.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{meanMinMax[0].toFixed(2)},{" "}
                                    {meanMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Log-FC</th>
                                  <td>{row.lfc.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{lfcMinMax[0].toFixed(2)},{" "}
                                    {lfcMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Δ-detected</th>
                                  <td>{row.delta.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{deltaMinMax[0].toFixed(2)},{" "}
                                    {deltaMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                                <tr>
                                  <th scope="row">Detected</th>
                                  <td>{row.detected.toFixed(2)}</td>
                                  <td style={{ fontStyle: "italic" }}>
                                    ∈ [{detectedMinMax[0].toFixed(2)},{" "}
                                    {detectedMinMax[1].toFixed(2)}]
                                  </td>
                                </tr>
                              </table>
                            </Card>
                          }
                        >
                          <Cell
                            minmax={meanMinMax}
                            colorscale={detectedScale}
                            score={row.mean}
                            colorscore={row.detected}
                          />
                        </Popover2>
                      )}
                      <div className="row-action">
                        <Tooltip2 content="Compare this gene's expression across clusters">
                          <Button
                            icon={rowexp ? "minus" : "plus"}
                            small={true}
                            fill={false}
                            className="row-action"
                            outlined={rowexp ? false : true}
                            intent={rowexp ? "primary" : null}
                            onClick={() => {
                              let tmp = [...props?.selectedClusterSummary];
                              var gindex =
                                props?.selectedClusterIndex[row.gene];
                              tmp[gindex].expanded = !tmp[gindex].expanded;
                              props?.setSelectedClusterSummary(tmp);
                              if (!rowExpr && tmp[gindex].expanded) {
                                props?.setReqGene(row.gene);
                              } else {
                                props?.setReqGene(null);
                              }
                            }}
                          ></Button>
                        </Tooltip2>
                        <Tooltip2 content="Visualize this gene's expression">
                          <Button
                            small={true}
                            fill={false}
                            outlined={row.gene === props?.gene ? false : true}
                            intent={row.gene === props?.gene ? "primary" : null}
                            className="row-action"
                            onClick={() => {
                              if (row.gene === props?.gene) {
                                props?.setGene(null);
                              } else {
                                props?.setGene(row.gene);
                                if (!rowExpr) {
                                  props?.setReqGene(row.gene);
                                }
                              }
                            }}
                          >
                            <Icon icon={"tint"}></Icon>
                          </Button>
                        </Tooltip2>
                      </div>
                    </div>
                    <Collapse isOpen={rowexp}>
                      {rowExpr && (
                        <StackedHistogram
                          data={rowExpr}
                          color={
                            default_cluster ===
                              props?.selectedMarkerAnnotation ||
                            default_selection ===
                              props?.selectedMarkerAnnotation
                              ? String(props?.selectedCluster).startsWith("cs")
                                ? props?.clusterColors
                                  ? props?.clusterColors[
                                      getMinMax(
                                        annotationObj[default_cluster]
                                      )[1] +
                                        parseInt(
                                          props?.selectedCluster.replace(
                                            "cs",
                                            ""
                                          )
                                        )
                                    ]
                                  : defaultColor
                                : props?.clusterColors
                                ? props?.clusterColors[props?.selectedCluster]
                                : defaultColor
                              : defaultColor
                          }
                          clusterlabel={
                            default_cluster ===
                              props?.selectedMarkerAnnotation ||
                            default_selection ===
                              props?.selectedMarkerAnnotation
                              ? String(props?.selectedCluster).startsWith("cs")
                                ? `Custom Selection ${props?.selectedCluster}`
                                : `Cluster ${parseInt(
                                    props?.selectedCluster + 1
                                  )}`
                              : props?.selectedCluster
                          }
                          clusters={clusArrayStacked}
                        />
                      )}
                    </Collapse>
                  </div>
                );
              }}
            />
          </div>
        )}
      <Popover2
        popoverClassName={Classes.POPOVER_CONTENT_SIZING}
        hasBackdrop={false}
        interactionKind="hover"
        placement="top"
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
              Filter the set of marker genes according to various statistics.
              For example, this can be used to apply a minimum threshold on the{" "}
              <strong>
                <em>log-fold change</em>
              </strong>{" "}
              or{" "}
              <strong>
                <em>Δ-detected</em>
              </strong>
              , to focus on genes with strong upregulation; or to apply a
              maximum threshold on the expression, to remove constitutively
              expressed genes.
            </p>
            <p>
              Note that this does not change the relative ordering in the table
              above.
            </p>
          </Card>
        }
      >
        <Button
          fill={true}
          outlined={showFilters}
          intent={"primary"}
          onClick={() => setShowFilters(!showFilters)}
        >
          Click to {showFilters ? "hide filters" : "filter markers"}
        </Button>
      </Popover2>
      <Collapse isOpen={showFilters}>
        <div className="marker-filter-container">
          <Tag
            className="marker-filter-container-tag"
            minimal={true}
            intent="primary"
          >
            Log-FC
          </Tag>
          {lfcMinMax && (
            <div className="marker-slider-container">
              {/* <Histogram data={selectedClusterSummary} datakey={"lfc"} height={100} minmax={lfcMinMax}/> */}
              <div className="marker-filter-gradient">
                <div
                  style={{
                    backgroundImage: createColorScale(
                      lfcMinMax[0],
                      lfcMinMax[1]
                    ),
                    width: "100%",
                    height: "5px",
                  }}
                ></div>
                &nbsp;
              </div>
              <RangeSlider
                className="marker-filter-slider"
                min={lfcMinMax[0]}
                max={lfcMinMax[1]}
                labelValues={lfcMinMax}
                stepSize={Math.max(
                  parseFloat(
                    (Math.abs(lfcMinMax[1] - lfcMinMax[0]) / 20).toFixed(2)
                  ),
                  0.01
                )}
                onChange={(val) => handleMarkerFilter(val, "lfc")}
                value={markerFilter?.["lfc"]}
                vertical={false}
              />
            </div>
          )}
        </div>

        <div className="marker-filter-container">
          <Tag
            className="marker-filter-container-tag"
            minimal={true}
            intent="primary"
          >
            Δ-detected
          </Tag>
          {/* <Histogram data={deltas} height={35} color="#4580E6" minmax={deltaMinMax} /> */}
          {deltaMinMax && (
            <div className="marker-slider-container">
              <div className="marker-filter-gradient">
                <div
                  style={{
                    backgroundImage: createColorScale(
                      deltaMinMax[0],
                      deltaMinMax[1]
                    ),
                    width: "100%",
                    height: "5px",
                  }}
                ></div>
                &nbsp;
              </div>
              <RangeSlider
                className="marker-filter-slider"
                min={deltaMinMax[0]}
                max={deltaMinMax[1]}
                labelValues={deltaMinMax}
                stepSize={Math.max(
                  parseFloat(
                    (Math.abs(deltaMinMax[1] - deltaMinMax[0]) / 20).toFixed(2)
                  ),
                  0.01
                )}
                onChange={(val) => handleMarkerFilter(val, "delta")}
                value={markerFilter?.["delta"]}
                vertical={false}
              />
            </div>
          )}
        </div>

        <div className="marker-filter-container">
          <Tag
            className="marker-filter-container-tag"
            minimal={true}
            intent="primary"
          >
            Expression (mean)
          </Tag>
          {/* <Histogram data={means} height={35} minmax={meanMinMax} /> */}
          {meanMinMax && (
            <div className="marker-slider-container">
              <div className="marker-filter-gradient">
                <div
                  style={{
                    backgroundImage: `linear-gradient(to right, #F5F8FA, #2965CC)`,
                    width: "100%",
                    height: "5px",
                  }}
                ></div>
                &nbsp;
              </div>
              <RangeSlider
                className="marker-filter-slider"
                min={meanMinMax[0]}
                max={meanMinMax[1]}
                labelValues={meanMinMax}
                stepSize={Math.max(
                  parseFloat(
                    (Math.abs(meanMinMax[1] - meanMinMax[0]) / 20).toFixed(2)
                  ),
                  0.01
                )}
                onChange={(val) => handleMarkerFilter(val, "mean")}
                value={markerFilter?.["mean"]}
                vertical={false}
              />
            </div>
          )}
        </div>

        <div className="marker-filter-container">
          <Tag
            className="marker-filter-container-tag"
            minimal={true}
            intent="primary"
          >
            Expression (detected)
          </Tag>
          {detectedMinMax && (
            <div className="marker-slider-container">
              <RangeSlider
                className="marker-filter-slider"
                min={detectedMinMax[0]}
                max={detectedMinMax[1]}
                labelValues={detectedMinMax}
                stepSize={Math.max(
                  parseFloat(
                    (
                      Math.abs(detectedMinMax[1] - detectedMinMax[0]) / 20
                    ).toFixed(2)
                  ),
                  0.01
                )}
                onChange={(val) => handleMarkerFilter(val, "detected")}
                value={markerFilter?.["detected"]}
                vertical={false}
              />
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
};

export default React.memo(MarkerPlot);
