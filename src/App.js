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

import Split from 'react-split-grid'

import Logs from './components/Logs';

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

  // loaders for UI components
  const [showDimPlotLoader, setShowDimPlotLoader] = useState(true);
  const [showMarkerLoader, setShowMarkerLoader] = useState(true);
  const [showQCLoader, setShowQCLoader] = useState(true);
  const [showPCALoader, setShowPCALoader] = useState(true);
  const [showNClusLoader, setShowNClusLoader] = useState(true);
  const [showCellLabelLoader, setShowCellLabelLoader] = useState(true);

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
  // keeps track of what points were selected in lasso selections
  const [selectedPoints, setSelectedPoints] = useState(null);
  // keeps track of what points were selected in lasso selections
  const [restoreState, setRestoreState] = useState(null);

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
  const [clusterRank, setClusterRank] = useState("cohen-min-rank");

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
  }, []);

  function add_to_logs(type, msg, status) {
    let tmp = [...logs];
    let d = new Date();
    tmp.push([type, d.toLocaleTimeString(), msg, status]);

    setLogs(tmp);
  }

  function setAllLoaders() {
    setShowDimPlotLoader(true);
    setShowMarkerLoader(true);
    setShowQCLoader(true);
    setShowPCALoader(true);
    setShowNClusLoader(true);
    setShowCellLabelLoader(true);
  }

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

      add_to_logs("info", `--- ${type} sent ---`);
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

      add_to_logs("info", `--- Compute markers for ${csLen} sent ---`);
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
      add_to_logs("info", `--- Delete custom markers for ${delCustomSelection} ---`);
    }
  }, [delCustomSelection]);

  // get expression for a gene from worker
  useEffect(() => {

    if (reqGene) {
      scranWorker.postMessage({
        "type": "getGeneExpression",
        "payload": {
          "gene": reqGene
        }
      });

      add_to_logs("info", `--- Request gene expression for gene:${reqGene} sent ---`);
    }
  }, [reqGene]);

  useEffect(() => {

    if (triggerAnimation && defaultRedDims) {
      scranWorker.postMessage({
        "type": "animate" + defaultRedDims,
        payload: {
          params: params[defaultRedDims.toLowerCase()]
        }
      });

      add_to_logs("info", `--- Request to animate ${defaultRedDims} sent ---`);
    }
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
      add_to_logs("info", `--- Export analysis state (to file) initialized ---`);
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
      add_to_logs("info", `--- Export analysis state (to browser) initialized ---`);
    } else {
      inputFiles?.files && AppToaster.show({ icon: "floppy-disk", intent: "primary", message: "Analysis saved!" });
    }
  }, [indexedDBState]);

  // get annotation for a column from worker
  useEffect(() => {

    if (reqAnnotation) {
      scranWorker.postMessage({
        "type": "getAnnotation",
        "payload": {
          "annotation": reqAnnotation
        }
      });

      add_to_logs("info", `--- Request annotation for ${reqAnnotation} sent---`);
    }
  }, [reqAnnotation]);

  useEffect(() => {

    if (wasmInitialized && !initLoadState) {
      if (inputFiles.files != null && tabSelected === "new") {
        scranWorker.postMessage({
          "type": "RUN",
          "payload": {
            "inputs": inputFiles,
            "params": params
          },
        });

        add_to_logs("info", `--- Analyis started---`);
        setAllLoaders();
      } else if (tabSelected === "load") {
        if (loadParams == null) {
          scranWorker.postMessage({
            "type": "LOAD",
            "payload": {
              "inputs": inputFiles
            },
          });
          setInitLoadState(true);
          add_to_logs("info", `--- Reloading analyis ---`);
        } else {
          scranWorker.postMessage({
            "type": "RUN",
            "payload": {
              "inputs": {
                "files": null,
                "batch": loadParams?.inputs?.batch
              },
              "params": params
            },
          });

          add_to_logs("info", `--- Reanalyzing loaded analysis ---`);
          setAllLoaders();
        }
      }
    }
  }, [inputFiles, params, wasmInitialized]);


  useEffect(() => {

    if (wasmInitialized && preInputFiles && !initLoadState) {

      if (preInputFiles.files) {
        let all_valid = true;
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

    if (payload) {
      if (payload.type.toLowerCase().endsWith("start")) {
        add_to_logs("start", payload.type.toLowerCase().replace("_start", ""), "started");
      } else if (payload.type.indexOf("_store") != -1) {
        add_to_logs("info", `(${payload.type.toLowerCase().replace("_store", "")}) store initialized`);
      } else if (payload.type.toLowerCase().endsWith("init")) {
        add_to_logs("info", payload.msg.toLowerCase().replace("success: ", ""));
      } else if (payload.type.toLowerCase().endsWith("cache")) {
        add_to_logs("complete", payload.type.toLowerCase().replace("_cache", ""), "finished (from cache)");
      } else if (payload.type.toLowerCase().endsWith("data")) {
        add_to_logs("complete", payload.type.toLowerCase().replace("_data", ""), "finished");
      } else if (payload.type.toLowerCase().endsWith("error")) {
        const { resp } = payload;
        add_to_logs("error", `${resp.reason}`, "");

        setScranError({
          type: payload.type,
          msg: resp.reason,
          fatal: resp.fatal
        });

        return;
      }
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
      setShowQCLoader(false);
    } else if (payload.type === "feature_selection_DATA") {
      const { resp } = payload;
      setFSelectionData(resp);
    } else if (payload.type === "pca_DATA") {
      const { resp } = payload;
      setPcaVarExp(resp);
      setShowPCALoader(false);
    } else if (payload.type === "choose_clustering_DATA") {
      const { resp } = payload;

      let t_annots = [...annotationCols];
      if (t_annots.indexOf("CLUSTERS") == -1) {
        t_annots.push("CLUSTERS");
      }

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
      setShowNClusLoader(false);
    } else if (payload.type === "marker_detection_START") {
      setSelectedCluster(null);
      setSelectedClusterIndex([]);
      setSelectedClusterSummary([]);
    } else if (payload.type === "marker_detection_DATA") {
      if (!selectedCluster) {
        // show markers for the first cluster
        setSelectedCluster(0);
      }
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
      setShowDimPlotLoader(false);
    } else if (payload.type === "tsne_iter" || payload.type === "umap_iter") {
      setAnimateData(payload);
    } else if (payload.type === "umap_DATA") {
      const { resp } = payload;
      setUmapData(resp);

      // enable UMAP selection
      let tmp = [...redDims];
      tmp.push("UMAP");
      setRedDims(tmp);

      setShowGame(false);
      setShowAnimation(false);
      setTriggerAnimation(false);
      setShowDimPlotLoader(false);
    } else if (payload.type === "setMarkersForCluster"
      || payload.type === "setMarkersForCustomSelection") {
      const { resp } = payload;
      let records = [];
      let index = Array(resp.ordering.length);
      resp.means.forEach((x, i) => {
        index[resp.ordering[i]] = i;
        records.push({
          "gene": resp?.ordering?.[i],
          "mean": isNaN(x) ? 0: parseFloat(x.toFixed(2)),
          "delta": isNaN(x) ? 0: parseFloat(resp?.delta_detected?.[i].toFixed(2)),
          "lfc": isNaN(x) ? 0: parseFloat(resp?.lfc?.[i].toFixed(2)),
          "detected": isNaN(x) ? 0: parseFloat(resp?.detected?.[i].toFixed(2)),
          "expanded": false,
          "expr": null,
        });
      });
      setSelectedClusterIndex(index);
      setSelectedClusterSummary(records);
      setShowMarkerLoader(false);
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

      if (resp?.custom_selections?.selections) {
        let cluster_count = clusterColors.length + Object.keys(resp?.custom_selections?.selections).length;
        let cluster_colors = null;
        if (cluster_count > Object.keys(palette).length) {
          cluster_colors = randomColor({ luminosity: 'dark', count: cluster_count + 1 });
        } else {
          cluster_colors = palette[cluster_count.toString()];
        }
        setClusterColors(cluster_colors);

        setCustomSelection(resp?.custom_selections?.selections);
      }

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
      setShowCellLabelLoader(false);
    } else if (payload.type === "PREFLIGHT_INPUT_DATA") {
      const { resp } = payload;
      setPreInputFilesStatus(resp.details);
    } else if (payload.type === "custom_selections_DATA") {
    } else if (payload.type === "tsne_CACHE" || payload.type === "umap_CACHE") {
      setShowDimPlotLoader(false);
    } else if (payload.type === "marker_detection_CACHE") {
      setShowMarkerLoader(false);
    } else if (payload.type === "quality_control_CACHE") {
      setShowQCLoader(false);
    } else if (payload.type === "pca_CACHE") {
      setShowPCALoader(false);
    } else if (payload.type === "choose_clustering_CACHE") {
      setShowNClusLoader(false);
    } else if (payload.type === "cell_labelling_CACHE") {
      setShowCellLabelLoader(false);
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
        setDeletekdb={setDeletekdb}
        loadingStatus={inputFiles?.files ? !showQCLoader && !showPCALoader && !showNClusLoader && !showCellLabelLoader && !showMarkerLoader && !showDimPlotLoader : true}
      />
      <div className="App-content">
        <Split
            minSize={200}
            render={({
                getGridProps,
                getGutterProps,
            }) => (
                <div className="app-content-left grid" {...getGridProps()}>
                  {
                    inputFiles?.files && <div className={showDimPlotLoader ? "plot effect-opacitygrayscale" : "plot"}>
                      {
                        defaultRedDims && clusterData ?
                          <DimPlot
                            className={"effect-opacitygrayscale"}
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
                            selectedPoints={selectedPoints}
                            setSelectedPoints={setSelectedPoints}
                            restoreState={restoreState}
                            setRestoreState={setRestoreState}
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
                  }
                    <div className="gutter-row gutter-row-1" {...getGutterProps('row', 1)} />
                    {
                      inputFiles?.files && <div className="analysis">
                        <Gallery
                          qcData={qcData}
                          pcaVarExp={pcaVarExp}
                          savedPlot={savedPlot}
                          setSavedPlot={setSavedPlot}
                          clusterData={clusterData}
                          clusterColors={clusterColors}
                          cellLabelData={cellLabelData}
                          gene={gene}
                          showQCLoader={showQCLoader}
                          showPCALoader={showPCALoader}
                          showNClusLoader={showNClusLoader}
                          showCellLabelLoader={showCellLabelLoader}
                          tsneData={tsneData} umapData={umapData}
                          redDims={redDims}
                          selectedPoints={selectedPoints}
                          setSelectedPoints={setSelectedPoints}
                          restoreState={restoreState}
                          setRestoreState={setRestoreState}
                        />
                      </div>
                    }
                </div>
            )}
        />
        {
          inputFiles?.files && <div className={showMarkerLoader ? "marker effect-opacitygrayscale" : "marker"}>
            {
              clusterData ?
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
                />
                :
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
                </div>
            }
          </div>
        }
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
        confirmButtonText={scranError?.fatal ? "Reload App" : "close"}
        icon="warning-sign"
        intent="danger"
        isOpen={scranError != null}
        onConfirm={() => {
          if (scranError?.fatal) {
            location.reload()
          } else {
            setScranError(null);
          }
        }}
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
        <Divider />
        {
          scranError?.fatal &&
          <div>Check logs here <Logs loadingStatus={true} logs={logs} /></div>
        }
      </Alert>

    </div>
  );
}

export default React.memo(App);
