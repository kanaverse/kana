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
    markerGene: {}
  });

  // which tab is selected ? defaults to new
  const [tabSelected, setTabSelected] = useState("new");
  // saved analysis in the browser's indexeddb
  const [kanaIDBRecs, setKanaIDBRecs] = useState([]);
    // delete rec in database
  const [deletekdb, setDeletekdb] = useState(null);
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

  // Response State for various components

  // Gene details 
  const [genesInfo, setGenesInfo] = useState(null);
  // default column to show in markers table
  const [geneColSel, setGeneColSel] = useState("id");

  // Cluster Analysis
  // cluster assignments
  const [clusterData, setClusterData] = useState(null);
  // set cluster colors
  const [clusterColors, setClusterColors] = useState(null);
  // custom selection on tsne plot
  const [customSelection, setCustomSelection] = useState({});
  // remove custom Selection
  const [delCustomSelection, setDelCustomSelection] = useState(null);

  // geneExpression
  // what gene is selected for scatterplot
  const [gene, setGene] = useState(null);
  // request gene expression
  const [reqGene, setReqGene] = useState(null);

  // ImageData user saves while exploring
  const [savedPlot, setSavedPlot] = useState([]);

  useEffect(() => {

    if (wasmInitialized && inputFiles.files != null && !initLoadState) {
      if (tabSelected === "new") {
        window.scranWorker.postMessage({
          "type": "RUN",
          "payload": {
            "files": inputFiles,
            "params": params
          },
          "msg": "not much to pass"
        });
      } else if (tabSelected === "load") {
        if (loadParams == null || inputFiles?.reset) {
          window.scranWorker.postMessage({
            "type": "LOAD",
            "payload": {
              "files": inputFiles
            },
            "msg": "not much to pass"
          });
        } else {
          window.scranWorker.postMessage({
            "type": "RUN",
            "payload": {
              "files": inputFiles,
              "params": params
            },
            "msg": "not much to pass"
          });
        }
        setInitLoadState(true);
      }
    }
  }, [inputFiles, params, wasmInitialized]);

  useEffect(() => {

    if (exportState) {
      window.scranWorker.postMessage({
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

  useEffect(() => {

    if (indexedDBState) {
      window.scranWorker.postMessage({
        "type": "SAVEKDB",
        "payload": {
          "title": datasetName,
        },
        "msg": "not much to pass"
      });

      AppToaster.show({ icon:"floppy-disk", intent: "primary", message: "Saving analysis in the background. Note: analysis is saved within the browser!!" });
    } else {
      inputFiles?.files && AppToaster.show({ icon:"floppy-disk", intent: "primary", message: "Analysis saved!" });
    }
  }, [indexedDBState]);

  useEffect(() => {

    if (deletekdb) {
      window.scranWorker.postMessage({
        "type": "REMOVEKDB",
        "payload": {
          "id": deletekdb,
        },
        "msg": "not much to pass"
      });

      AppToaster.show({ icon: "floppy-disk", intent: "danger", message: "Deleting Analysis in the background" });
    }
  }, [deletekdb]);

  return (
    <AppContext.Provider
      value={{
        inputFiles, setInputFiles,
        params, setParams,
        error, setError,
        wasmInitialized, setWasmInitialized,
        genesInfo, setGenesInfo,
        clusterData, setClusterData,
        gene, setGene,
        clusterColors, setClusterColors,
        reqGene, setReqGene,
        customSelection, setCustomSelection,
        delCustomSelection, setDelCustomSelection,
        datasetName, setDatasetName,
        tabSelected, setTabSelected,
        loadParams, setLoadParams,
        savedPlot, setSavedPlot,
        geneColSel, setGeneColSel,
        kanaIDBRecs, setKanaIDBRecs,
        initLoadState, setInitLoadState,
        loadParamsFor, setLoadParamsFor,
        deletekdb, setDeletekdb
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default React.memo(AppContextProvider);
