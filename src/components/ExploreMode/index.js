import { useState, useCallback, useEffect, useContext } from "react";

import {
  Alignment,
  Button,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Divider,
  ButtonGroup,
  Drawer,
  Menu,
  Classes,
  Text,
  MenuItem,
  EditableText,
  Position,
  Icon,
  Card,
  Elevation,
  H5,
  NonIdealState,
  NonIdealStateIconSize,
  Alert,
  ResizeEntry,
  ResizeSensor,
} from "@blueprintjs/core";

import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";

import SplitPane from "react-split-pane";

import { LoadExplore } from "../LoadExplore";

import Stats from "../Stats";
import Logs from "../Logs";
import { getMinMax, code } from "../../utils/utils";
import DimPlot from "../Plots/DimPlot";
import MarkerPlot from "../Markers/index";
import Gallery from "../Gallery/index";

import { AppToaster } from "../../AppToaster";

import { AppContext } from "../../context/AppContext";

import { palette } from "../Plots/utils";
import { randomColor } from "randomcolor";

import pkgVersion from "../../../package.json";

import logo from "../../assets/kana-cropped.png";
import "../../App.css";

const scranWorker = new Worker(
  new URL("../../workers/explorer.worker.js", import.meta.url),
  { type: "module" }
);

export function ExplorerMode() {
  // true until wasm is initialized
  const [loading, setLoading] = useState(true);

  // show various components, reacts to left side bar clicks
  const [showPanel, setShowPanel] = useState(null);

  // if a user is transitioning from inputs to params, the state is indeterminate,
  // let the user finish setting the params so we can finally run the analysis.
  const [stateIndeterminate, setStateIndeterminate] = useState(false);

  // app export state - store to indexedDB
  const [indexedDBState, setIndexedDBState] = useState(false);
  // list of saved analysis in the browser's indexeddb
  const [kanaIDBRecs, setKanaIDBRecs] = useState([]);
  // delete saved analysis in the browser's indexeddb
  const [deletekdb, setDeletekdb] = useState(null);
  // app export state - .kana file
  const [exportState, setExportState] = useState(false);

  // Logs
  const [logs, setLogs] = useState([]);
  // show logs drawer
  const [showLogs, setShowLogs] = useState(false);

  // Error handling
  // error message caught from the worker
  const [scranError, setScranError] = useState(null);

  const {
    wasmInitialized,
    setWasmInitialized,
    datasetName,
    setDatasetName,
    setPreInputFilesStatus,
    annotationCols,
    setAnnotationCols,
    annotationObj,
    setAnnotationObj,
    setGenesInfo,
    geneColSel,
    setGeneColSel,
    initLoadState,
    setInitLoadState,
    exploreFiles,
    setExploreFiles,
    preInputFiles,
  } = useContext(AppContext);

  // modalities
  const [modality, setModality] = useState(null);
  const [selectedModality, setSelectedModality] = useState(null);

  /*******
   * State to hold analysis specific results - START
   */

  // STEP: INPUTS
  // dim sizes
  const [initDims, setInitDims] = useState(null);
  const [inputData, setInputData] = useState(null);

  // STEP: QC; for all three, RNA, ADT, CRISPR
  // dim sizes
  const [qcDims, setQcDims] = useState(null);
  const [qcData, setQcData] = useState(null);

  // STEP: CELL_FILTERING
  const [cellSubsetData, setCellSubsetData] = useState(null);

  // STEP: FEATURE_SELECTION
  const [fSelectionData, setFSelectionData] = useState(null);

  // STEP: PCA; for all three - RNA, ADT, CRISPR
  const [pcaVarExp, setPcaVarExp] = useState({});

  // STEP: MARKER_DETECTION, CHOOSE_CLUSTERING
  // only valid for column `KANA_CODE::CLUSTERS`
  // cohen, mean scores per gene
  const [selectedClusterSummary, setSelectedClusterSummary] = useState([]);
  // ordering of genes for the selected cluster
  const [selectedClusterIndex, setSelectedClusterIndex] = useState([]);

  // STEP: REDUCED_DIMENSIONS: TSNE & UMAP
  // actual embeddings
  const [redDimsData, setRedDimsData] = useState({});
  // for tsne/umap animation
  const [animateData, setAnimateData] = useState(null);

  // STEP: CELL_LABELLING
  const [cellLabelData, setCellLabelData] = useState(null);

  /*******
   * State to hold analysis specific results - END
   ******/

  // loaders for UI components
  const [showDimPlotLoader, setShowDimPlotLoader] = useState(true);
  const [showMarkerLoader, setShowMarkerLoader] = useState(true);
  const [showQCLoader, setShowQCLoader] = useState(true);
  const [showPCALoader, setShowPCALoader] = useState(true);
  const [showNClusLoader, setShowNClusLoader] = useState(true);
  const [showCellLabelLoader, setShowCellLabelLoader] = useState(true);

  function setAllLoaders() {
    setShowDimPlotLoader(true);
    setShowMarkerLoader(true);
    setShowQCLoader(true);
    setShowPCALoader(true);
    setShowNClusLoader(true);
    setShowCellLabelLoader(true);
  }

  const default_cluster = `${code}::CLUSTERS`;

  /*******
   * USER STATE REQUESTS - START
   */

  // what gene is selected for scatterplot
  const [gene, setGene] = useState(null);

  // request gene expression
  const [reqGene, setReqGene] = useState(null);

  // ImageData user saves while exploring
  const [savedPlot, setSavedPlot] = useState([]);

  // request annotation column
  const [reqAnnotation, setReqAnnotation] = useState(null);

  // which cluster is selected
  const [selectedCluster, setSelectedCluster] = useState(null);

  // which dimension is selected
  const [selectedRedDim, setSelectedRedDim] = useState(null);

  // is animation in progress ?
  const [showAnimation, setShowAnimation] = useState(false);

  // if a user manually triggers an embedding animation (using the play button)
  const [triggerAnimation, setTriggerAnimation] = useState(false);

  // keeps track of what points were selected in lasso selections
  const [selectedPoints, setSelectedPoints] = useState(null);

  // set Cluster rank-type
  const [clusterRank, setClusterRank] = useState("cohen-min-rank");
  // which cluster is selected for vsmode
  const [selectedVSCluster, setSelectedVSCluster] = useState(null);
  // set cluster colors
  const [clusterColors, setClusterColors] = useState(null);

  // custom selection on reduced dims plot
  const [customSelection, setCustomSelection] = useState({});
  // remove custom Selection
  const [delCustomSelection, setDelCustomSelection] = useState(null);

  // state captured
  const [restoreState, setRestoreState] = useState(null);
  // for highlight in uDimPlots
  const [highlightPoints, setHighlightPoints] = useState(null);
  // set which cluster to highlight, also for custom selections
  const [clusHighlight, setClusHighlight] = useState(null);
  // set which clusterlabel is highlighted
  const [clusHighlightLabel, setClusHighlightLabel] = useState(null);
  // selected colorBy
  const [colorByAnnotation, setColorByAnnotation] = useState(default_cluster);

  /*******
   * USER REQUESTS - END
   ******/

  // initializes various things on the worker side
  useEffect(() => {
    scranWorker.postMessage({
      type: "INIT",
      msg: "Initial Load",
    });
  }, []);

  useEffect(() => {
    if (wasmInitialized && preInputFiles) {
      if (preInputFiles.files) {
        scranWorker.postMessage({
          type: "PREFLIGHT_INPUT",
          payload: {
            inputs: preInputFiles,
          },
        });
      }
    }
  }, [preInputFiles, wasmInitialized]);

  // EXPLORE dataset: files are imported into Kana
  useEffect(() => {
    if (wasmInitialized) {
      if (exploreFiles.files != null) {
        scranWorker.postMessage({
          type: "EXPLORE",
          payload: {
            inputs: exploreFiles,
          },
        });

        add_to_logs("info", `--- Analyis started---`);
        setAllLoaders();
      }
    }
  }, [exploreFiles, wasmInitialized]);

  // request worker for new markers
  // if either the cluster or the ranking changes
  // VS mode
  useEffect(() => {
    if (selectedModality !== null && clusterRank !== null) {
      if (selectedVSCluster !== null && selectedCluster !== null) {
        let type = String(selectedCluster).startsWith("cs")
          ? "computeVersusSelections"
          : "computeVersusClusters";
        scranWorker.postMessage({
          type: type,
          payload: {
            modality: selectedModality,
            left: selectedCluster,
            right: selectedVSCluster,
            rank_type: clusterRank,
          },
        });

        add_to_logs("info", `--- ${type} sent ---`);
      } else if (selectedCluster !== null) {
        let type = String(selectedCluster).startsWith("cs")
          ? "getMarkersForSelection"
          : "getMarkersForCluster";
        scranWorker.postMessage({
          type: type,
          payload: {
            modality: selectedModality,
            cluster: selectedCluster,
            rank_type: clusterRank,
          },
        });

        add_to_logs("info", `--- ${type} sent ---`);
      }
    }
  }, [selectedCluster, selectedVSCluster, clusterRank, selectedModality]);

  // compute markers in the worker
  // when a new custom selection of cells is made through the UI
  useEffect(() => {
    if (
      delCustomSelection === null &&
      customSelection !== null &&
      Object.keys(customSelection).length > 0
    ) {
      let csLen = `cs${Object.keys(customSelection).length}`;
      var cs = customSelection[csLen];
      scranWorker.postMessage({
        type: "computeCustomMarkers",
        payload: {
          selection: cs,
          id: csLen,
        },
      });

      add_to_logs("info", `--- Compute markers for ${csLen} sent ---`);
    }
  }, [customSelection]);

  // Remove a custom selection from cache
  useEffect(() => {
    if (delCustomSelection !== null) {
      scranWorker.postMessage({
        type: "removeCustomMarkers",
        payload: {
          id: delCustomSelection,
        },
      });

      setDelCustomSelection(null);
      add_to_logs(
        "info",
        `--- Delete custom markers for ${delCustomSelection} ---`
      );

      if (selectedCluster === delCustomSelection) {
        setSelectedCluster(null);
      }
    }
  }, [delCustomSelection]);

  // get expression for a gene from worker
  useEffect(() => {
    if (reqGene != null && selectedModality != null) {
      scranWorker.postMessage({
        type: "getGeneExpression",
        payload: {
          gene: reqGene,
          modality: selectedModality,
        },
      });

      add_to_logs(
        "info",
        `--- Request gene expression for gene:${reqGene} sent ---`
      );
    }
  }, [reqGene, selectedModality]);

  // get annotation for a column from worker
  useEffect(() => {
    if (reqAnnotation) {
      scranWorker.postMessage({
        type: "getAnnotation",
        payload: {
          annotation: reqAnnotation,
        },
      });

      add_to_logs(
        "info",
        `--- Request annotation for ${reqAnnotation} sent---`
      );
    }
  }, [reqAnnotation]);

  // if modality changes, show the new markers list
  useEffect(() => {
    if (selectedModality) {
      setGenesInfo(inputData.genes[selectedModality]);
      if (geneColSel[selectedModality] == null) {
        let tmp = geneColSel;
        tmp[selectedModality] = Object.keys(
          inputData.genes[selectedModality]
        )[0];
        setGeneColSel(tmp);
      }
    }
  }, [selectedModality]);

  function add_to_logs(type, msg, status) {
    let tmp = [...logs];
    let d = new Date();
    tmp.push([type, d.toLocaleTimeString(), msg, status]);

    setLogs(tmp);
  }

  scranWorker.onmessage = (msg) => {
    const payload = msg.data;

    console.log("ON EXPLORE MAIN::RCV::", payload);

    // process any error messages
    if (payload) {
      if (payload.type.toLowerCase().endsWith("start")) {
        add_to_logs(
          "start",
          payload.type.toLowerCase().replace("_start", ""),
          "started"
        );
      } else if (payload.type.indexOf("_store") != -1) {
        add_to_logs(
          "info",
          `(${payload.type
            .toLowerCase()
            .replace("_store", "")}) store initialized`
        );
      } else if (payload.type.toLowerCase().endsWith("init")) {
        add_to_logs("info", payload.msg.toLowerCase().replace("success: ", ""));
      } else if (payload.type.toLowerCase().endsWith("cache")) {
        add_to_logs(
          "complete",
          payload.type.toLowerCase().replace("_cache", ""),
          "finished (from cache)"
        );
      } else if (payload.type.toLowerCase().endsWith("data")) {
        add_to_logs(
          "complete",
          payload.type.toLowerCase().replace("_data", ""),
          "finished"
        );
      }

      const { resp } = payload;
      if (
        payload.type.toLowerCase().endsWith("error") ||
        resp?.status === "ERROR"
      ) {
        add_to_logs("error", `${resp.reason}`, "");

        setScranError({
          type: payload.type,
          msg: resp.reason,
          fatal: resp?.fatal === undefined ? true : resp.fatal,
        });

        return;
      }
    }

    const { resp, type } = payload;

    if (type === "INIT") {
      setLoading(false);
      setWasmInitialized(true);
    } else if (type === "PREFLIGHT_INPUT_DATA") {
      if (resp.details) {
        setPreInputFilesStatus(resp.details);
      }
    } else if (type === "inputs_DATA") {
      var info = [];
      if ("default" in resp.num_genes) {
        info.push(`${resp.num_genes.default} features`);
      }
      if ("RNA" in resp.num_genes) {
        info.push(`${resp.num_genes.RNA} genes`);
      }
      if ("ADT" in resp.num_genes) {
        info.push(`${resp.num_genes.ADT} ADTs`);
      }
      if ("CRISPR" in resp.num_genes) {
        info.push(`${resp.num_genes.ADT} Guides`);
      }
      info.push(`${resp.num_cells} cells`);

      setInitDims(info.join(", "));
      setInputData(resp);

      if (resp?.annotations) {
        setAnnotationCols([...resp.annotations, default_cluster]);
      }

      let pmods = Object.keys(resp.genes);
      setModality(pmods);

      let tmodality = pmods[0];

      // we don't know what the clusters are so everything is a single cluster
      let tclusters = [];
      for (let ic = 0; ic < resp.num_cells; ic++) {
        tclusters.push(0);
      }
      let cluster_count = 1;
      let cluster_colors = null;
      if (cluster_count > Object.keys(palette).length) {
        cluster_colors = randomColor({
          luminosity: "dark",
          count: cluster_count + 1,
        });
      } else {
        cluster_colors = palette[cluster_count.toString()];
      }
      setClusterColors(cluster_colors);

      let t_annoObj = { ...annotationObj };
      t_annoObj[default_cluster] = tclusters;
      setAnnotationObj(t_annoObj);
      setSelectedCluster(0);
      setShowNClusLoader(false);

      if (selectedModality === null) {
        setSelectedModality(tmodality);
      }

      // no markers yet just show a list of genes
      let records = [];

      let tmpFeatCol = Object.keys(resp.num_genes[tmodality])[0];
      let index = Array(resp.num_genes[tmodality]);
      resp.genes[tmodality].forEach((x, i) => {
        index[i] = i;
        records.push({
          gene: i,
          expanded: false,
          expr: null,
        });
      });
      setSelectedClusterIndex(index);
      setSelectedClusterSummary(records);
      setShowMarkerLoader(false);
    } else if (type === "marker_detection_START") {
      setSelectedCluster(null);
      setSelectedClusterIndex([]);
      setSelectedClusterSummary([]);
    } else if (type === "marker_detection_DATA") {
      if (selectedCluster === null) {
        // show markers for the first cluster
        if (selectedModality === null) {
          setSelectedModality(modality[0]);
        }
        setSelectedCluster(0);
      }
    } else if (type === "embedding_DATA") {
      if (selectedRedDim === null) {
        setSelectedRedDim(Object.keys(resp)[0]);
      }

      setRedDimsData(resp);

      // hide game and all loaders
      // setShowGame(false);
      setShowAnimation(false);
      setTriggerAnimation(false);
      setShowDimPlotLoader(false);
    } else if (
      type === "setMarkersForCluster" ||
      type === "setMarkersForCustomSelection" ||
      type === "computeVersusSelections" ||
      type === "computeVersusClusters"
    ) {
      let records = [];
      let index = Array(resp.ordering.length);
      resp.means.forEach((x, i) => {
        index[resp.ordering[i]] = i;
        records.push({
          gene: resp?.ordering?.[i],
          mean: isNaN(x) ? 0 : parseFloat(x.toFixed(2)),
          delta: isNaN(x)
            ? 0
            : parseFloat(resp?.delta_detected?.[i].toFixed(2)),
          lfc: isNaN(x) ? 0 : parseFloat(resp?.lfc?.[i].toFixed(2)),
          detected: isNaN(x) ? 0 : parseFloat(resp?.detected?.[i].toFixed(2)),
          expanded: false,
          expr: null,
        });
      });
      setSelectedClusterIndex(index);
      setSelectedClusterSummary(records);
      setShowMarkerLoader(false);
    } else if (type === "setGeneExpression") {
      let tmp = [...selectedClusterSummary];
      tmp[selectedClusterIndex[resp.gene]].expr = Object.values(resp.expr);
      setSelectedClusterSummary(tmp);
      setReqGene(null);
    } else if (type === "setAnnotation") {
      let tmp = { ...annotationObj };
      tmp[resp.annotation] = resp.values;
      setAnnotationObj(tmp);

      setReqAnnotation(null);
    } else if (payload.type === "custom_selections_DATA") {
    } else if (payload.type === "marker_detection_CACHE") {
      setShowMarkerLoader(false);
    } else if (payload.type === "choose_clustering_CACHE") {
      setShowNClusLoader(false);
    }
  };

  // resize managers for window width
  const [windowWidth, setWindowWidth] = useState(0);

  // resize markers width
  const [markersWidth, setMarkersWidth] = useState(360);

  const handleResize = () => {
    setWindowWidth(window.innerWidth);
  };

  const getGalleryStyles = () => {
    if (windowWidth >= 1200) {
      return {
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      };
    } else {
      return {
        overflowX: "auto",
        display: "flex",
        flexDirection: "row",
        marginRight: "10px",
      };
    }
  };

  return (
    <div className="App">
      <Navbar className={Classes.DARK}>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading>
            {<img height="20px" src={logo}></img>}{" "}
            <span
              style={{
                fontSize: "8px",
              }}
            >
              v{pkgVersion.version}
            </span>
          </NavbarHeading>
          <NavbarDivider />
          <span>Single cell analysis in the browser</span>
          <NavbarDivider />
          <Tooltip2
            content="Click to modify the dataset title"
            position={Position.BOTTOM}
          >
            <EditableText
              value={datasetName}
              intent="primary"
              onConfirm={(val) => {
                setDatasetName(val);
              }}
              onChange={(val) => {
                setDatasetName(val);
              }}
            />
          </Tooltip2>
          <Stats initDims={initDims} qcDims={qcDims} />
        </NavbarGroup>
      </Navbar>
      <SplitPane
        className="left-sidebar"
        split="vertical"
        defaultSize={60}
        allowResize={false}
      >
        <div className="left-sidebar-content">
          <div className="left-sidebar-content-flex-top">
            <div
              className={
                showPanel === "explore-import"
                  ? "item-sidebar-intent"
                  : "item-sidebar"
              }
            >
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Load a dataset"
                minimal={false}
                placement={"right"}
                intent={showPanel === "explore-import" ? "primary" : ""}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"archive"}
                    onClick={() =>
                      showPanel !== "explore-import"
                        ? setShowPanel("explore-import")
                        : setShowPanel(null)
                    }
                    intent={showPanel === "explore-import" ? "primary" : "none"}
                  ></Button>
                  <span
                    style={{
                      color:
                        showPanel === "explore-import" ? "#184A90" : "black",
                    }}
                  >
                    LOAD
                  </span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div
              className={
                showPanel === "explore" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content={
                  selectedRedDim === null
                    ? "Start or load an analysis to explore results"
                    : "Explore results!"
                }
                minimal={false}
                placement={"right"}
                intent={showPanel === "explore" ? "primary" : ""}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"rocket-slant"}
                    disabled={selectedRedDim === null}
                    onClick={() =>
                      showPanel !== "explore"
                        ? setShowPanel("explore")
                        : setShowPanel(null)
                    }
                    intent={showPanel === "explore" ? "primary" : "none"}
                  ></Button>
                  <span
                    style={{
                      color: showPanel === "explore" ? "#184A90" : "black",
                    }}
                  >
                    EXPLORE
                  </span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div
              className={
                showPanel === "logs" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              {" "}
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="What's happening under the hood? See the blow-by-blow logs as the analysis runs!"
                minimal={false}
                placement={"right"}
                intent={showPanel === "logs" ? "primary" : "none"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"console"}
                    onClick={() => setShowLogs(true)}
                    intent={showPanel === "logs" ? "primary" : "none"}
                  ></Button>
                  <span
                    style={{
                      color: showPanel === "logs" ? "#184A90" : "black",
                    }}
                  >
                    LOGS
                  </span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
          </div>
          <div className="left-sidebar-content-flex-bottom">
            <Divider />
            <div
              className={
                showPanel === "info" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              {" "}
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Wanna know more about Kana?"
                minimal={false}
                placement={"right"}
                intent={showPanel === "info" ? "primary" : "none"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"info-sign"}
                    onClick={() =>
                      showPanel !== "info"
                        ? setShowPanel("info")
                        : setShowPanel(null)
                    }
                    intent={showPanel === "info" ? "primary" : "none"}
                  ></Button>
                  <span>INFO</span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div className="item-sidebar">
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Checkout Kanaverse"
                minimal={false}
                placement={"right"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"git-repo"}
                  ></Button>
                  <span>GITHUB</span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
          </div>
        </div>
        <div className="App-body">
          {showPanel === "explore" && (
            <ResizeSensor onResize={handleResize}>
              <SplitPane
                defaultSize={windowWidth >= 1200 ? 300 : 275}
                split={windowWidth >= 1200 ? "vertical" : "horizontal"}
                primary="second"
                allowResize={false}
              >
                <SplitPane
                  defaultSize={markersWidth}
                  allowResize={false}
                  split="vertical"
                  primary="second"
                >
                  <div
                    className={
                      showDimPlotLoader
                        ? "results-dims effect-opacitygrayscale"
                        : "results-dims"
                    }
                  >
                    {redDimsData && annotationObj[default_cluster] && (
                      <DimPlot
                        className={"effect-opacitygrayscale"}
                        redDimsData={redDimsData}
                        selectedRedDim={selectedRedDim}
                        setSelectedRedDim={setSelectedRedDim}
                        showAnimation={showAnimation}
                        setShowAnimation={setShowAnimation}
                        animateData={animateData}
                        setTriggerAnimation={setTriggerAnimation}
                        selectedClusterSummary={selectedClusterSummary}
                        setSelectedClusterSummary={setSelectedClusterSummary}
                        selectedClusterIndex={selectedClusterIndex}
                        selectedCluster={selectedCluster}
                        clusterColors={clusterColors}
                        setClusterColors={setClusterColors}
                        savedPlot={savedPlot}
                        setSavedPlot={setSavedPlot}
                        customSelection={customSelection}
                        setCustomSelection={setCustomSelection}
                        setGene={setGene}
                        gene={gene}
                        setDelCustomSelection={setDelCustomSelection}
                        setReqAnnotation={setReqAnnotation}
                        selectedPoints={selectedPoints}
                        setSelectedPoints={setSelectedPoints}
                        restoreState={restoreState}
                        setRestoreState={setRestoreState}
                        setHighlightPoints={setHighlightPoints}
                        clusHighlight={clusHighlight}
                        setClusHighlight={setClusHighlight}
                        clusHighlightLabel={clusHighlightLabel}
                        setClusHighlightLabel={setClusHighlightLabel}
                        colorByAnnotation={colorByAnnotation}
                        setColorByAnnotation={setColorByAnnotation}
                        selectedModality={selectedModality}
                      />
                    )}
                  </div>
                  <div
                    className={
                      showMarkerLoader
                        ? "results-markers effect-opacitygrayscale"
                        : "results-markers"
                    }
                  >
                    {annotationObj[default_cluster] &&
                      selectedClusterSummary && (
                        <MarkerPlot
                          selectedClusterSummary={selectedClusterSummary}
                          setSelectedClusterSummary={setSelectedClusterSummary}
                          selectedClusterIndex={selectedClusterIndex}
                          selectedCluster={selectedCluster}
                          setSelectedCluster={setSelectedCluster}
                          selectedVSCluster={selectedVSCluster}
                          setSelectedVSCluster={setSelectedVSCluster}
                          setClusterRank={setClusterRank}
                          customSelection={customSelection}
                          setGene={setGene}
                          gene={gene}
                          setReqGene={setReqGene}
                          clusterColors={clusterColors}
                          modality={modality}
                          selectedModality={selectedModality}
                          setSelectedModality={setSelectedModality}
                          setMarkersWidth={setMarkersWidth}
                          markersWidth={markersWidth}
                          windowWidth={windowWidth}
                        />
                      )}
                  </div>
                </SplitPane>
                <div className="results-gallery" style={getGalleryStyles()}>
                  <Gallery
                    qcData={qcData}
                    pcaVarExp={pcaVarExp}
                    savedPlot={savedPlot}
                    setSavedPlot={setSavedPlot}
                    clusterColors={clusterColors}
                    cellLabelData={cellLabelData}
                    gene={gene}
                    showQCLoader={showQCLoader}
                    showPCALoader={showPCALoader}
                    showNClusLoader={showNClusLoader}
                    showCellLabelLoader={showCellLabelLoader}
                    redDimsData={redDimsData}
                    selectedRedDim={selectedRedDim}
                    selectedPoints={selectedPoints}
                    setSelectedPoints={setSelectedPoints}
                    restoreState={restoreState}
                    setRestoreState={setRestoreState}
                    highlightPoints={highlightPoints}
                    clusHighlight={clusHighlight}
                    clusHighlightLabel={clusHighlightLabel}
                    setClusHighlight={setClusHighlight}
                    colorByAnnotation={colorByAnnotation}
                    windowWidth={windowWidth}
                  />
                </div>
              </SplitPane>
            </ResizeSensor>
          )}
          {(showPanel === null || showPanel === undefined) && (
            <NonIdealState
              icon={"control"}
              iconSize={NonIdealStateIconSize.STANDARD}
              title={"Lost all the windows eh?"}
              description={
                <p>
                  My boss told me I can't start an app with an empty screen. So
                  here goes nothing...
                </p>
              }
              children={
                <Card
                  style={{
                    textAlign: "left",
                    width: "70%",
                  }}
                  elevation={Elevation.ZERO}
                >
                  <p>
                    <strong>kana</strong> performs a standard single-cell data
                    analysis directly inside the browser.
                  </p>
                  <p>
                    With just a few clicks, you can get a UMAP/t-SNE, clusters
                    and their marker genes in an intuitive interface for further
                    exploration. No need to transfer data, no need to install
                    software, no need to configure a backend server - just point
                    to a Matrix Market file and we'll analyze <em>your</em> data
                    on <em>your</em> computer, no questions asked.
                  </p>
                  <p>
                    Check out our{" "}
                    <a href="https://github.com/kanaverse" target="_blank">
                      GitHub page
                    </a>{" "}
                    for more details.
                  </p>
                  <H5>Authors</H5>
                  Jayaram Kancherla (
                  <a href="https://github.com/jkanche" target="_blank">
                    <strong>@jkanche</strong>
                  </a>
                  ), Aaron Lun (
                  <a href="https://github.com/LTLA" target="_blank">
                    <strong>@LTLA</strong>
                  </a>
                  )
                </Card>
              }
              action={
                <Button
                  outlined={true}
                  text="Explore a dataset"
                  icon="plus"
                  intent="primary"
                  onClick={() => setShowPanel("explore-import")}
                />
              }
            />
          )}
          {showPanel === "explore-import" && (
            <LoadExplore setShowPanel={setShowPanel} />
          )}
        </div>
      </SplitPane>
      <Alert
        canEscapeKeyCancel={false}
        canOutsideClickCancel={false}
        confirmButtonText={scranError?.fatal ? "Reload App" : "close"}
        icon="warning-sign"
        intent="danger"
        isOpen={scranError != null}
        onConfirm={() => {
          if (scranError?.fatal) {
            window.location.reload();
          } else {
            setScranError(null);
          }
        }}
      >
        <h3>{scranError?.type.replace("_", " ").toUpperCase()}</h3>
        <Divider />
        <p>{scranError?.msg}</p>
        <Divider />
        <p>
          Please provide a reproducible example and report the issue on{" "}
          <a href="https://github.com/jkanche/kana/issues" target="_blank">
            GitHub
          </a>
          .
        </p>
        <Divider />
        {scranError?.fatal && (
          <Button
            intent="warning"
            text="Check Logs"
            onClick={() => setShowLogs(true)}
          />
        )}
      </Alert>
      <Logs
        loadingStatus={true}
        showLogs={showLogs}
        setShowLogs={setShowLogs}
        logs={logs}
      />
    </div>
  );
}