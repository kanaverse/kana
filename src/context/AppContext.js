import React, { createContext, useEffect, useState } from "react";

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
      "qc-nmads": 3,
      "qc-usemitodefault": true,
      "qc-mito": "mt-"
    },
    fSelection: {
      "fsel-span": 0.3
    },
    pca: {
      "pca-npc": 25,
      "pca-hvg": 2500,
    },
    cluster: {
      "clus-k": 10,
      "kmeans-k": 10,
      "clus-res": 0.5,
      "clus-scheme": 0,
      "clus-approx": true,
      "clus-method": "snn_graph",
    },
    tsne: {
      "tsne-iter": 500,
      "tsne-perp": 30,
      "animate": false,
    },
    umap: {
      "umap-nn": 15,
      "umap-epochs": 500,
      "umap-min_dist": 0.01,
      "animate": false,
    },
    markerGene: {},
    annotateCells: {
      "annotateCells": false,
      // "annotateCells-species": "human",
      "annotateCells-human_references": [],
      "annotateCells-mouse_references": [],
    }
  });

  // which tab is selected ? defaults to new
  const [tabSelected, setTabSelected] = useState("new");
  // params from worker for stored analysis (kana file)
  const [loadParams, setLoadParams] = useState(null);
  // kana file or db ?
  const [loadParamsFor, setLoadParamsFor] = useState(null);

  // creates a default dataset name
  const [datasetName, setDatasetName] = useState("My Analysis Title");

  // app export state - params loading first time ?
  const [initLoadState, setInitLoadState] = useState(false);

  // wasm state and error 
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Response State for various components - these are state that are spread 
  // allover the app so its better they are at the context level
  // Gene details 
  const [genesInfo, setGenesInfo] = useState(null);
  // default column to show in markers table
  const [geneColSel, setGeneColSel] = useState("id");

  // all cell annotations available
  const [annotationCols, setAnnotationCols] = useState([]);
  const [annotationObj, setAnnotationObj] = useState({});

  return (
    <AppContext.Provider
      value={{
        inputFiles, setInputFiles,
        params, setParams,
        error, setError,
        wasmInitialized, setWasmInitialized,
        genesInfo, setGenesInfo,
        datasetName, setDatasetName,
        tabSelected, setTabSelected,
        loadParams, setLoadParams,
        geneColSel, setGeneColSel,
        initLoadState, setInitLoadState,
        loadParamsFor, setLoadParamsFor,
        annotationCols, setAnnotationCols,
        annotationObj, setAnnotationObj
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default React.memo(AppContextProvider);
