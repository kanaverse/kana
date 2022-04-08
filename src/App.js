import './App.css';
import Header from "./components/Header";
import Gallery from './components/Gallery';
import { randomColor } from 'randomcolor';

import { Button, Label, Overlay, Spinner, Alert, Divider } from "@blueprintjs/core";

import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from './context/AppContext';

import { AppToaster } from "./components/Spinners/AppToaster";
import DimPlot from './components/Plots/DimPlot.js';
import MarkerPlot from './components/Markers';
import Pong from './components/Spinners/Pong';
import Spinner2 from './components/Spinners/Spinner2';
import { getMinMax } from './components/Plots/utils';

import { palette } from './components/Plots/utils';
// App is the single point of contact with the web workers
// All requests and responses are received here

var scranWorker = new Worker(new URL('./workers/scran.worker.js', import.meta.url), { type: "module" });;

const App = () => {
  // if (scranWorker === null) {
  //   scranWorker = new Worker(new URL('./workers/scranWorker.js', import.meta.url), { type: "module" });
  // }

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
  // saved analysis in the browser's indexeddb
  const [kanaIDBRecs, setKanaIDBRecs] = useState([]);
  // delete rec in database
  const [deletekdb, setDeletekdb] = useState(null);
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

  // Cluster Analysis
  // cluster assignments
  const [clusterData, setClusterData] = useState(null);
  // set cluster colors
  const [clusterColors, setClusterColors] = useState(null);
  // custom selection on tsne plot
  const [customSelection, setCustomSelection] = useState({});
  // remove custom Selection
  const [delCustomSelection, setDelCustomSelection] = useState(null);

  // Cell Labels
  const [cellLabelData, setCellLabelData] = useState(null);

  // geneExpression
  // what gene is selected for scatterplot
  const [gene, setGene] = useState(null);
  // request gene expression
  const [reqGene, setReqGene] = useState(null);

  // ImageData user saves while exploring
  const [savedPlot, setSavedPlot] = useState([]);

  // Error handling
  // error message caught from the worker 
  const [scranError, setScranError] = useState(null);

  // request annotation column
  const [reqAnnotation, setReqAnnotation] = useState(null);

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

  const { setWasmInitialized, wasmInitialized,
    setGenesInfo, initLoadState, tabSelected,
    datasetName, params, loadParams,
    setGeneColSel, setLoadParams,
    setInitLoadState, inputFiles, annotationCols, setAnnotationCols,
    annotationObj, setAnnotationObj, preInputFiles,
    setPreInputFilesStatus } = useContext(AppContext);

  // initializes various things on the worker side
  useEffect(() => {
    scranWorker.postMessage({
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
      scranWorker.postMessage({
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
      scranWorker.postMessage({
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
      scranWorker.postMessage({
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

    reqGene !== null && scranWorker.postMessage({
      "type": "getGeneExpression",
      "payload": {
        "gene": reqGene
      }
    });
  }, [reqGene]);

  useEffect(() => {
    triggerAnimation && defaultRedDims && scranWorker.postMessage({
      "type": "animate" + defaultRedDims,
      payload: {
        params: params[defaultRedDims.toLowerCase()]
      }
    });
  }, [triggerAnimation]);

  // export an analysis
  useEffect(() => {

    if (exportState) {
      scranWorker.postMessage({
        "type": "EXPORT",
        "payload": {
          "files": inputFiles,
          "params": params
        },
      });

      AppToaster.show({ icon: "download", intent: "primary", message: "Exporting analysis in the background" });
    } else {
      inputFiles?.files && AppToaster.show({ icon: "download", intent: "primary", message: "Analysis saved. Please check your downloads directory!" });
    }
  }, [exportState]);

  useEffect(() => {

    if (indexedDBState) {
      scranWorker.postMessage({
        "type": "SAVEKDB",
        "payload": {
          "title": datasetName,
        },
      });

      AppToaster.show({ icon: "floppy-disk", intent: "primary", message: "Saving analysis in the background. Note: analysis is saved within the browser!!" });
    } else {
      inputFiles?.files && AppToaster.show({ icon: "floppy-disk", intent: "primary", message: "Analysis saved!" });
    }
  }, [indexedDBState]);

  // get annotation for a column from worker
  useEffect(() => {

    reqAnnotation !== null && scranWorker.postMessage({
      "type": "getAnnotation",
      "payload": {
        "annotation": reqAnnotation
      }
    });
  }, [reqAnnotation]);

  useEffect(() => {

    if (wasmInitialized && inputFiles.files != null && !initLoadState) {
      if (tabSelected === "new") {
        scranWorker.postMessage({
          "type": "RUN",
          "payload": {
            "inputs": inputFiles,
            "params": params
          },
        });
      } else if (tabSelected === "load") {
        if (loadParams == null || inputFiles?.reset) {
          scranWorker.postMessage({
            "type": "LOAD",
            "payload": {
              "inputs": inputFiles
            },
          });
          setInitLoadState(true);
        } else {
          scranWorker.postMessage({
            "type": "RUN",
            "payload": {
              "inputs": inputFiles,
              "params": params
            },
          });
        }
      }
    }
  }, [inputFiles, params, wasmInitialized]);


  useEffect(() => {

    if (wasmInitialized && preInputFiles && !initLoadState) {

      if (preInputFiles.files) {
        let all_valid = true;

        for (const f in preInputFiles.files) {
          let ffile = preInputFiles.files[f];

          if (!(ffile.format)) {
            all_valid = false;
          } else {
            if (ffile.format == "MatrixMarket") {
              if (!ffile.mtx) {
                all_valid = false;
              }
            } else if (ffile.format == "10X" || ffile.format == "H5AD") {
              if (!ffile.file) {
                all_valid = false;
              }
              preInputFiles.files[f].h5 = ffile.file;
            }
          }
        }

        if (all_valid && tabSelected === "new") {
          scranWorker.postMessage({
            "type": "PREFLIGHT_INPUT",
            "payload": {
              inputs: preInputFiles
            },
          });
        }
      }
    }
  }, [preInputFiles, wasmInitialized]);

  // callback for all responses from workers
  // all interactions are logged and shown on the UI
  scranWorker.onmessage = (msg) => {
    const payload = msg.data;

    if (payload?.msg) {
      let tmp = [...logs];
      let d = new Date();
      tmp.push(`${d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds()} - ${payload?.type} - ${payload?.msg}`);

      setLogs(tmp);
    }

    const { resp } = payload;

    if (resp?.status?.endsWith("ERROR")) {
      setScranError({
        type: payload.type,
        msg: resp.reason
      });
      return;
    }

    if (payload.type === "INIT") {
      setLoading(false);
      setWasmInitialized(true);
    } else if (payload.type === "KanaDB_store") {
      const { resp } = payload;
      if (resp !== undefined) {
        setKanaIDBRecs(resp);
      }
      setIndexedDBState(false);
    } else if (payload.type === "inputs_DATA") {
      setInitDims(`${payload.resp.dimensions.num_genes} genes, ${payload.resp.dimensions.num_cells} cells`);
      setGenesInfo(payload.resp.genes);
      setGeneColSel(Object.keys(payload.resp.genes)[0]);

      if (payload.resp?.annotations) {
        setAnnotationCols(Object.values(payload.resp.annotations));
      }
    } else if (payload.type === "quality_control_DATA") {
      const { resp } = payload;

      var ranges = {}, data = resp["data"], all = {};

      for (const [group, gvals] of Object.entries(data)) {
        for (const [key, val] of Object.entries(gvals)) {
          if (!all[key]) all[key] = [Infinity, -Infinity];
          let [min, max] = getMinMax(val);
          if (min < all[key][0]) all[key][0] = min;
          if (max > all[key][1]) all[key][1] = max;
        }
        ranges[group] = all;
      }

      resp["ranges"] = ranges;
      setQcData(resp);
      setQcDims(`${resp.retained}`);
    } else if (payload.type === "feature_selection_DATA") {
      const { resp } = payload;
      setFSelectionData(resp);
    } else if (payload.type === "pca_DATA") {
      const { resp } = payload;
      setPcaVarExp(resp);
    } else if (payload.type === "choose_clustering_DATA") {
      const { resp } = payload;

      let t_annots = [...annotationCols];
      t_annots.push("CLUSTERS");

      setAnnotationCols(t_annots);

      let cluster_count = getMinMax(resp?.clusters)[1] + 1;
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

      // Only really need to do this if we detect that 
      // we're not coloring by expression.
      if (gene === null) {
        setTsneData(tsneData);
        setUmapData(umapData);
      }

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
      setLoadParams(resp);

      setTimeout(() => {
        setInitLoadState(false);
      }, 1000);
    } else if (payload.type === "setAnnotation") {
      const { resp } = payload;
      let tmp = { ...annotationObj };
      tmp[resp.annotation] = resp.values;
      setAnnotationObj(tmp);

      setReqAnnotation(null);
    } else if (payload.type === "cell_labelling_DATA") {
      const { resp } = payload;
      setCellLabelData(resp);
    } else if (payload.type === "PREFLIGHT_INPUT_DATA") {
      const { resp } = payload;
      setPreInputFilesStatus(resp.details);
    }
  }

  return (
    <div className="App">
      <Header
        setExportState={setExportState}
        setIndexedDBState={setIndexedDBState}
        initDims={initDims}
        qcDims={qcDims}
        logs={logs}
        kanaIDBRecs={kanaIDBRecs}
        setKanaIDBRecs={setKanaIDBRecs}
        deletekdb={deletekdb}
        setDeletekdb={setDeletekdb} />
      <div className="App-content">
        <div className="plot">
          {
            defaultRedDims && clusterData ?
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
                savedPlot={savedPlot}
                setSavedPlot={setSavedPlot}
                clusterData={clusterData}
                customSelection={customSelection}
                setCustomSelection={setCustomSelection}
                setGene={setGene}
                gene={gene}
                clusterColors={clusterColors}
                setClusterColors={setClusterColors}
                setDelCustomSelection={setDelCustomSelection}
                setReqAnnotation={setReqAnnotation}
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
            selectedClusterSummary && <MarkerPlot
              selectedClusterSummary={selectedClusterSummary}
              setSelectedClusterSummary={setSelectedClusterSummary}
              selectedClusterIndex={selectedClusterIndex}
              selectedCluster={selectedCluster}
              setSelectedCluster={setSelectedCluster}
              setClusterRank={setClusterRank}
              clusterData={clusterData}
              customSelection={customSelection}
              setGene={setGene}
              gene={gene}
              clusterColors={clusterColors}
              setReqGene={setReqGene}
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
            pcaVarExp={pcaVarExp}
            savedPlot={savedPlot}
            setSavedPlot={setSavedPlot}
            clusterData={clusterData}
            clusterColors={clusterColors}
            cellLabelData={cellLabelData}
            gene={gene}
          />
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

      <Alert
        canEscapeKeyCancel={false}
        canOutsideClickCancel={false}
        confirmButtonText="Reload App"
        icon="warning-sign"
        intent="danger"
        isOpen={scranError != null}
        onConfirm={() => location.reload()}
      >
        <h3>{scranError?.type.replace("_", " ").toUpperCase()}</h3>
        <Divider />
        <p>
          {scranError?.msg}
        </p>
        <Divider />
        <p>If the error is related to input data, we support <a href="https://support.10xgenomics.com/single-cell-gene-expression/software/pipelines/latest/output/matrices">Matrix Market</a>,
          <a href="https://support.10xgenomics.com/single-cell-gene-expression/software/pipelines/latest/advanced/h5_matrices">10X v3 HDF5</a> or H5AD formats.</p>
        <p>
          If not, please report the issue on <a href='https://github.com/jkanche/kana/issues' target="_blank">GitHub</a>.
        </p>
      </Alert>

    </div>
  );
}

export default React.memo(App);
