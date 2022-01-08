importScripts("./WasmBuffer.js");
importScripts("./HDF5Reader.js");
importScripts("./_utils_serialize.js");
importScripts("./_utils.js");
importScripts("./_utils_viz_parent.js");
importScripts("./_utils_markers.js");

// Some external dependencies.
var window = {};
importScripts("https://cdn.jsdelivr.net/gh/usnistgov/jsfive@master/dist/hdf5.js");
var hdf5 = window.hdf5;
importScripts("https://cdn.jsdelivr.net/pako/1.0.3/pako.min.js");
var pako = window.pako;
importScripts("https://cdn.jsdelivr.net/npm/d3-dsv@3");
importScripts("https://cdn.jsdelivr.net/npm/hash-wasm@4/dist/md5.umd.min.js");

importScripts("./_inputs.js");
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
importScripts("./KanaDBHandler.js");

/***************************************/

function runAllSteps(wasm, mode = "run", state = null) {
  var response;
  if (mode === "serialize") {
    response = {};
  } else {
    if (state == null) {
      throw "'state' must be supplied if 'mode' is not 'serialize'";
    }
    if (mode === "unserialize") {
      response = { "params": {} };
    }
  }

  // Creating helper functions.
  var postSuccess = function (namespace, step, message) {
    if (namespace.changed || mode == "unserialize") {
      scran_utils.postSuccess(namespace.results(wasm), step, message);
    }
  }

  var postSuccessAsync = function (namespace, step, message) {
    if (namespace.changed || mode == "unserialize") {
      namespace.results(wasm)
        .then(res => {
          scran_utils.postSuccess(res, step, message);
        });
    }
  }

  var addToObject = function (object, property, value) {
    if (property in object) {
      object[property] = { ...object[property], ...value };
    } else {
      object[property] = value;
    }
  }

  // Running through all steps.
  {
    let step = "inputs";
    if (mode === "serialize") {
      response[step] = scran_inputs.serialize(wasm)
    } else {
      if (mode == "run") {
        scran_inputs.compute(wasm, {
          "format": state.files.format,
          "files": state.files.files
        });
      } else {
        scran_inputs.unserialize(wasm, state[step]);
        response["files"] = {
          "format": "kana",
          "files": []
        };
      }
      postSuccess(scran_inputs, step, "Count matrix loaded");
    }
  }

  {
    let step = "quality_control_metrics";
    if (mode === "serialize") {
      response[step] = scran_qc_metrics.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_qc_metrics.compute(wasm, {});
      } else {
        scran_qc_metrics.unserialize(wasm, state[step]);
      }
      postSuccess(scran_qc_metrics, step, "QC metrics computed");
    }
  }

  {
    let step = "quality_control_thresholds";
    if (mode === "serialize") {
      response[step] = scran_qc_thresholds.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_qc_thresholds.compute(wasm, {
          "nmads": state.params.qc["qc-nmads"]
        });
      } else {
        scran_qc_thresholds.unserialize(wasm, state[step]);
        response["params"]["qc"] = {
          "qc-nmads": state[step].parameters.nmads
        };
      }
      postSuccess(scran_qc_thresholds, step, "QC thresholds computed");
    }
  }

  {
    let step = "quality_control_filtered";
    if (mode == "serialize") {
      response[step] = scran_qc_filter.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_qc_filter.compute(wasm, {});
      } else {
        scran_qc_filter.unserialize(wasm, state[step]);
      }
      postSuccess(scran_qc_filter, step, "QC filtering completed");
    }
  }

  {
    let step = "normalization";
    if (mode == "serialize") {
      response[step] = scran_normalization.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_normalization.compute(wasm, {});
      } else {
        scran_normalization.unserialize(wasm, state[step]);
      }
      postSuccess(scran_normalization, step, "Log-normalization completed");
    }
  }

  {
    let step = "feature_selection";
    if (mode == "serialize") {
      response[step] = scran_model_gene_var.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_model_gene_var.compute(wasm, {
          "span": state.params.fSelection["fsel-span"]
        });
      } else {
        scran_model_gene_var.unserialize(wasm, state[step]);
        response["params"]["fSelection"] = {
          "fsel-span": state[step].parameters.span
        };
      }
      postSuccess(scran_model_gene_var, step, "Variance modelling completed");
    }
  }

  {
    let step = "pca";
    if (mode == "serialize") {
      response[step] = scran_pca.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_pca.compute(wasm, {
          "num_hvgs": state.params.pca["pca-hvg"],
          "num_pcs": state.params.pca["pca-npc"]
        });
      } else {
        scran_pca.unserialize(wasm, state[step]);
        response["params"]["pca"] = {
          "pca-hvg": state[step].parameters.num_hvgs,
          "pca-npc": state[step].parameters.num_pcs
        };
      }
      postSuccess(scran_pca, step, "Principal components analysis completed");
    }
  }

  {
    let step = "neighbor_index";
    if (mode == "serialize") {
      response[step] = scran_neighbor_index.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_neighbor_index.compute(wasm, {
          "approximate": state.params.cluster["clus-approx"]
        });
      } else {
        scran_neighbor_index.unserialize(wasm, state[step]);
        addToObject(response["params"], "cluster", {
          "clus-approx": state[step].parameters.approximate
        });
      }
      postSuccess(scran_neighbor_index, step, "Neighbor search index constructed");
    }
  }

  // Need to handle async promises in responses here.
  var tsne;
  {
    let step = "tsne";
    if (mode == "serialize") {
      tsne = scran_tsne_monitor.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_tsne_monitor.compute(wasm, {
          "perplexity": state.params.tsne["tsne-perp"],
          "iterations": state.params.tsne["tsne-iter"],
          "animate": state.params.tsne["animate"]
        });
      } else {
        scran_tsne_monitor.unserialize(wasm, state[step]);
        addToObject(response["params"], "tsne", {
          "tsne-perp": state[step].parameters.perplexity,
          "tsne-iter": state[step].parameters.iterations,
          "animate": state[step].parameters.animate
        });
      }
      postSuccessAsync(scran_tsne_monitor, step, "t-SNE completed");
    }
  }

  var umap;
  {
    let step = "umap";
    if (mode == "serialize") {
      umap = scran_umap_monitor.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_umap_monitor.compute(wasm, {
          "num_epochs": state.params.umap["umap-epochs"],
          "num_neighbors": state.params.umap["umap-nn"],
          "min_dist": state.params.umap["umap-min_dist"],
          "animate": state.params.umap["animate"]
        });
      } else {
        scran_umap_monitor.unserialize(wasm, state[step]);
        addToObject(response["params"], "umap", {
          "num_epochs": state[step].parameters.num_epochs,
          "num_neighbors": state[step].parameters.num_neighbors,
          "min_dist": state[step].parameters.min_dist,
          "animate": state[step].parameters.animate
        });
      }
      postSuccessAsync(scran_umap_monitor, step, "UMAP completed");
    }
  }

  // Back to normal programming.
  {
    let step = "snn_find_neighbors";
    if (mode == "serialize") {
      response[step] = scran_snn_neighbors.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_snn_neighbors.compute(wasm, {
          "k": state.params.cluster["clus-k"]
        });
      } else {
        scran_snn_neighbors.unserialize(wasm, state[step]);
        addToObject(response["params"], "cluster", {
          "clus-k": state[step].parameters.k
        });
      }
      postSuccess(scran_snn_neighbors, step, "Shared nearest neighbor search completed");
    }
  }

  {
    let step = "snn_build_graph";
    if (mode == "serialize") {
      response[step] = scran_snn_graph.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_snn_graph.compute(wasm, {
          "scheme": state.params.cluster["clus-scheme"]
        });
      } else {
        scran_snn_graph.unserialize(wasm, state[step]);
        addToObject(response["params"], "cluster", {
          "clus-scheme": state[step].parameters.scheme
        });
      }
      postSuccess(scran_snn_graph, step, "Shared nearest neighbor graph constructed");
    }
  }

  {
    let step = "snn_cluster_graph";
    if (mode == "serialize") {
      response[step] = scran_snn_cluster.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_snn_cluster.compute(wasm, {
          "resolution": state.params.cluster["clus-res"]
        });
      } else {
        scran_snn_cluster.unserialize(wasm, state[step]);
        addToObject(response["params"], "cluster", {
          "clus-res": state[step].parameters.resolution
        });
      }
      postSuccess(scran_snn_cluster, step, "Community detection from SNN graph complete");
    }
  }

  {
    let step = "choose_clustering";
    if (mode == "serialize") {
      response[step] = scran_choose_clustering.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_choose_clustering.compute(wasm, {
          "method": state.params.cluster["clus-method"]
        });
      } else {
        scran_choose_clustering.unserialize(wasm, state[step]);
        addToObject(response["params"], "cluster", {
          "clus-method": state[step].parameters.method
        });
      }
      postSuccess(scran_choose_clustering, step, "Clustering of interest chosen");
    }
  }

  {
    let step = "marker_detection";
    if (mode == "serialize") {
      response[step] = scran_score_markers.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_score_markers.compute(wasm, {});
      } else {
        scran_score_markers.unserialize(wasm, state[step]);
      }
      postSuccess(scran_score_markers, step, "Marker detection complete");
    }
  }

  {
    let step = "custom_marker_management";
    if (mode == "serialize") {
      response[step] = scran_custom_markers.serialize(wasm);
    } else {
      if (mode == "run") {
        scran_custom_markers.compute(wasm, {});
      } else {
        scran_custom_markers.unserialize(wasm, state[step]);
      }
      postSuccess(scran_custom_markers, step, "Pruning of custom markers finished");
    }
  }

  if (mode == "serialize") {
    return Promise.all([tsne, umap])
      .then(done => {
        response.tsne = done[0];
        response.umap = done[1];
        return response;
      });
  } else {
    return response;
  }
}

/***************************************/

var loaded;
onmessage = function (msg) {

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
    });

    kana_db.initialize()
    .then(result => {
      if (result !== null) {
        postMessage({
          type: "KanaDB_store",
          resp: result,
          msg: "Success"
        });
      } else {
        postMessage({
          type: "KanaDB_ERROR",
          msg: `Fail: Cannot initialize DB`
        });
      }
    });

  } else if (payload.type == "RUN") {
    loaded.then(wasm => {
      runAllSteps(wasm, "run", payload.payload);
    });

/**************** LOADING EXISTING ANALYSES *******************/
  } else if (payload.type == "LOAD") { 
    if (payload.payload.files.format == "kana") {
      const reader = new FileReaderSync();
      var f = payload.payload.files.files.file[0];
      loaded.then(async (wasm) => {
        var contents = await scran_utils_serialize.load(reader.readAsArrayBuffer(f));
        var response = runAllSteps(wasm, "unserialize", contents);
        postMessage({
          type: "loadedParameters",
          resp: response
        });
      });

    } else if (payload.payload.files.format == "kanadb"){
      var id = payload.payload.files.files.file;
      kana_db.loadAnalysis(id)
      .then(async (res) => {
        if (res == null) {
          postMessage({
            type: "KanaDB_ERROR",
            msg: `Fail: cannot load analysis ID '${id}'`
          });
        } else {
          var wasm = await loaded;
          var contents = await scran_utils_serialize.load(res);
          var response = await runAllSteps(wasm, "unserialize", contents);
          postMessage({
            type: "loadedParameters",
            resp: response
          });
        }
      });
    }

  } else if (payload.type == "EXPORT") { // exporting an analysis
    loaded.then(async (wasm) => {
      var state = await runAllSteps(wasm, "serialize");
      var output = await scran_utils_serialize.save(state, "full");
      postMessage({
        type: "exportState",
        resp: output,
        msg: "Success: application state exported"
      }, [output]);
    });

  } else if (payload.type == "SAVEKDB") { // save analysis to inbrowser indexedDB 
    var id = payload.payload.id;
    loaded.then(async (wasm) => {
      var state = await runAllSteps(wasm, "serialize");
      var output = await scran_utils_serialize.save(state, "KanaDB");
      var result = await kana_db.saveAnalysis(id, output.state, output.file_ids);
      if (result) { 
        postMessage({
            type: "KanaDB_store",
            resp: result,
            msg: `Success: Saved analysis to cache (${id})`
        });
      } else {
        postMessage({
          type: "KanaDB_ERROR",
          msg: `Fail: Cannot save analysis to cache (${id})`
        });
      }
    });

  } else if (payload.type == "REMOVEKDB") { // remove a saved analysis
    var id = payload.payload.id;
    kana_db.removeAnalysis(id)
    .then(result => {
      if (result !== null) {
        postMessage({
          type: "KanaDB_store",
          resp: result,
          msg: `Success: Removed file from cache (${id})`
        });
      } else {
        postMessage({
          type: "KanaDB_ERROR",
          msg: `fail: cannot remove file from cache (${id})`
        });
      }
    });

/**************** OTHER EVENTS FROM UI *******************/
  } else if (payload.type == "getMarkersForCluster") { 
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
      let row_idx = payload.payload.gene;
      var vec = scran_normalization.fetchExpression(wasm, row_idx);
      postMessage({
        type: "setGeneExpression",
        resp: {
          gene: row_idx,
          expr: vec
        },
        msg: "Success: GET_GENE_EXPRESSION done"
      }, [vec.buffer]);
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

  } else if (payload.type == "animateTSNE") {
    loaded.then(async (wasm) => {
      await scran_tsne_monitor.animate(wasm);
      var res = await scran_tsne_monitor.results(wasm);
      scran_utils.postSuccess(res, "tsne", "Resending t-SNE coordinates");
    });

  } else if (payload.type == "animateUMAP") {
    loaded.then(async (wasm) => {
      await scran_umap_monitor.animate(wasm);
      var res = await scran_umap_monitor.results(wasm);
      scran_utils.postSuccess(res, "umap", "Resending UMAP coordinates");
    });

  } else {
    console.log("MIM:::msg type incorrect")
  }
}
