importScripts("./WasmBuffer.js");
importScripts("./HDF5Reader.js");
importScripts("./_utils.js");
importScripts("./_utils_viz_parent.js");
importScripts("./_utils_markers.js");

var window = {};
importScripts("https://cdn.jsdelivr.net/gh/usnistgov/jsfive@master/dist/hdf5.js");
var hdf5 = window.hdf5;

importScripts("./_inputs.js");
importScripts("https://cdn.jsdelivr.net/npm/d3-dsv@3");

importScripts("./_qc_metrics.js");
importScripts("./_qc_thresholds.js");
importScripts("./_qc_filter.js");
importScripts("./_normalization.js");
importScripts("./_model_gene_var.js");
importScripts("./_pca.js");
importScripts("./_neighbor_index.js");
importScripts("./_choose_clustering.js");
importScripts("./_snn_cluster.js");
importScripts("./_snn_graph.js");
importScripts("./_snn_neighbors.js");
importScripts("./_tsne_monitor.js");
importScripts("./_umap_monitor.js");
importScripts("./_score_markers.js");
importScripts("./_custom_markers.js");

importScripts("./mito.js");

/***************************************/

var runStep = function(mode, wasm, namespace, step, message, args = {}, extra = null) {
  if (mode == "serialize") {
    state[step] = namespace.serialize(wasm);
  } else {
    if (mode == "run") {
      namespace.compute(wasm, args);
    } else {
      namespace.unserialize(wasm, state[step]);
    }
    if (namespace.changed || mode == "unserialize") {
      if (extra !== null) {
        extra();
      }
      scran_utils.postSuccess(namespace.results(wasm), step, message);
    }
  }
}

var runStepDimRed = async function(mode, wasm, namespace, step, message, args) {
  if (mode == "serialize") {
    state[step] = await namespace.serialize(wasm);
  } else {
    if (mode == "run") {
      namespace.compute(wasm, args);
    } else {
      namespace.unserialize(wasm, state[step]);
    }
    if (namespace.changed || mode == "unserialize") {
      var res = await namespace.results(wasm);
      scran_utils.postSuccess(res, step, message);
    }
  }
}

function runAllSteps(wasm, state, mode = "run") {
  runStep(mode, wasm, scran_inputs, "inputs", "Count matrix loaded", 
    { "files": state.files }
  );

  runStep(mode, wasm, scran_qc_metrics, "quality_control_metrics", "QC metrics computed");

  runStep(mode, wasm, scran_qc_thresholds, "quality_control_thresholds", "QC thresholds computed",
    { "nmads": state.params.qc["qc-nmads"] }
  );

  runStep(mode, wasm, scran_qc_filter, "quality_control_filtered", "QC filtering completed", {});

  runStep(mode, wasm, scran_normalization, "normalization", "Log-normalization completed");

  runStep(mode, wasm, scran_model_gene_var, "feature_selection", "Variance modelling completed",
    { "span": state.params.fSelection["fsel-span"] }
  );

  runStep(mode, wasm, scran_pca, "pca", "Principal components analysis completed",
    { "num_hvgs": state.params.pca["pca-hvg"], "num_pcs": state.params.pca["pca-npc"] }
  );

  runStep(mode, wasm, scran_neighbor_index, "neighbor_index", "Neighbor search index constructed",
    { "approximate": state.params.cluster["clus-approx"] }
  );

  // Special async steps - these are run separately.
  var tsne = runStepDimRed(mode, wasm, scran_tsne_monitor, "tsne", "t-SNE completed", {
    "perplexity": state.params.tsne["tsne-perp"],
    "iterations": state.params.tsne["tsne-iter"]
  });

  var umap = runStepDimRed(mode, wasm, scran_umap_monitor, "umap", "UMAP completed", {
    "num_epochs": state.params.umap["umap-epochs"],
    "num_neighbors": state.params.umap["umap-nn"],
    "min_dist": state.params.umap["umap-min_dist"]
  });

  runStep(mode, wasm, scran_snn_neighbors, "snn_find_neighbors", "Neighbor search for clustering complete",
    { "k": state.params.cluster["clus-k"] }
  );

  runStep(mode, wasm, scran_snn_graph, "snn_build_graph", "Shared nearest neighbor graph constructed",
    { "scheme": state.params.cluster["clus-scheme"] }
  );

  runStep(mode, wasm, scran_snn_cluster, "snn_cluster_graph", "Community detection from SNN graph complete",
    { "resolution": state.params.cluster["clus-res"] }
  );

  runStep(mode, wasm, scran_choose_clustering, "choose_clustering", "Clustering of interest chosen",
    { "method": state.params.cluster["clus-method"] }
  );

  runStep(mode, wasm, scran_score_markers, "marker_detection", "Marker detection complete");

  runStep(mode, wasm, scran_custom_markers, "custom_marker_management", "Pruning of custom markers finished");

  return Promise.all([tsne, umap]);
}

/***************************************/

var loaded;
onmessage = function (msg) {
  var self = this;

  const payload = msg.data;
  if (payload.type == "INIT") {
    // TODO: parcel2 doesn't load inline importScripts
    importScripts("./scran.js");
    loaded = loadScran();
    loaded.then(wasm => {
      postMessage({
        type: payload.type,
        msg: `Success: ScranJS/WASM initialized`
      });
    })
  } else if (payload.type == "RUN") {
    loaded.then(wasm => {
      runAllSteps(wasm, payload.payload);
    });
  }
  // custom events from UI
  else if (payload.type == "getMarkersForCluster") {
    loaded.then(wasm => {
      let cluster = payload.payload.cluster;
      let rank_type = payload.payload.rank_type;
      var resp = scran_score_markers.fetchGroupResults(wasm, rank_type, cluster);

      var transferrable = [];
      scran_utils.extractBuffers(resp, transferrable);
      postMessage({
        type: "setMarkersForCluster",
        resp: resp,
        msg: "Success: GET_MARKER_GENE done"
      }, transferrable);
    });
  } else if (payload.type == "getGeneExpression") {
    loaded.then(wasm => {
      let row = payload.payload.gene;
      let row_idx = scran_inputs.fetchGeneNames(wasm).indexOf(row);
      if (row_idx == -1) {
        postMessage({
          type: "geneExpression",
          resp: {
            gene: row
          },
          msg: "Fail: GET_GENE_EXPRESSION"
        });
      } else {
        var vec = scran_normalization.fetchExpression(wasm, row_idx);
        postMessage({
          type: "setGeneExpression",
          resp: {
            gene: row,
            expr: vec
          },
          msg: "Success: GET_GENE_EXPRESSION done"
        }, [vec.buffer]);
      }
    });
  } else if (payload.type == "computeCustomMarkers") {
    loaded.then(wasm => {
      scran_custom_markers.addSelection(wasm, payload.payload.id, payload.payload.selection);
      postMessage({
        type: "computeCustomMarkers",
        msg: "Success: COMPUTE_CUSTOM_MARKERS done"
      });
    });
  } else if (payload.type == "getMarkersForSelection") {
    loaded.then(wasm => {
      var resp = scran_custom_markers.fetchResults(wasm, payload.payload.cluster, payload.payload.rank_type);
      var transferrable = [];
      scran_utils.extractBuffers(resp, transferrable);
      postMessage({
        type: "setMarkersForCustomSelection",
        resp: resp,
        msg: "Success: GET_MARKER_GENE done"
      }, transferrable);
    });
  } else if (payload.type == "removeCustomMarkers") {
    loaded.then(wasm => {
      scran_custom_markers.removeSelection(Wasm, payload.payload.id);
    });
  } else {
    console.log("MIM:::msg type incorrect")
  }
}
