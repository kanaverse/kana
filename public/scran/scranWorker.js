importScripts("./WasmBuffer.js");
importScripts("./_utils.js");
importScripts("./_utils_viz_parent.js");

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

function runAllSteps(wasm, state) {
  scran_inputs.compute(wasm, { "files": state.files });
  if (scran_inputs.changed) {
    var mat = scran_inputs.fetchCountMatrix(wasm);
    postMessage({
      type: "inputs_DIMS",
      resp: `${mat.nrow()} X ${mat.ncol()}`,
      msg: `Success: Data loaded, dimensions: ${mat.nrow()}, ${mat.ncol()}`
    });
  }
  scran_utils.postSuccess(wasm, scran_inputs, "inputs", "count matrix loaded"); 

  scran_qc_metrics.compute(wasm, {});
  scran_utils.postSuccess(wasm, scran_qc_metrics, "quality_control_metrics", "QC metrics computed");

  scran_qc_thresholds.compute(wasm, { "nmads": state.params.qc["qc-nmads"] });
  scran_utils.postSuccess(wasm, scran_qc_thresholds, "quality_control_thresholds", "QC thresholds computed");

  scran_qc_filter.compute(wasm, {});
  if (scran_qc_filter.changed) {
    var mat = scran_qc_filter.fetchFilteredMatrix(wasm);
    postMessage({
      type: "qc_filter_DIMS",
      resp: `${mat.nrow()} X ${mat.ncol()}`,
      msg: `Success: Data filtered, dimensions: ${mat.nrow()}, ${mat.ncol()}`
    });

    // We free custom marker results here, because a custom selection is only
    // invalidated when the cell number or ordering changes... and this is the
    // latest point at which the cell number or ordering can change.
//    freeCustomMarkers(); // TODO: put this back in.
  }
  scran_utils.postSuccess(wasm, scran_qc_filter, "quality_control_filtered", "QC filtering completed");

  scran_normalization.compute(wasm, {});
  scran_utils.postSuccess(wasm, scran_normalization, "normalization", "Log-normalization completed");

  scran_model_gene_var.compute(wasm, { "span": state.params.fSelection["fsel-span"] });
  scran_utils.postSuccess(wasm, scran_model_gene_var, "feature_selection", "Variance modelling completed");

  scran_pca.compute(wasm, { "num_hvgs": state.params.pca["pca-hvg"], "num_pcs": state.params.pca["pca-npc"] });
  scran_utils.postSuccess(wasm, scran_pca, "pca", "Principal components analysis completed");

  scran_neighbor_index.compute(wasm, { "approximate": state.params.cluster["clus-approx"] });
  scran_utils.postSuccess(wasm, scran_neighbor_index, "neighbor_index", "Neighbor search index constructed");

  scran_tsne_monitor.compute(wasm, {
    "perplexity": state.params.tsne["tsne-perp"],
    "iterations": state.params.tsne["tsne-iter"]
  });

  scran_umap_monitor.compute(wasm, {
    "num_epochs": state.params.umap["umap-epochs"],
    "num_neighbors": state.params.umap["umap-nn"],
    "min_dist": state.params.umap["umap-min_dist"]
  });

  scran_snn_neighbors.compute(wasm, { "k": state.params.cluster["clus-k"] });
  scran_utils.postSuccess(wasm, scran_snn_neighbors, "snn_find_neighbors", "Neighbor search for clustering complete");

  scran_snn_graph.compute(wasm, { "scheme": state.params.cluster["clus-scheme"] });
  scran_utils.postSuccess(wasm, scran_snn_graph, "snn_build_graph", "Shared nearest neighbor graph constructed");

  scran_snn_cluster.compute(wasm, { "resolution": state.params.cluster["clus-res"] });
  scran_utils.postSuccess(wasm, scran_snn_cluster, "snn_cluster_graph", "Community detection from SNN graph complete");

  scran_choose_clustering.compute(wasm, { "method": state.params.cluster["clus-method"] });
  scran_utils.postSuccess(wasm, scran_choose_clustering, "choose_clustering", "Clustering of interest chosen");

  scran_score_markers.compute(wasm, {});
  scran_utils.postSuccess(wasm, scran_score_markers, "marker_detection", "Marker detection complete");
}

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
  else if (payload.type == "setQCThresholds") {
    data.thresholds = payload.input;

    postMessage({
      type: "qc_DIMS",
      resp: `${data.filteredMatrix.nrow()} X ${data.filteredMatrix.ncol()}`,
      msg: `Success: QC - Thresholds Sync Complete, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}`
    })
  } else if (payload.type == "getMarkersForCluster") {
    loaded.then(wasm => {
      let cluster = payload.payload.cluster;
      let rank_type = payload.payload.rank_type;
      var marker_results = utils.cached.marker_detection.raw;
      var resp = formatMarkerStats(wasm, marker_results, rank_type, cluster);
      postMessage({
        type: "setMarkersForCluster",
        resp: resp,
        msg: "Success: GET_MARKER_GENE done"
      }, [resp.means.buffer, resp.detected.buffer, resp.lfc.buffer, resp.delta_d.buffer]);
    });
  } else if (payload.type == "getGeneExpression") {
    loaded.then(wasm => {
      let row = payload.payload.gene;
      var t0 = performance.now();
      var mat = fetchNormalizedMatrix();
      var t1 = performance.now();
      var gExp_cached = utils.initCache("fetchGeneExpr");
      // try {
      var buffer = utils.allocateBuffer(wasm, mat.ncol(), "Float64Array", gExp_cached);

      // find position in genes inputs
      let input_row_idx = utils.cached.inputs.genes.indexOf(row);
      // find position in permutation matrix.
      let row_idx = utils.cached.normalization.genes.indexOf(input_row_idx);

      var vec = null;
      if (row_idx != -1) {
        mat.row(row_idx, buffer.ptr)
        vec = JSON.parse(JSON.stringify(buffer.array()));
        postMessage({
          type: "setGeneExpression",
          resp: {
            gene: row,
            expr: vec
          },
          msg: "Success: GET_GENE_EXPRESSION done"
        });
      } else {
        postMessage({
          type: "geneExpression",
          resp: {
            gene: row
          },
          msg: "Fail: GET_GENE_EXPRESSION"
        });
      }
      // } finally {
      // buffer.free();
      // }
    });
  } else if (payload.type == "computeCustomMarkers") {
    loaded.then(wasm => {
      var custom = utils.initCache("custom_selection");
      if (!("computed" in custom)) {
        custom.computed = {};          
      }

      var id = payload.payload.id;
      var results = custom.computed[id];
      if (results === undefined) {
        var mat = fetchNormalizedMatrix();
        var buffer = utils.allocateBuffer(wasm, mat.ncol(), "Int32Array", custom, "buffer");
        var tmp = buffer.array();
        tmp.fill(0);

        var current_selection = payload.payload.selection; //select contains all indices of cells selected from the tsne plot
        current_selection.forEach(element => { tmp[element] = 1; });

        custom.computed[id] = wasm.score_markers(mat, buffer.ptr, false, 0); // assumes that we have at least one cell in and outside the selection!
      }

      postMessage({
        type: "computeCustomMarkers",
        msg: "Success: COMPUTE_CUSTOM_MARKERS done"
      });
    });
  } else if (payload.type == "getMarkersForSelection") {
    loaded.then(wasm => {
      var custom = utils.initCache("custom_selection");
      let rank_type = payload.payload.rank_type;
      var id = payload.payload.cluster;
      var results = custom.computed[id];
      var resp = formatMarkerStats(wasm, results, rank_type, 1); 
      postMessage({
        type: "setMarkersForCustomSelection",
        resp: resp,
        msg: "Success: GET_MARKER_GENE done"
      }, [resp.means.buffer, resp.detected.buffer, resp.lfc.buffer, resp.delta_d.buffer]);
    });
  } else if (payload.type == "removeCustomMarkers") {
    var custom = utils.initCache("custom_selection");
    var id = payload.payload.id;
    utils.freeCache(custom.computed[id]);
    delete custom.computed[id];
  } else {
    console.log("MIM:::msg type incorrect")
  }
}
