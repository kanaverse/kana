import { useState, useEffect, useContext } from "react";

import {
  Alignment,
  Button,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Divider,
  Menu,
  Classes,
  MenuItem,
  EditableText,
  Position,
  H3,
  Alert,
  ResizeSensor,
  Callout,
  Spinner,
} from "@blueprintjs/core";

import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";

import SplitPane from "react-split-pane";

import { NewAnalysis } from "../NewAnalysis";
import { LoadAnalysis } from "../LoadAnalysis";
import { ParameterSelection } from "../ParamSelection";

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
import FeatureSetEnrichment from "../FeatureSets";
import CellAnnotation from "../CellAnnotation";

const scranWorker = new Worker(
  new URL("../../workers/scran.worker.js", import.meta.url),
  { type: "module" }
);

let logs = [];

export function AnalysisMode(props) {
  // true until wasm is initialized
  const [loading, setLoading] = useState(true);

  // show various components, reacts to left side bar clicks
  const [showPanel, setShowPanel] = useState("new");

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
  // app export state - .RDS file
  const [exportRDSState, setExportRDSState] = useState(false);

  // Logs
  // const [logs, setLogs] = useState([]);
  // show logs drawer
  const [showLogs, setShowLogs] = useState(false);

  // Error handling
  // error message caught from the worker
  const [scranError, setScranError] = useState(null);

  const {
    wasmInitialized,
    preInputFiles,
    setWasmInitialized,
    datasetName,
    setDatasetName,
    setEhubDatasets,
    setPreInputFilesStatus,
    inputFiles,
    params,
    setParams,
    annotationCols,
    setAnnotationCols,
    annotationObj,
    setAnnotationObj,
    setGenesInfo,
    geneColSel,
    setGeneColSel,
    loadFiles,
    initLoadState,
    setInitLoadState,
    loadParams,
    setLoadParams,
    setInputFiles,
    setFsetEnrichCollections,
    loadZiesel,
    setLoadZiesel,
    preInputOptions,
    setPreInputOptionsStatus,
    setPreInputFiles,
    setAppMode,
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

  // STEP: FEATURE_SET_ENRICHMENT
  const [fsetEnirchDetails, setFsetEnrichDetails] = useState({});
  const [fsetEnirchSummary, setFsetEnrichSummary] = useState({});

  /*******
   * State to hold analysis specific results - END
   ******/

  // loaders for UI components
  const [showDimPlotLoader, setShowDimPlotLoader] = useState(true);
  const [showMarkerLoader, setShowMarkerLoader] = useState(true);
  const [showFsetLoader, setShowFsetLoader] = useState(true);
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
    setShowFsetLoader(true);
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

  // which marker cluster is selected
  const [selectedCluster, setSelectedCluster] = useState(null);

  // which dimplot cluster is selected
  const [selectedDimPlotCluster, setSelectedDimPlotCluster] =
    useState(default_cluster);

  // which cluster is selected from markers table
  const [selectedMarkerAnnotation, setSelectedMarkerAnnotation] =
    useState(null);

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

  // are we showing markers or featuresets or celltypeannotations?
  const [markersORFSets, setMarkersOrFsets] = useState("markers");
  // set feature set rank-type
  const [fsetClusterRank, setFsetClusterRank] = useState("cohen-min-rank");
  // feature scores cache
  const [featureScores, setFeatureScores] = useState({});
  // which fset cluster is selected
  const [selectedFsetCluster, setSelectedFsetCluster] = useState(null);
  // which  fset annotation, currently we only support computed clusters
  const [selectedFsetAnnotation, setSelectedFsetAnnotation] =
    useState(default_cluster);
  // what feature name is selected
  const [selectedFsetIndex, setSelectedFsetIndex] = useState(null);
  // request feature set scores
  const [reqFsetIndex, setReqFsetIndex] = useState(null);
  // cache for scores
  const [featureScoreCache, setFeatureScoreCache] = useState(null);
  // gene index selected from a feature set
  const [featureSetGeneIndex, setFeatureSetGeneIndex] = useState(null);
  // request for scores
  const [reqFsetGeneIndex, setReqFsetGeneIndex] = useState(null);
  // fset gene indices cache
  const [fsetGeneIndxCache, setFsetGeneIndxCache] = useState(null);
  // contains the actual gene scores
  const [fsetGeneExprCache, setFsetGeneExprCache] = useState({});
  // which cluster is selected for vsmode
  const [selectedFsetVSCluster, setSelectedFsetVSCluster] = useState(null);
  // modality in feature set
  const [selectedFsetModality, setSelectedFsetModality] = useState("RNA");

  // which cluster is selected in the celltype table
  const [selectedCellAnnCluster, setSelectedCellAnnCluster] = useState(null);

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

  useEffect(() => {
    if (wasmInitialized && preInputFiles) {
      if (preInputFiles.files && preInputOptions.options.length > 0) {
        scranWorker.postMessage({
          type: "PREFLIGHT_OPTIONS",
          payload: {
            ...preInputOptions,
            inputs: preInputFiles,
          },
        });
      }
    }
  }, [preInputOptions, wasmInitialized]);

  // NEW analysis: files are imported into Kana
  useEffect(() => {
    if (wasmInitialized && !stateIndeterminate) {
      if (inputFiles.files != null) {
        scranWorker.postMessage({
          type: "RUN",
          payload: {
            inputs: inputFiles,
            params: params,
          },
        });

        add_to_logs("info", `--- Analyis started---`);
        setAllLoaders();
      }
    }
  }, [inputFiles, params, wasmInitialized, stateIndeterminate]);

  // LOAD analysis: files are imported into Kana
  useEffect(() => {
    if (wasmInitialized && !initLoadState) {
      if (loadFiles.files != null) {
        if (loadParams == null) {
          scranWorker.postMessage({
            type: "LOAD",
            payload: {
              inputs: loadFiles,
            },
          });

          setAllLoaders();
          add_to_logs("info", `--- Reloading saved analysis ---`);
          setInitLoadState(true);
        } else {
          scranWorker.postMessage({
            type: "RUN",
            payload: {
              inputs: {
                files: null,
                batch: loadParams?.inputs?.block_factor,
                subset: loadParams?.inputs?.subset,
              },
              params: params,
            },
          });

          add_to_logs("info", `--- Reanalyzing loaded analysis ---`);
          setAllLoaders();
        }
      }
    }
  }, [loadFiles, params, loadParams, wasmInitialized]);

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
            annotation: selectedMarkerAnnotation,
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
            annotation: selectedMarkerAnnotation,
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

  // trigger an embedding animation
  useEffect(() => {
    if (triggerAnimation && selectedRedDim) {
      scranWorker.postMessage({
        type: "animate" + selectedRedDim,
        payload: {
          params: params[selectedRedDim.toLowerCase()],
        },
      });

      add_to_logs("info", `--- Request to animate ${selectedRedDim} sent ---`);
    }
  }, [triggerAnimation]);

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
      if (
        geneColSel[selectedModality] === null ||
        geneColSel[selectedModality] === undefined
      ) {
        let tmp = geneColSel;
        tmp[selectedModality] = Object.keys(
          inputData.genes[selectedModality]
        )[0];
        setGeneColSel(tmp);
      }
      setGenesInfo(inputData.genes[selectedModality]);
    }
  }, [selectedModality]);

  // export an analysis to file
  useEffect(() => {
    if (exportState) {
      scranWorker.postMessage({
        type: "EXPORT",
        payload: {
          files: inputFiles,
          params: params,
        },
      });

      AppToaster.show({
        icon: "download",
        intent: "primary",
        message: "Exporting analysis in the background",
      });
      add_to_logs(
        "info",
        `--- Export analysis state (to file) initialized ---`
      );
    } else {
      inputFiles?.files &&
        AppToaster.show({
          icon: "download",
          intent: "primary",
          message: "Analysis saved. Please check your downloads directory!",
        });
    }
  }, [exportState]);

  // export an analysis to file
  useEffect(() => {
    if (exportRDSState) {
      scranWorker.postMessage({
        type: "EXPORT_RDS",
        payload: {
          files: inputFiles,
          params: params,
        },
      });

      AppToaster.show({
        icon: "download",
        intent: "primary",
        message: "Exporting analysis as ZIP in the background",
      });
      add_to_logs("info", `--- Export analysis state (to ZIP) initialized ---`);
    } else {
      inputFiles?.files &&
        AppToaster.show({
          icon: "download",
          intent: "primary",
          message: "Analysis saved. Please check your downloads directory!",
        });
    }
  }, [exportRDSState]);

  // export an analysis to idxdb
  useEffect(() => {
    if (indexedDBState) {
      scranWorker.postMessage({
        type: "SAVEKDB",
        payload: {
          title: datasetName,
        },
      });

      AppToaster.show({
        icon: "floppy-disk",
        intent: "primary",
        message:
          "Saving analysis in the background. Note: analysis is saved within the browser!!",
      });
      add_to_logs(
        "info",
        `--- Export analysis state (to browser) initialized ---`
      );
    } else {
      inputFiles?.files &&
        AppToaster.show({
          icon: "floppy-disk",
          intent: "primary",
          message: "Analysis saved!",
        });
    }
  }, [indexedDBState]);

  // remove an analysis from idxdb
  useEffect(() => {
    if (deletekdb !== null && deletekdb !== undefined) {
      scranWorker.postMessage({
        type: "REMOVEKDB",
        payload: {
          id: deletekdb,
        },
      });
      add_to_logs(
        "info",
        `--- Remove analysis state (to browser) initialized ---`
      );
    }
  }, [deletekdb]);

  // compute feature set scores
  useEffect(() => {
    if (selectedFsetCluster !== null && fsetClusterRank !== null) {
      if (selectedFsetVSCluster !== null && selectedFsetCluster !== null) {
        scranWorker.postMessage({
          type: "computeFeaturesetVSSummary",
          payload: {
            left: selectedFsetCluster,
            right: selectedFsetVSCluster,
            rank_type: fsetClusterRank,
            annotation: selectedFsetAnnotation,
          },
        });
        add_to_logs("info", `--- computeFeaturesetVSSummary sent ---`);
      } else if (selectedFsetCluster !== null) {
        scranWorker.postMessage({
          type: "computeFeaturesetSummary",
          payload: {
            cluster: selectedFsetCluster,
            rank_type: fsetClusterRank,
            annotation: selectedFsetAnnotation,
          },
        });
        add_to_logs("info", `--- computeFeaturesetSummary sent ---`);
      }
    }
  }, [
    selectedFsetAnnotation,
    selectedFsetCluster,
    fsetClusterRank,
    selectedFsetVSCluster,
  ]);

  // get feature score for a set
  useEffect(() => {
    if (
      reqFsetIndex != null &&
      selectedFsetCluster != null &&
      selectedFsetAnnotation !== null
    ) {
      scranWorker.postMessage({
        type: "getFeatureScores",
        payload: {
          index: reqFsetIndex,
          annotation: selectedFsetAnnotation,
          cluster: selectedFsetCluster,
        },
      });

      add_to_logs(
        "info",
        `--- Request feature set cell score for feature index:${reqFsetIndex} sent ---`
      );
    }
  }, [reqFsetIndex, selectedFsetCluster, selectedFsetAnnotation]);

  // get feature gene indices for a set
  useEffect(() => {
    if (reqFsetGeneIndex != null && selectedFsetCluster != null) {
      scranWorker.postMessage({
        type: "getFeatureGeneIndices",
        payload: {
          index: reqFsetGeneIndex,
          cluster: selectedFsetCluster,
          annotation: selectedFsetAnnotation,
          modality: selectedFsetModality,
          rank_type: fsetClusterRank,
        },
      });

      add_to_logs(
        "info",
        `--- Request feature set gene indices for feature index:${reqFsetGeneIndex} sent ---`
      );
    }
  }, [reqFsetGeneIndex, selectedFsetCluster]);

  useEffect(() => {
    setGene(null);
    setSelectedFsetIndex(null);
  }, [markersORFSets]);

  // I want to try it out!!
  // autoload the ziesel dataset
  useEffect(() => {
    if (loadZiesel && wasmInitialized) {
      let files = {
        "dataset-1": {
          name: "dataset-1",
          format: "ExperimentHub",
          id: "zeisel-brain",
          options: {
            primaryRNAFeatureColumn: "id",
          },
        },
      };

      let options = {
        primaryRNAFeatureColumn: "id",
      };

      setShowPanel("results");

      setPreInputFiles({
        files: files,
        batch: null,
      });

      setInputFiles({
        batch: null,
        subset: null,
        files: files,
      });

      // Hard coding the response
      // so we do not have to time
      // the options request
      setPreInputOptionsStatus({ RNA: 21135 });
    }
  }, [loadZiesel, wasmInitialized]);

  // use effects to sync between markers and gene set cluster selection
  // only sync from markers table if modality is "RNA"

  useEffect(() => {
    if (
      selectedModality === "RNA" &&
      markersORFSets === "markers" &&
      selectedClusterSummary.length > 0
    ) {
      if (selectedFsetCluster !== selectedCluster)
        setSelectedFsetCluster(selectedCluster);

      if (selectedCellAnnCluster !== selectedCluster) {
        setSelectedCellAnnCluster(selectedCluster);
      }
    }
  }, [selectedCluster]);

  useEffect(() => {
    if (selectedModality === "RNA" && markersORFSets === "featuresets") {
      if (selectedFsetCluster !== selectedCluster)
        setSelectedCluster(selectedFsetCluster);

      if (selectedFsetCluster !== selectedCellAnnCluster)
        setSelectedCellAnnCluster(selectedFsetCluster);
    }
  }, [selectedFsetCluster]);

  useEffect(() => {
    if (selectedModality === "RNA" && markersORFSets === "celltypeannotation") {
      if (selectedCellAnnCluster !== selectedFsetCluster)
        setSelectedFsetCluster(selectedCellAnnCluster);

      if (selectedCellAnnCluster !== selectedCluster)
        setSelectedCluster(selectedCellAnnCluster);
    }
  }, [selectedCellAnnCluster]);

  function add_to_logs(type, msg, status) {
    // let tmp = [...logs];
    let d = new Date();
    logs.push([type, d.toLocaleTimeString(), msg, status]);

    // setLogs(tmp);
  }

  scranWorker.onmessage = (msg) => {
    const payload = msg.data;

    console.log("ON MAIN::RCV::", payload);

    // process any error messages
    if (payload) {
      if (payload.type.toLowerCase().endsWith("start")) {
        add_to_logs(
          "start",
          payload.type.toLowerCase().replace("_start", ""),
          "started"
        );
      } else if (payload.type.indexOf("_store") !== -1) {
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
    } else if (type === "KanaDB") {
      setIndexedDBState(false);
    } else if (type === "KanaDB_store") {
      if (resp !== undefined) {
        setKanaIDBRecs(resp);
      }
      setIndexedDBState(false);
    } else if (type === "ExperimentHub_store") {
      if (resp !== undefined && Array.isArray(resp)) {
        setEhubDatasets(resp);
      }
    } else if (type === "feature_set_enrichment_store") {
      if (resp !== undefined) {
        setFsetEnrichCollections(resp.collections);
      }
    } else if (type === "PREFLIGHT_INPUT_DATA") {
      if (resp.details) {
        setPreInputFilesStatus(resp.details);
      }
    } else if (type === "PREFLIGHT_OPTIONS_DATA") {
      if (resp) {
        setPreInputOptionsStatus(resp);
      }
    } else if (type === "inputs_DATA") {
      var info = [];
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
        setAnnotationCols(resp.annotations);
      }

      let pmods = Object.keys(resp.genes);
      setModality(pmods);

      if (selectedModality === null) {
        setSelectedModality(pmods[0]);
      }
    } else if (type === "rna_quality_control_DATA") {
      if (!resp) {
        setQcData(null);
        setShowQCLoader(false);
      } else {
        let ranges = {},
          data = resp["data"],
          all = {};

        let t_annots = { ...annotationCols };

        for (const [group, gvals] of Object.entries(data)) {
          for (const [key, val] of Object.entries(gvals)) {
            if (!all[key]) all[key] = [Infinity, -Infinity];
            let [min, max] = getMinMax(val);
            if (min < all[key][0]) all[key][0] = min;
            if (max > all[key][1]) all[key][1] = max;

            if (
              Object.keys(t_annots).indexOf(`${code}::QC::RNA_${key}`) === -1
            ) {
              t_annots[`${code}::QC::RNA_${key}`] = {
                name: `${code}::QC::RNA_${key}`,
                truncated: true,
                type: "continuous",
              };
            }
          }
          ranges[group] = all;
        }

        setAnnotationCols(t_annots);

        resp["ranges"] = ranges;
        setQcData(resp);
        setShowQCLoader(false);
      }
    } else if (type === "adt_quality_control_DATA") {
      if (resp) {
        let ranges = {},
          data = resp["data"],
          all = {};

        let t_annots = { ...annotationCols };

        for (const [group, gvals] of Object.entries(data)) {
          for (const [key, val] of Object.entries(gvals)) {
            if (!all[key]) all[key] = [Infinity, -Infinity];
            let [min, max] = getMinMax(val);
            if (min < all[key][0]) all[key][0] = min;
            if (max > all[key][1]) all[key][1] = max;

            if (
              Object.keys(t_annots).indexOf(`${code}::QC::ADT_${key}`) === -1
            ) {
              t_annots[`${code}::QC::ADT_${key}`] = {
                name: `${code}::QC::ADT_${key}`,
                truncated: true,
                type: "continuous",
              };
            }
          }
          ranges[group] = all;
        }

        setAnnotationCols(t_annots);

        resp["ranges"] = ranges;

        let prevQC = { ...qcData };
        for (const key in data) {
          prevQC["data"][`adt_${key}`] = data[key];
          let tval = resp["thresholds"][key];
          if (key === "sums") {
            tval = null;
          }
          prevQC["thresholds"][`adt_${key}`] = tval;
          prevQC["ranges"][`adt_${key}`] = ranges[key];
        }

        setQcData(prevQC);
      }
      setShowQCLoader(false);
    } else if (type === "crispr_quality_control_DATA") {
      if (resp) {
        var ranges = {},
          data = resp["data"],
          all = {};

        let t_annots = { ...annotationCols };

        for (const [group, gvals] of Object.entries(data)) {
          for (const [key, val] of Object.entries(gvals)) {
            if (!all[key]) all[key] = [Infinity, -Infinity];
            let [min, max] = getMinMax(val);
            if (min < all[key][0]) all[key][0] = min;
            if (max > all[key][1]) all[key][1] = max;

            if (
              Object.keys(t_annots).indexOf(`${code}::QC::CRISPR${key}`) === -1
            ) {
              t_annots[`${code}::QC::CRISPR_${key}`] = {
                name: `${code}::QC::CRISPR_${key}`,
                truncated: true,
                type: "continuous",
              };
            }
          }
          ranges[group] = all;
        }

        setAnnotationCols(t_annots);

        resp["ranges"] = ranges;

        let prevQC = { ...qcData };
        for (const key in data) {
          prevQC["data"][`crispr_${key}`] = data[key];
          let tval = resp["thresholds"][key];
          if (key === "sums") {
            tval = null;
          }
          prevQC["thresholds"][`crispr_${key}`] = tval;
          prevQC["ranges"][`crispr_${key}`] = ranges[key];
        }

        setQcData(prevQC);
      }
      setShowQCLoader(false);
    } else if (type === "cell_filtering_DATA") {
      setQcDims(`${resp.retained}`);
      setCellSubsetData(resp.subset);

      for (let key in annotationObj) {
        if (
          key.startsWith(code) &&
          (key.indexOf("RNA") !== -1 || key.indexOf("ADT") !== -1)
        ) {
          annotationObj[key]["values"] = annotationObj[key]["values"].filter(
            (_, i) => payload.resp.subset[i] === 0
          );
        }
      }
    } else if (type === "feature_selection_DATA") {
      setFSelectionData(resp);
    } else if (type === "rna_pca_DATA") {
      setPcaVarExp({ ...pcaVarExp, RNA: resp["var_exp"] });
      setShowPCALoader(false);
    } else if (type === "adt_pca_DATA") {
      setPcaVarExp({ ...pcaVarExp, ADT: resp["var_exp"] });
      setShowPCALoader(false);
    } else if (type === "crispr_pca_DATA") {
      setPcaVarExp({ ...pcaVarExp, CRISPR: resp["var_exp"] });
      setShowPCALoader(false);
    } else if (
      type === "rna_pca_CACHE" ||
      type === "adt_pca_CACHE" ||
      type === "crispr_pca_CACHE"
    ) {
      setShowPCALoader(false);
    } else if (type === "choose_clustering_DATA") {
      let t_annots = { ...annotationCols };
      if (Object.keys(t_annots).indexOf(default_cluster) === -1) {
        t_annots[default_cluster] = {
          name: default_cluster,
          truncated: false,
          type: "continuous",
        };
        setAnnotationCols(t_annots);
      }

      // identify colors for computed clusters
      let cluster_count = getMinMax(resp?.clusters)[1] + 1;
      if (customSelection) {
        cluster_count += Object.keys(customSelection).length;
      }
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

      // add clusters to annotations
      let t_annoObj = { ...annotationObj };
      t_annoObj[default_cluster] = resp.clusters;
      setAnnotationObj(t_annoObj);

      setSelectedMarkerAnnotation(default_cluster);
      setShowNClusLoader(false);
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
    } else if (type === "tsne_DATA") {
      // once t-SNE is available, set this as the default display
      if (selectedRedDim === null) {
        setSelectedRedDim("TSNE");
      }

      let tmpDims = { ...redDimsData };
      tmpDims["TSNE"] = resp;
      setRedDimsData(tmpDims);

      // hide game and all loaders
      // setShowGame(false);
      setShowAnimation(false);
      setTriggerAnimation(false);
      setShowDimPlotLoader(false);
    } else if (type === "umap_DATA") {
      // once UMAP is available, set this as the default display
      if (selectedRedDim === null) {
        setSelectedRedDim("UMAP");
      }

      let tmpDims = { ...redDimsData };
      tmpDims["UMAP"] = resp;
      setRedDimsData(tmpDims);

      // hide game and all loaders
      // setShowGame(false);
      setShowAnimation(false);
      setTriggerAnimation(false);
      setShowDimPlotLoader(false);
    } else if (type === "tsne_iter" || type === "umap_iter") {
      setAnimateData(payload);
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
      if (selectedClusterSummary) {
        let tmp = [...selectedClusterSummary];
        tmp[selectedClusterIndex[resp.gene]].expr = Object.values(resp.expr);
        setSelectedClusterSummary(tmp);
      }
      setReqGene(null);
    } else if (type === "setAnnotation") {
      let tmp = { ...annotationObj };
      tmp[resp.annotation] = resp.values;
      setAnnotationObj(tmp);

      setReqAnnotation(null);
    } else if (type === "cell_labelling_DATA") {
      if ("integrated" in resp) {
        setCellLabelData(resp);
      }
      setShowCellLabelLoader(false);
    } else if (type === "custom_selections_DATA") {
    } else if (type === "tsne_CACHE" || payload.type === "umap_CACHE") {
      setShowDimPlotLoader(false);
    } else if (type === "marker_detection_CACHE") {
      setShowMarkerLoader(false);
    } else if (type === "quality_control_CACHE") {
      setShowQCLoader(false);
    } else if (type === "pca_CACHE") {
      setShowPCALoader(false);
    } else if (type === "choose_clustering_CACHE") {
      setShowNClusLoader(false);
    } else if (type === "cell_labelling_CACHE") {
      setShowCellLabelLoader(false);
    } else if (type === "loadedParameters") {
      setParams(resp.parameters);
      setLoadParams(resp.parameters);

      if (resp.other.custom_selections) {
        let cluster_count =
          clusterColors.length +
          Object.keys(resp.other.custom_selections).length;
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

        setCustomSelection(resp.other.custom_selections);
      }

      setTimeout(() => {
        setInitLoadState(false);
      }, 1000);
    } else if (type === "exportState") {
      let tmpLink = document.createElement("a");
      let fileNew = new Blob([resp], {
        type: "text/plain",
      });
      tmpLink.href = URL.createObjectURL(fileNew);
      tmpLink.download = datasetName.split(" ").join("_") + "_parameters.zip";
      tmpLink.click();

      setExportState(false);
    } else if (type === "exportRDSState") {
      let tmpLink = document.createElement("a");
      let fileNew = new Blob([resp], {
        type: "text/plain",
      });
      tmpLink.href = URL.createObjectURL(fileNew);
      tmpLink.download = datasetName.split(" ").join("_") + "_results.zip";
      tmpLink.click();

      setExportState(false);
    } else if (type === "KanaDB") {
      setIndexedDBState(false);
    } else if (type === "feature_set_enrichment_START") {
      setShowFsetLoader(true);
    } else if (type === "feature_set_enrichment_CACHE") {
      setShowFsetLoader(false);
    } else if (type === "feature_set_enrichment_DATA") {
      setFsetEnrichDetails(resp);
      setShowFsetLoader(false);
    } else if (
      type === "computeFeaturesetSummary_DATA" ||
      type === "computeFeaturesetVSSummary_DATA"
    ) {
      let tmpsumm = { ...fsetEnirchSummary };
      tmpsumm[
        `${selectedFsetAnnotation}-${selectedFsetCluster}-${fsetClusterRank}`
      ] = resp;
      setFsetEnrichSummary(tmpsumm);

      let idMax = getMinMax(resp.set_ids);
      setFeatureScoreCache(new Array(idMax[1]));
      setFsetGeneIndxCache(new Array(idMax[1]));
    } else if (type === "setFeatureScores_DATA") {
      let tmp = [...featureScoreCache];
      tmp[reqFsetIndex] = resp;

      setFeatureScoreCache(tmp);
      setReqFsetIndex(null);
    } else if (type === "setFeatureGeneIndices_DATA") {
      let tmp = [...fsetGeneIndxCache];
      tmp[reqFsetGeneIndex] = resp;

      setFsetGeneIndxCache(tmp);
      setReqFsetGeneIndex(null);
    } else {
      console.info("unknown msg type", payload);
    }
  };

  // resize managers for window width
  const [windowWidth, setWindowWidth] = useState(0);

  // resize markers width
  const [markersWidth, setMarkersWidth] = useState(360);

  // resize fset width
  const [fsetWidth, setFsetWidth] = useState(360);

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
            <div
              style={{ cursor: "pointer" }}
              onClick={() => {
                setAppMode(null);
              }}
            >
              <img height="20px" src={logo} alt="Kana"></img>{" "}
              <span
                style={{
                  fontSize: "8px",
                }}
              >
                v{pkgVersion.version}
              </span>
            </div>
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
                showPanel === "new" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Start a new analysis"
                minimal={false}
                placement={"right"}
                intent={showPanel === "new" ? "primary" : ""}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"folder-new"}
                    onClick={() => setShowPanel("new")}
                    intent={showPanel === "new" ? "primary" : "none"}
                  ></Button>
                  <span
                    onClick={() => setShowPanel("new")}
                    style={{
                      cursor: "pointer",
                      color: showPanel === "new" ? "#184A90" : "black",
                    }}
                  >
                    NEW
                  </span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div
              className={
                showPanel === "load" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Load a saved analysis"
                minimal={false}
                placement={"right"}
                intent={showPanel === "load" ? "primary" : ""}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"archive"}
                    onClick={() => setShowPanel("load")}
                    intent={showPanel === "load" ? "primary" : "none"}
                  ></Button>
                  <span
                    onClick={() => setShowPanel("load")}
                    style={{
                      cursor: "pointer",
                      color: showPanel === "load" ? "#184A90" : "black",
                    }}
                  >
                    LOAD
                  </span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div className="item-sidebar">
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Save analysis!"
                minimal={false}
                placement={"right"}
                intent={showPanel === "save" ? "primary" : "none"}
              >
                <div className="item-button-group">
                  <Popover2
                    content={
                      <Menu>
                        <MenuItem
                          text="Save analysis parameters (to browser)"
                          icon="floppy-disk"
                          disabled={selectedRedDim === null}
                          onClick={() => {
                            setIndexedDBState(true);
                          }}
                        />
                        <Divider />
                        <MenuItem
                          text="Download analysis parameters"
                          icon="download"
                          disabled={selectedRedDim === null}
                          onClick={() => {
                            setExportState(true);
                          }}
                        />
                        <MenuItem
                          text="Download analysis results (as ZIP)"
                          icon="download"
                          disabled={selectedRedDim === null}
                          onClick={() => {
                            setExportRDSState(true);
                          }}
                        />
                      </Menu>
                    }
                    placement="right"
                  >
                    <div className="item-button-group">
                      <Button
                        outlined={false}
                        large={false}
                        minimal={true}
                        fill={true}
                        icon={"floppy-disk"}
                        intent={showPanel === "save" ? "primary" : "none"}
                      ></Button>
                      <span
                        style={{
                          cursor: "pointer",
                          color: showPanel === "save" ? "#184A90" : "black",
                        }}
                      >
                        SAVE
                      </span>
                    </div>
                  </Popover2>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div
              className={
                showPanel === "params" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Update or modify analysis parameters!"
                minimal={false}
                placement={"right"}
                intent={showPanel === "params" ? "primary" : "none"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"derive-column"}
                    onClick={() => setShowPanel("params")}
                    intent={showPanel === "params" ? "primary" : "none"}
                  ></Button>
                  <span
                    onClick={() => setShowPanel("params")}
                    style={{
                      cursor: "pointer",
                      color: showPanel === "params" ? "#184A90" : "black",
                    }}
                  >
                    PARAMS
                  </span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            {selectedRedDim !== null && (
              <>
                <div
                  className={
                    showPanel === "results"
                      ? "item-sidebar-intent"
                      : "item-sidebar"
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
                    intent={showPanel === "results" ? "primary" : ""}
                  >
                    <div className="item-button-group">
                      <Button
                        outlined={false}
                        large={false}
                        minimal={true}
                        fill={true}
                        icon={"rocket-slant"}
                        disabled={selectedRedDim === null}
                        onClick={() => setShowPanel("results")}
                        intent={showPanel === "results" ? "primary" : "none"}
                      ></Button>
                      <span
                        onClick={() => setShowPanel("results")}
                        style={{
                          cursor: "pointer",
                          color: showPanel === "results" ? "#184A90" : "black",
                        }}
                      >
                        RESULTS
                      </span>
                    </div>
                  </Tooltip2>
                </div>
                <Divider />
              </>
            )}
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
                  {(inputFiles?.files === null && loadFiles?.files === null) ||
                  stateIndeterminate ? (
                    <Button
                      outlined={false}
                      large={false}
                      minimal={true}
                      fill={true}
                      icon={"console"}
                      onClick={() => setShowLogs(true)}
                      intent={showPanel === "logs" ? "primary" : "none"}
                    ></Button>
                  ) : !showPCALoader &&
                    !showNClusLoader &&
                    !showMarkerLoader &&
                    !showCellLabelLoader &&
                    !showDimPlotLoader ? (
                    <Button
                      outlined={false}
                      large={false}
                      minimal={true}
                      fill={true}
                      icon={"console"}
                      onClick={() => setShowLogs(true)}
                      intent={showPanel === "logs" ? "primary" : "none"}
                    ></Button>
                  ) : (
                    <Button
                      outlined={false}
                      large={false}
                      minimal={true}
                      fill={true}
                      onClick={() => setShowLogs(true)}
                      intent={showPanel === "logs" ? "primary" : "none"}
                    >
                      <div style={{ display: "flex" }}>
                        <Spinner size={20} intent="warning" />
                      </div>
                    </Button>
                  )}

                  <span
                    onClick={() => setShowLogs(true)}
                    style={{
                      cursor: "pointer",
                      color: showPanel === "logs" ? "#184A90" : "black",
                    }}
                  >
                    LOGS
                  </span>
                </div>
              </Tooltip2>
            </div>
            {/* <Divider /> */}
          </div>
          <div className="left-sidebar-content-flex-bottom">
            {/* <Divider />
            <div className="item-sidebar">
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Wanna know more about Kana?"
                minimal={false}
                placement={"right"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"info-sign"}
                  ></Button>
                  <span>INFO</span>
                </div>
              </Tooltip2>
            </div>
            <Divider /> */}
            <div className="item-sidebar">
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="View source code"
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
                    onClick={() =>
                      window.open("https://github.com/kanaverse/kana", "_blank")
                    }
                  ></Button>
                  <span
                    onClick={() =>
                      window.open("https://github.com/kanaverse/kana", "_blank")
                    }
                    style={{
                      cursor: "pointer",
                    }}
                  >
                    GITHUB
                  </span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
          </div>
        </div>
        <div className="App-body">
          {showPanel === "new" && (
            <NewAnalysis
              setShowPanel={setShowPanel}
              setStateIndeterminate={setStateIndeterminate}
            />
          )}
          {showPanel === "params" && (
            <ParameterSelection
              setShowPanel={setShowPanel}
              setStateIndeterminate={setStateIndeterminate}
            />
          )}
          {showPanel === "results" && (
            <ResizeSensor onResize={handleResize}>
              <SplitPane
                defaultSize={windowWidth >= 1200 ? 300 : 275}
                split={windowWidth >= 1200 ? "vertical" : "horizontal"}
                primary="second"
                allowResize={false}
              >
                <SplitPane
                  defaultSize={
                    markersORFSets === "markers" ? markersWidth : fsetWidth
                  }
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
                        selectedFsetIndex={selectedFsetIndex}
                        setSelectedFsetIndex={setSelectedFsetIndex}
                        featureScoreCache={featureScoreCache}
                        fsetEnirchDetails={fsetEnirchDetails}
                        selectedDimPlotCluster={selectedDimPlotCluster}
                        setSelectedDimPlotCluster={setSelectedDimPlotCluster}
                      />
                    )}
                  </div>
                  {markersORFSets === "celltypeannotation" && (
                    <div
                      className={
                        showMarkerLoader
                          ? "results-celltype effect-opacitygrayscale"
                          : "results-celltype"
                      }
                    >
                      {annotationObj[default_cluster] && (
                        <CellAnnotation
                          markersORFSets={markersORFSets}
                          setMarkersOrFsets={setMarkersOrFsets}
                          selectedClusterSummary={selectedClusterSummary}
                          cellLabelData={cellLabelData}
                          windowWidth={windowWidth}
                          selectedCellAnnCluster={selectedCellAnnCluster}
                          setSelectedCellAnnCluster={setSelectedCellAnnCluster}
                        />
                      )}
                    </div>
                  )}
                  {markersORFSets === "markers" && (
                    <div
                      className={
                        showMarkerLoader
                          ? "results-markers effect-opacitygrayscale"
                          : "results-markers"
                      }
                    >
                      {selectedMarkerAnnotation &&
                        annotationObj[default_cluster] &&
                        selectedClusterSummary && (
                          <MarkerPlot
                            selectedClusterSummary={selectedClusterSummary}
                            setSelectedClusterSummary={
                              setSelectedClusterSummary
                            }
                            selectedClusterIndex={selectedClusterIndex}
                            selectedCluster={selectedCluster}
                            setSelectedCluster={setSelectedCluster}
                            selectedVSCluster={selectedVSCluster}
                            setSelectedVSCluster={setSelectedVSCluster}
                            setClusterRank={setClusterRank}
                            clusterRank={clusterRank}
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
                            setReqAnnotation={setReqAnnotation}
                            selectedMarkerAnnotation={selectedMarkerAnnotation}
                            setSelectedMarkerAnnotation={
                              setSelectedMarkerAnnotation
                            }
                            setMarkersOrFsets={setMarkersOrFsets}
                            markersORFSets={markersORFSets}
                            cellLabelData={cellLabelData}
                          />
                        )}
                    </div>
                  )}
                  {markersORFSets === "featuresets" && (
                    <div
                      className={
                        showFsetLoader
                          ? "results-fsetenrich effect-opacitygrayscale"
                          : "results-fsetenrich"
                      }
                    >
                      {fsetEnirchDetails && (
                        <FeatureSetEnrichment
                          setMarkersOrFsets={setMarkersOrFsets}
                          markersORFSets={markersORFSets}
                          fsetClusterRank={fsetClusterRank}
                          setFsetClusterRank={setFsetClusterRank}
                          fsetEnirchDetails={fsetEnirchDetails}
                          featureScores={featureScores}
                          setFeatureScores={setFeatureScores}
                          selectedFsetCluster={selectedFsetCluster}
                          setSelectedFsetCluster={setSelectedFsetCluster}
                          selectedFsetAnnotation={selectedFsetAnnotation}
                          setSelectedFsetAnnotation={setSelectedFsetAnnotation}
                          fsetEnirchSummary={fsetEnirchSummary}
                          setFsetWidth={setFsetWidth}
                          fsetWidth={fsetWidth}
                          windowWidth={windowWidth}
                          selectedFsetIndex={selectedFsetIndex}
                          setSelectedFsetIndex={setSelectedFsetIndex}
                          setReqFsetIndex={setReqFsetIndex}
                          featureScoreCache={featureScoreCache}
                          reqFsetGeneIndex={reqFsetGeneIndex}
                          setReqFsetGeneIndex={setReqFsetGeneIndex}
                          featureSetGeneIndex={featureSetGeneIndex}
                          setFeatureSetGeneIndex={setFeatureSetGeneIndex}
                          fsetGeneIndxCache={fsetGeneIndxCache}
                          setGene={setGene}
                          gene={gene}
                          setReqGene={setReqGene}
                          selectedFsetVSCluster={selectedFsetVSCluster}
                          setSelectedFsetVSCluster={setSelectedFsetVSCluster}
                          customSelection={customSelection}
                          setReqAnnotation={setReqAnnotation}
                          selectedFsetModality={selectedFsetModality}
                          cellLabelData={cellLabelData}
                        />
                      )}
                    </div>
                  )}
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
                    selectedDimPlotCluster={selectedDimPlotCluster}
                  />
                </div>
              </SplitPane>
            </ResizeSensor>
          )}
          {(showPanel === null || showPanel === undefined) && (
            <div className="frontpage">
              <div style={{ textAlign: "left", alignItems: "flex-start" }}>
                <H3>Lost all the windows eh?</H3>
                <p>
                  My boss told me I can't start an app with an empty screen. So
                  here goes nothing...
                </p>
              </div>
              <div className="frontpage-row">
                <Callout
                  title="Start a new analysis"
                  onClick={() => setShowPanel("new")}
                  className="frontpage-rowitem"
                  icon="plus"
                  intent="primary"
                  style={{ cursor: "pointer" }}
                >
                  <p>
                    Analyze one or more datasets in a variety of supported
                    formats (Matrix Market, H5AD, RDS). Get started now!
                  </p>
                </Callout>
                <Callout
                  title="Wanna tryout Kana?"
                  onClick={() => {
                    setLoadZiesel(true);
                  }}
                  className="frontpage-rowitem"
                  icon="random"
                  intent="warning"
                >
                  <p>
                    Analyze the zeisel dataset from ExperimentHub to checkout
                    how Kana works!
                  </p>
                </Callout>
              </div>
            </div>
          )}
          {showPanel === "load" && (
            <LoadAnalysis
              setShowPanel={setShowPanel}
              setStateIndeterminate={setStateIndeterminate}
              kanaIDBRecs={kanaIDBRecs}
              setDeletekdb={setDeletekdb}
            />
          )}
        </div>
      </SplitPane>
      <Alert
        canEscapeKeyCancel={false}
        canOutsideClickCancel={false}
        confirmButtonText={scranError?.fatal ? "Reload App" : "close"}
        icon="bug"
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
