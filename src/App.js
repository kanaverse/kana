import './App.css';
import Header from "./components/Header";
import Gallery from './components/Gallery';

import { Overlay, Spinner } from "@blueprintjs/core";

import { useState, useEffect, useContext } from 'react';
import { AppContext } from './context/AppContext';

import DimPlot from './components/Plots/ScatterPlot.js';
import MarkerPlot from './components/Markers';

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
    setInitDims, setQcDims, defaultRedDims, setDefaultRedDims,
    setQcData, qcData, setClusterData, setFSelectionData,
    setUmapData, setPcaVarExp, logs, setLogs,
    selectedCluster, clusterRank,
    selectedClusterSummary, setSelectedClusterSummary,
    reqGene, customSelection,
    delCustomSelection, setDelCustomSelection } = useContext(AppContext);

  useEffect(() => {
    window.Worker.postMessage({
      "type": "INIT",
      "msg": "Initial Load"
    });
  }, [])

  useEffect(() => {

    if (selectedCluster !== null) {
      let type = String(selectedCluster).startsWith("cs") ?
        "getMarkersForSelection" : "getMarkersForCluster";
      window.Worker.postMessage({
        "type": type,
        "payload": {
          "cluster": selectedCluster,
          "rank_type": clusterRank,
        }
      });
    }
  }, [selectedCluster, clusterRank]);

  useEffect(() => {

    if (customSelection !== null && Object.keys(customSelection).length > 0) {
      let csLen = `cs${Object.keys(customSelection).length}`;
      var cs = customSelection[csLen];
      window.Worker.postMessage({
        "type": "computeCustomMarkers",
        "payload": {
          "selection": cs,
          "id": csLen
        }
      });
    }
  }, [customSelection]);

  useEffect(() => {
    if (delCustomSelection !== null) {
      window.Worker.postMessage({
        "type": "removeCustomMarkers",
        "payload": {
          "id": delCustomSelection
        }
      });

      setDelCustomSelection(null);
    }
  }, [delCustomSelection])

  useEffect(() => {

    reqGene !== null && window.Worker.postMessage({
      "type": "getGeneExpression",
      "payload": {
        "gene": reqGene
      }
    });
  }, [reqGene])

  window.Worker.onmessage = (msg) => {
    const payload = msg.data;

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
      const { resp } = payload;
      setQcData(resp);
    } else if (payload.type === "quality_control_thresholds_DATA") {
      const { resp } = payload;
      let tmp = { ...qcData };
      tmp["thresholds"] = resp;
      setQcData(tmp);
    } else if (payload.type === "feature_selection_DIMS") {
    } else if (payload.type === "feature_selection_DATA") {
      const { resp } = payload;
      setFSelectionData(resp);
    } else if (payload.type === "pca_DATA") {
      const { resp } = payload;
      let tmp = [...redDims];
      tmp.push("PCA");
      setRedDims(tmp);
      setPcaVarExp(resp);
    } else if (payload.type === "snn_cluster_graph_DATA") {
      const { resp } = payload;
      setClusterData(resp);
    } else if (payload.type === "tsne_DATA" || payload.type === "tsne_iter") {
      const { resp } = payload;
      setTsneData(resp);
      let tmp = [...redDims];
      tmp.push("TSNE");
      if (!defaultRedDims) {
        setDefaultRedDims("TSNE");
      }
      setRedDims(tmp);
    } else if (payload.type === "umap_DATA") {
      const { resp } = payload;
      setUmapData(resp);
      let tmp = [...redDims];
      tmp.push("UMAP");
      setRedDims(tmp);
    } else if (payload.type === "markerGene_DATA") {
      // const { type, resp } = payload;
    } else if (payload.type === "setMarkersForCluster"
      || payload.type === "setMarkersForCustomSelection") {
      const { resp } = payload;
      let records = {};
      resp.means.forEach((x, i) => {
        records[resp?.genes?.[i]] = {
          "gene": resp?.genes?.[i],
          "mean": x,
          "delta": resp?.delta_d?.[i],
          "lfc": resp?.lfc?.[i],
          // "auc": resp?.auc?.[i],
          // "cohen": resp?.cohen?.[i],
          "detected": resp?.detected?.[i],
          "expanded": false,
          "expr": null,
        }
      });
      setSelectedClusterSummary(records);
    } else if (payload.type === "setGeneExpression") {
      const { resp } = payload;

      let gtmp = { ...selectedClusterSummary };
      gtmp[resp.gene].expr = Object.values(resp.expr);
      setSelectedClusterSummary(gtmp);
    }
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
