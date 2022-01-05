import React, { createContext, useEffect, useState } from "react";
import { AppToaster } from "../components/Spinners/AppToaster";

export const AppContext = createContext(null);

const AppContextProvider = ({ children }) => {
  // Input State
  const [inputFiles, setInputFiles] = useState({
    format: null,
    files: null
  });

  // default params 
  const [params, setParams] = useState({
    qc: {
      "qc-nmads": 3
    },
    fSelection: {
      "fsel-span": 0.3
    },
    pca: {
      "pca-npc": 5,
      "pca-hvg": 4000,
    },
    cluster: {
      "clus-k": 10,
      "clus-res": 0.5,
      "clus-scheme": 0,
      "clus-approx": true,
      "clus-method": "snn_graph",
    },
    tsne: {
      "tsne-iter": 500,
      "tsne-perp": 30,
      "animate": true,
    },
    umap: {
      "umap-nn": 15,
      "umap-epochs": 500,
      "umap-min_dist": 0.01,
      "animate": false,
    },
    markerGene: {}
  });

  // app open inputs
  const [openInput, setOpenInput] = useState(false);
  // show in-app game ?
  const [showGame, setShowGame] = useState(false);
  // which tab is selected ? defaults to new
  const [tabSelected, setTabSelected] = useState("new");
  // params from worker for stored analysis (kana file)
  const [loadParams, setLoadParams] = useState(null);

  // creates a default dataset name
  const [datasetName, setDatasetName] = useState("kana-" + String(Date.now()).slice(0, 8));

  // app export state 
  const [exportState, setExportState] = useState(false);

  // wasm state and error 
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Response State for various components
  // dim sizes
  const [initDims, setInitDims] = useState(null);
  const [qcDims, setQcDims] = useState(null);
  const [fSelDims, setFSelDims] = useState(null);

  // Gene details 
  const [genesInfo, setGenesInfo] = useState(null);

  // QC Data
  const [qcData, setQcData] = useState(null);
  const [qcThreshold, setQcThreshold] = useState(null);

  // Feature Selection
  const [fSelectionData, setFSelectionData] = useState(null);

  // UI dimensions reduction dropdown
  const [redDims, setRedDims] = useState([]);
  // which dimension is selected
  const [defaultRedDims, setDefaultRedDims] = useState(null);
  // the actual dimensions
  const [plotRedDims, setPlotRedDims] = useState(null);

  // Cluster Analysis
  // cluster assignments
  const [clusterData, setClusterData] = useState(null);
  // which cluster is selected
  const [selectedCluster, setSelectedCluster] = useState(null);
  // cohen, mean scores per gene
  const [selectedClusterSummary, setSelectedClusterSummary] = useState([]);
  // set cluster colors
  const [clusterColors, setClusterColors] = useState(null);
  // set Cluster rank-type
  const [clusterRank, setClusterRank] = useState(null);
  // custom selection on tsne plot
  const [customSelection, setCustomSelection] = useState({});
  // remove custom Selection
  const [delCustomSelection, setDelCustomSelection] = useState(null);

  // PCA
  const [pcaData, setPcaData] = useState(null);
  const [pcaVarExp, setPcaVarExp] = useState(null);

  // this applies to both tsne and umap
  // is animation in progress ?
  const [showAnimation, setShowAnimation] = useState(false);
  // if a user manually triggers an animation (using the play button)
  const [triggerAnimation, setTriggerAnimation] = useState(false);

  // TSNE
  const [tsneData, setTsneData] = useState(null);

  // UMAP
  const [umapData, setUmapData] = useState(null);

  // geneExpression
  // what gene is selected for scatterplot
  const [gene, setGene] = useState(null);
  // request gene expression
  const [reqGene, setReqGene] = useState(null);

  // Logs
  const [logs, setLogs] = useState([]);

  useEffect(() => {

    if (wasmInitialized && inputFiles.files != null) {
      if (tabSelected === "new") {
        window.Worker.postMessage({
          "type": "RUN",
          "payload": {
            "files": inputFiles,
            "params": params
          },
          "msg": "not much to pass"
        });
      } else if (tabSelected === "load") {
        if (loadParams !== null) {
          window.Worker.postMessage({
            "type": "LOAD",
            "payload": {
              "files": inputFiles,
              "params": params
            },
            "msg": "not much to pass"
          });
        } else {
          window.Worker.postMessage({
            "type": "IMPORT",
            "payload": {
              "files": inputFiles
            },
            "msg": "not much to pass"
          });
        }
      }

      // setShowGame(true);
    }
  }, [inputFiles, params, wasmInitialized]);

  useEffect(() => {

    if (exportState) {
      window.Worker.postMessage({
        "type": "EXPORT",
        "payload": {
          "files": inputFiles,
          "params": params
        },
        "msg": "not much to pass"
      });

      AppToaster.show({ icon:"download", intent: "primary", message: "Exporting analysis in the background" });
    } else {
      inputFiles?.files && AppToaster.show({ icon:"download", intent: "primary", message: "Analysis saved. Please check your downloads directory!" });
    }
  }, [exportState]);

  return (
    <AppContext.Provider
      value={{
        inputFiles, setInputFiles,
        params, setParams,
        error, setError,
        wasmInitialized, setWasmInitialized,
        pcaData, setPcaData,
        pcaVarExp, setPcaVarExp,
        tsneData, setTsneData,
        umapData, setUmapData,
        genesInfo, setGenesInfo,
        initDims, setInitDims,
        qcDims, setQcDims,
        qcData, setQcData,
        qcThreshold, setQcThreshold,
        fSelDims, setFSelDims,
        redDims, setRedDims,
        defaultRedDims, setDefaultRedDims,
        plotRedDims, setPlotRedDims,
        clusterData, setClusterData,
        fSelectionData, setFSelectionData,
        logs, setLogs,
        selectedCluster, setSelectedCluster,
        selectedClusterSummary, setSelectedClusterSummary,
        clusterRank, setClusterRank,
        gene, setGene,
        clusterColors, setClusterColors,
        reqGene, setReqGene,
        openInput, setOpenInput,
        customSelection, setCustomSelection,
        delCustomSelection, setDelCustomSelection,
        showGame, setShowGame,
        exportState, setExportState,
        datasetName, setDatasetName,
        tabSelected, setTabSelected,
        loadParams, setLoadParams,
        showAnimation, setShowAnimation,
        triggerAnimation, setTriggerAnimation
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
