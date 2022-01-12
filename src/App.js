import './App.css';
import Header from "./components/Header";
import Gallery from './components/Gallery';
import { randomColor } from 'randomcolor';

import { Button, Label, Overlay, Spinner } from "@blueprintjs/core";

import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from './context/AppContext';

import { AppToaster } from "./components/Spinners/AppToaster";
import DimPlot from './components/Plots/DimPlot.js';
import MarkerPlot from './components/Markers';
import Pong from './components/Spinners/Pong';
import Spinner2 from './components/Spinners/Spinner2';

// App is the single point of contact with the web workers
// All requests and responses are received here

function App() {

  // show loading screen ?
  const [loading, setLoading] = useState(true);
  // use local state for tsne/umap animation
  const [animateData, setAnimateData] = useState(null);
  // show in-app game ?
  const [showGame, setShowGame] = useState(false);
  // app export state - .kana file
  const [exportState, setExportState] = useState(false);
  // app export state - store to indexedDB
  const [indexedDBState, setIndexedDBState] = useState(false);
  // Response State for various components
  // dim sizes
  const [initDims, setInitDims] = useState(null);
  const [qcDims, setQcDims] = useState(null);
  // const [fSelDims, setFSelDims] = useState(null);

  // Logs
  const [logs, setLogs] = useState([]);

  // QC Data
  const [qcData, setQcData] = useState(null);
  // Feature Selection
  const [fSelectionData, setFSelectionData] = useState(null);

  // UI dimensions reduction dropdown
  const [redDims, setRedDims] = useState([]);
  // which dimension is selected
  const [defaultRedDims, setDefaultRedDims] = useState(null);
  // TSNE
  const [tsneData, setTsneData] = useState(null);
  // UMAP
  const [umapData, setUmapData] = useState(null);
  // this applies to both tsne and umap
  // is animation in progress ?
  const [showAnimation, setShowAnimation] = useState(false);
  // if a user manually triggers an animation (using the play button)
  const [triggerAnimation, setTriggerAnimation] = useState(false);

  // PCA
  const [pcaVarExp, setPcaVarExp] = useState(null);

  // Cluster Data
  // which cluster is selected
  const [selectedCluster, setSelectedCluster] = useState(null);
  // cohen, mean scores per gene
  const [selectedClusterSummary, setSelectedClusterSummary] = useState([]);
  // ordering of genes for the selected cluster
  const [selectedClusterIndex, setSelectedClusterIndex] = useState([]);
  // set Cluster rank-type
  const [clusterRank, setClusterRank] = useState(null);

  // props for dialogs
  const loadingProps = {
    autoFocus: true,
    canEscapeKeyClose: false,
    canOutsideClickClose: false,
    enforceFocus: true,
    hasBackdrop: true,
    usePortal: true,
    useTallContent: false,
  };

  const { setWasmInitialized,
    setGenesInfo, setClusterData,
    reqGene, customSelection, clusterData,
    delCustomSelection, setDelCustomSelection, setReqGene,
    datasetName, params,
    setGeneColSel, setKanaIDBRecs, setLoadParams,
    setInitLoadState, inputFiles,
    setClusterColors } = useContext(AppContext);

  const palette = {
    1: ['#1b9e77'],
    2: ['#1b9e77', '#d95f02'],
    3: ['#1b9e77', '#d95f02', '#7570b3'],
    4: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a'],
    5: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e'],
    6: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02'],
    7: [
      '#1b9e77',
      '#d95f02',
      '#7570b3',
      '#e7298a',
      '#66a61e',
      '#e6ab02',
      '#a6761d',
    ],
    8: [
      '#1b9e77',
      '#d95f02',
      '#7570b3',
      '#e7298a',
      '#66a61e',
      '#e6ab02',
      '#a6761d',
      '#666666',
    ],
    9: [
      '#a6cee3',
      '#1f78b4',
      '#b2df8a',
      '#33a02c',
      '#fb9a99',
      '#e31a1c',
      '#fdbf6f',
      '#ff7f00',
      '#cab2d6',
    ],
    10: [
      '#a6cee3',
      '#1f78b4',
      '#b2df8a',
      '#33a02c',
      '#fb9a99',
      '#e31a1c',
      '#fdbf6f',
      '#ff7f00',
      '#cab2d6',
      '#6a3d9a',
    ],
    11: [
      '#a6cee3',
      '#1f78b4',
      '#b2df8a',
      '#33a02c',
      '#fb9a99',
      '#e31a1c',
      '#fdbf6f',
      '#ff7f00',
      '#cab2d6',
      '#6a3d9a',
      '#ffff99',
    ],
    12: [
      '#a6cee3',
      '#1f78b4',
      '#b2df8a',
      '#33a02c',
      '#fb9a99',
      '#e31a1c',
      '#fdbf6f',
      '#ff7f00',
      '#cab2d6',
      '#6a3d9a',
      '#ffff99',
      '#b15928',
    ],
  };

  // initializes various things on the worker side
  useEffect(() => {
    window.scranWorker.postMessage({
      "type": "INIT",
      "msg": "Initial Load"
    });
  }, [])

  // request worker for new markers 
  // if either the cluster or the ranking changes
  useEffect(() => {

    if (selectedCluster !== null) {
      let type = String(selectedCluster).startsWith("cs") ?
        "getMarkersForSelection" : "getMarkersForCluster";
      window.scranWorker.postMessage({
        "type": type,
        "payload": {
          "cluster": selectedCluster,
          "rank_type": clusterRank,
        }
      });
    }
  }, [selectedCluster, clusterRank]);

  // compute markers in the worker 
  // when a new custom selection of cells is made through the UI
  useEffect(() => {

    if (customSelection !== null && Object.keys(customSelection).length > 0) {
      let csLen = `cs${Object.keys(customSelection).length}`;
      var cs = customSelection[csLen];
      window.scranWorker.postMessage({
        "type": "computeCustomMarkers",
        "payload": {
          "selection": cs,
          "id": csLen
        }
      });
    }
  }, [customSelection]);

  // Remove a custom selection from cache
  useEffect(() => {
    if (delCustomSelection !== null) {
      window.scranWorker.postMessage({
        "type": "removeCustomMarkers",
        "payload": {
          "id": delCustomSelection
        }
      });

      setDelCustomSelection(null);
    }
  }, [delCustomSelection]);

  // get expression for a gene from worker
  useEffect(() => {

    reqGene !== null && window.scranWorker.postMessage({
      "type": "getGeneExpression",
      "payload": {
        "gene": reqGene
      }
    });
  }, [reqGene]);

  useEffect(() => {
    triggerAnimation && defaultRedDims && window.scranWorker.postMessage({
      "type": "animate" + defaultRedDims,
      payload: {
        params: params[defaultRedDims.toLowerCase()]
      }
    });
  }, [triggerAnimation]);

  // export an analysis
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

      AppToaster.show({ icon: "download", intent: "primary", message: "Exporting analysis in the background" });
    } else {
      inputFiles?.files && AppToaster.show({ icon: "download", intent: "primary", message: "Analysis saved. Please check your downloads directory!" });
    }
  }, [exportState]);

  useEffect(() => {

    if (indexedDBState) {
      window.scranWorker.postMessage({
        "type": "SAVEKDB",
        "payload": {
          "files": inputFiles,
          "params": params,
          "id": datasetName,
        },
        "msg": "not much to pass"
      });

      AppToaster.show({ icon: "floppy-disk", intent: "primary", message: "Saving analysis in the background. Note: analysis is saved within the browser!!" });
    } else {
      inputFiles?.files && AppToaster.show({ icon: "floppy-disk", intent: "primary", message: "Analysis saved!" });
    }
  }, [indexedDBState]);

  // callback for all responses from workers
  // all interactions are logged and shown on the UI
  window.scranWorker.onmessage = (msg) => {
    const payload = msg.data;

    if (payload?.msg) {
      let tmp = [...logs];
      let d = new Date();
      tmp.push(`${d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()} - ${payload?.type} - ${payload?.msg}`);

      setLogs(tmp);
    }

    if (payload.type === "INIT") {
      setLoading(false);
      setWasmInitialized(true);
    } else if (payload.type === "KanaDB_store") {
      const { resp } = payload;
      if (resp.length > 0) {
        setKanaIDBRecs(resp);
      }
      setIndexedDBState(false);
    } else if (payload.type === "inputs_DATA") {
      setInitDims(`${payload.resp.dimensions.num_genes} genes, ${payload.resp.dimensions.num_cells} cells`);
      setGenesInfo(payload.resp.genes);
      setGeneColSel(Object.keys(payload.resp.genes)[0]);
    } else if (payload.type === "quality_control_metrics_DATA") {
      const { resp } = payload;
      setQcData(resp);
    } else if (payload.type === "quality_control_thresholds_DATA") {
      const { resp } = payload;
      let tmp = { ...qcData };
      tmp["thresholds"] = resp;
      setQcData(tmp);
    } else if (payload.type === "quality_control_filtered_DATA") {
      setQcDims(`${payload.resp.retained}`);
    } else if (payload.type === "feature_selection_DATA") {
      const { resp } = payload;
      setFSelectionData(resp);
    } else if (payload.type === "pca_DATA") {
      const { resp } = payload;
      setPcaVarExp(resp);
    } else if (payload.type === "snn_cluster_graph_DATA") {
      const { resp } = payload;

      let cluster_count = Math.max(...resp?.clusters) + 1;
      if (customSelection) {
        cluster_count += Object.keys(customSelection).length;
      }
      let cluster_colors = null;
      if (cluster_count > Object.keys(palette).length) {
        cluster_colors = randomColor({ luminosity: 'dark', count: cluster_count + 1 });
      } else {
        cluster_colors = palette[cluster_count.toString()];
      }
      setClusterColors(cluster_colors);

      setClusterData(resp);

      // show markers for the first cluster
      setSelectedCluster(0);
    } else if (payload.type === "tsne_DATA") {
      const { resp } = payload;
      setTsneData(resp);

      let tmp = [...redDims];
      tmp.push("TSNE");
      // once t-SNE is available, set this as the default display
      if (!defaultRedDims) {
        setDefaultRedDims("TSNE");
      }

      setRedDims(tmp);
      // also don't show the pong game anymore
      setShowGame(false);
      setShowAnimation(false);
      setTriggerAnimation(false);
    } else if (payload.type === "tsne_iter" || payload.type === "umap_iter") {
      const { resp } = payload;
      setAnimateData(resp);
    } else if (payload.type === "umap_DATA") {
      const { resp } = payload;
      setUmapData(resp);

      // enable UMAP selection
      let tmp = [...redDims];
      tmp.push("UMAP");
      setRedDims(tmp);

      setShowAnimation(false);
      setTriggerAnimation(false);
    } else if (payload.type === "markerGene_DATA") {
    } else if (payload.type === "setMarkersForCluster"
      || payload.type === "setMarkersForCustomSelection") {
      const { resp } = payload;
      let records = [];
      let index = Array(resp.ordering.length);
      resp.means.forEach((x, i) => {
        index[resp.ordering[i]] = i;
        records.push({
          "gene": resp?.ordering?.[i],
          "mean": parseFloat(x.toFixed(2)),
          "delta": parseFloat(resp?.delta_detected?.[i].toFixed(2)),
          "lfc": parseFloat(resp?.lfc?.[i].toFixed(2)),
          "detected": parseFloat(resp?.detected?.[i].toFixed(2)),
          "expanded": false,
          "expr": null,
        });
      });
      setSelectedClusterIndex(index);
      setSelectedClusterSummary(records);
    } else if (payload.type === "setGeneExpression") {
      const { resp } = payload;
      let tmp = [...selectedClusterSummary];
      tmp[selectedClusterIndex[resp.gene]].expr = Object.values(resp.expr);
      setSelectedClusterSummary(tmp);
      setReqGene(null);
    } else if (payload.type === "exportState") {
      const { resp } = payload;

      let tmpLink = document.createElement("a");
      var fileNew = new Blob([resp], {
        type: "text/plain"
      });
      tmpLink.href = URL.createObjectURL(fileNew);
      tmpLink.download = datasetName.split(' ').join('_') + ".kana";
      tmpLink.click();

      setExportState(false);
    } else if (payload.type === "KanaDB") {
      setIndexedDBState(false);
    } else if (payload.type === "loadedParameters") {
      const { resp } = payload;
      setLoadParams(resp.params);

      setTimeout(() => {
        setInitLoadState(false);
      }, 1000);
    }
  }

  return (
    <div className="App">
      <Header
        setExportState={setExportState}
        setIndexedDBState={setIndexedDBState}
        initDims={initDims}
        qcDims={qcDims}
        logs={logs}/>
      <div className="App-content">
        <div className="plot">
          {
            defaultRedDims ?
              <DimPlot
                tsneData={tsneData} umapData={umapData}
                animateData={animateData}
                redDims={redDims}
                defaultRedDims={defaultRedDims}
                setDefaultRedDims={setDefaultRedDims}
                showAnimation={showAnimation}
                setShowAnimation={setShowAnimation}
                setTriggerAnimation={setTriggerAnimation}
                selectedClusterSummary={selectedClusterSummary}
                setSelectedClusterSummary={setSelectedClusterSummary}
                selectedClusterIndex={selectedClusterIndex}
                selectedCluster={selectedCluster}
              /> :
              showGame ?
                <div style={{
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '50px'
                }}>
                  <Label>Get some coffee or play pong while you wait for the analysis to finish..</Label>
                  <Button onClick={() => { setShowGame(false) }}>I'm good, go back</Button>
                  <Pong />
                </div>
                :
                <div style={{
                  height: '100%',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '50px'
                }}>
                  <Spinner2 />
                  <Label>Get some coffee or play pong while you wait for the analysis to finish..</Label>
                  <Button onClick={() => { setShowGame(true) }}>Play Pong</Button>
                </div>
          }
        </div>
        <div className="marker">
          {clusterData ?
            <MarkerPlot
              selectedClusterSummary={selectedClusterSummary}
              setSelectedClusterSummary={setSelectedClusterSummary}
              selectedClusterIndex={selectedClusterIndex}
              selectedCluster={selectedCluster}
              setSelectedCluster={setSelectedCluster}
              setClusterRank={setClusterRank}
            /> :
            <div style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Spinner2 />
              <Label>Generating nearest neighbor graph to compute clusters....</Label>
            </div>}
        </div>
        <div className="analysis">
          <Gallery
            qcData={qcData}
            pcaVarExp={pcaVarExp} />
        </div>
      </div>
      <Overlay
        isOpen={loading}
        {...loadingProps}
      >
        <div className="spinner">
          <Spinner size={100} />
          <p>Initializing kana</p>
        </div>
      </Overlay>
    </div>
  );
}

export default React.memo(App);
