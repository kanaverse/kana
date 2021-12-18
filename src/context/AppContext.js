import React, { createContext, useEffect, useState } from "react";

export const AppContext = createContext(null);

const AppContextProvider = ({ children }) => {
  // Input State
  const [inputFiles, setInputFiles] = useState({
    gene: null,
    mtx: null,
    barcode: null,
  });

  const [params, setParams] = useState({
    qc: {
      "qc-nmads": 3
    },
    fSelection: {
      "fsel-span": 0.3
    },
    pca: {
      "pca-npc": 5
    },
    cluster: {
      "clus-k": 10,
      "clus-res": 0.5,
      "clus-scheme": 0,
    },
    tsne: {
      "tsne-iter": 500,
      "tsne-perp": 30,
    },
    umap: {
      "umap-nn": 15,
      "umap-epochs": 500,
      "umap-min_dist": 0.01,
      "umap-approx_nn": true,
    },
    markerGene: {}
  });

  // wasm state and error 
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Response State for various components
  // dim sizes
  const [initDims, setInitDims] = useState(null);
  const [qcDims, setQcDims] = useState(null);
  const [fSelDims, setFSelDims] = useState(null);

  // QC Data
  const [qcData, setQcData] = useState(null);
  const [qcThreshold, setQcThreshold] = useState(null);

  // Feature Selection
  const [fSelectionData, setFSelectionData] = useState(null);

  // UI dimensions reduction dropdown
  const [redDims, setRedDims] = useState([]);
  const [defaultRedDims, setDefaultRedDims] = useState(null);
  const [plotRedDims, setPlotRedDims] = useState(null);

  // Cluster Analysis
  const [clusterData, setClusterData] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [selectedClusterSummary, setSelectedClusterSummary] = useState(null);

  // PCA
  const [pcaData, setPcaData] = useState(null);
  const [pcaVarExp, setPcaVarExp] = useState(null);

  // TSNE
  const [tsneData, setTsneData] = useState(null);

  // UMAP
  const [umapData, setUmapData] = useState(null);

  // Logs
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // console.log("something changed");

    console.log("in Context", inputFiles, params, wasmInitialized);
    if (wasmInitialized && inputFiles.mtx != null) {
      window.Worker.postMessage({
        "type": "RUN",
        "payload": {
          "files": [inputFiles.mtx,
          inputFiles.barcode ? inputFiles.barcode[0] : [],
          inputFiles.gene ? inputFiles.gene[0] : []], //mtx, barcode, gene
          "params": params
        },
        "msg": "not much to pass"
      });
    }
  }, [inputFiles, params, wasmInitialized]);

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
        selectedClusterSummary, setSelectedClusterSummary
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
