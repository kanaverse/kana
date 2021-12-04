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
  const { setWasmInitialized, setTsneData, setRedDims, redDims,
    setInitDims, setQcDims, setFSelDims, defaultRedDims, setDefaultRedDims,
    tsneData, plotRedDims, setQcData, setClusterData, setFSelectionData,
    setPlotRedDims, setPcaVarExp } = useContext(AppContext);

  useEffect(() => {
    console.log("calling init");
    window.Worker.postMessage({
      "type": "INIT",
      "msg": "Initial Load"
    });
  }, [])

  useEffect(() => {
    console.log("calling defaultreddims");
    if (defaultRedDims === "TSNE") {
      setPlotRedDims({
        "plot": tsneData?.tsne,
        "clusters": tsneData?.clusters
      });
    } else if (defaultRedDims === "PCA") {
      // need PCA dims
    }
  }, [defaultRedDims])

  // let worker = new Worker("./scran/scranWorker.js");

  window.Worker.onmessage = (msg) => {
    console.log(msg);

    const payload = msg.data;
    console.log(payload);

    if (payload.type === "INIT") {
      setLoading(false);
      setWasmInitialized(true);
    } else if (payload.type === "load_DIMS") {
      setInitDims(payload.resp);
    } else if (payload.type === "qc_DIMS") {
      setQcDims(payload.resp);
    } else if (payload.type === "qc_DATA") {
      const { type, resp } = payload;
      setQcData(resp);
    } else if (payload.type === "fSelection_DIMS") {
      setFSelDims(payload.resp);
    } else if (payload.type === "fSelection_DATA") {
      const { type, resp } = payload;
      console.log(type, resp);
      setFSelectionData(resp);
    }else if (payload.type === "pca_DATA") {
      const { type, resp } = payload;
      console.log(type, resp);
      let tmp = [...redDims];
      tmp.push("PCA");
      setRedDims(tmp);
      setPcaVarExp(resp);
      // setTsneData(resp);
    } else if (payload.type === "cluster_DATA") {
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
    } else if (payload.type === "markerGene_DATA") {
      const { type, resp } = payload;
      console.log(type, resp);
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
      <Overlay isOpen={loading}>
        <div>
          <Spinner size={100} />
          <p>Initializing SCRAN.JS</p>
        </div>
      </Overlay>
    </div>
  );
}

export default App;
