// import logo from './logo.svg';
import './App.css';
import Header from "./components/Header";
import Gallery from './components/Gallery';

import { Overlay, Spinner } from "@blueprintjs/core";

// import { workerComs } from './coms/WorkerComs.js';
import { useState, useEffect, useContext } from 'react';
import { AppContext } from './context/AppContext';

import DimPlot from './components/Plots/ScatterPlot.js';
// import Stats from './components/Stats';
import MarkerPlot from './components/Markers';
// import * as Comlink from 'comlink';
// import worker from "./scran/scranWorker";
// import WebWorker from "./scran/workerSetup";

function App() {

  const [loading, setLoading] = useState(true);
  const loadingProps = {
    autoFocus: true,
    canEscapeKeyClose: false,
    canOutsideClickClose: false,
    enforceFocus: true,
    hasBackdrop: true,
    usePortal: true,
    useTallContent: false,
  };

  const { setWasmInitialized, setTsneData, setRedDims, redDims,
    setInitDims, setQcDims, setFSelDims, defaultRedDims, setDefaultRedDims,
    setQcData, qcData, setClusterData, setFSelectionData,
    setUmapData, setPcaVarExp, logs, setLogs, 
    selectedCluster, setSelectedCluster,
    selectedClusterSummary, setSelectedClusterSummary,
    gene, setGeneExprData } = useContext(AppContext);

  useEffect(() => {
    console.log("calling init");
    window.Worker.postMessage({
      "type": "INIT",
      "msg": "Initial Load"
    });
  }, [])

  useEffect(() => {
    
    selectedCluster !== null && window.Worker.postMessage({
      "type": "getMarkersForCluster",
      "payload": {
        "cluster": selectedCluster
      }
    });
  }, [selectedCluster])

  useEffect(() => {
    
    gene !== null && window.Worker.postMessage({
      "type": "getGeneExpression",
      "payload": {
        "gene": gene
      }
    });
  }, [gene])

  // let worker = new Worker("./scran/scranWorker.js");
  var QCData = {};

  window.Worker.onmessage = (msg) => {
    const payload = msg.data;

    // console.log(msg);
    console.log(payload);

    if (payload?.msg) {
      let tmp = [...logs];
      let d = new Date();
      tmp.push(`${d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()} - ${payload?.type} - ${payload?.msg}`);

      setLogs(tmp);
    }

    if (payload.type === "INIT") {
      // TODO: need a timeout here so the screen doesn't flicker
      setLoading(false);
      setWasmInitialized(true);
    } else if (payload.type === "input_DIMS") {
      setInitDims(payload.resp);
    } else if (payload.type === "quality_control_filtered_DIMS") {
      setQcDims(payload.resp);
    } else if (payload.type === "quality_control_metrics_DATA") {
      const { type, resp } = payload;
      QCData = resp;
      setQcData(resp);
    } else if (payload.type === "quality_control_thresholds_DATA") {
      const { type, resp } = payload;
      qcData["thresholds"] = resp;
      setQcData(qcData);
    } else if (payload.type === "feature_selection_DIMS") {
      // setFSelDims(payload.resp);
    } else if (payload.type === "feature_selection_DATA") {
      const { type, resp } = payload;
      console.log(type, resp);
      setFSelectionData(resp);
    } else if (payload.type === "pca_DATA") {
      const { type, resp } = payload;
      console.log(type, resp);
      let tmp = [...redDims];
      tmp.push("PCA");
      setRedDims(tmp);
      setPcaVarExp(resp);
      // setTsneData(resp);
    } else if (payload.type === "snn_cluster_graph_DATA") {
      const { type, resp } = payload;
      console.log(type, resp);
      setClusterData(resp);
    } else if (payload.type === "tsne_DATA" || payload.type === "tsne_iter") {
      const { type, resp } = payload;
      console.log(type, resp);
      setTsneData(resp);
      let tmp = [...redDims];
      tmp.push("TSNE");
      if (!defaultRedDims) {
        setDefaultRedDims("TSNE");
      }
      setRedDims(tmp);
    } else if (payload.type === "umap_DATA") {
      const { type, resp } = payload;
      console.log(type, resp);
      setUmapData(resp);
      let tmp = [...redDims];
      tmp.push("UMAP");
      setRedDims(tmp);
    } else if (payload.type === "markerGene_DATA") {
      const { type, resp } = payload;
      console.log(type, resp);
    } else if (payload.type === "setMarkersForCluster") {
      const { type, resp } = payload;
      console.log(type, resp);
      setSelectedClusterSummary(resp);
    } else if (payload.type === "setGeneExpression") {
      const { type, resp } = payload;
      console.log(type, resp);
      setGeneExprData(resp);
    }
    // else {
    //   var {type, result} = workerComs(msg);
    // }
  }

  return (
    <div className="App">
      <Header />
      <div className="App-content">
        <div className="plot">
          <DimPlot />
        </div>
        <div className="marker">
          <MarkerPlot />
        </div>
        <div className="analysis">
          <Gallery />
        </div>
      </div>
      <Overlay
        isOpen={loading}
        {...loadingProps}
      >
        <div className="spinner">
          <Spinner size={100} />
          <p>Initializing SCRAN.JS</p>
        </div>
      </Overlay>

    </div>
  );
}

export default App;
