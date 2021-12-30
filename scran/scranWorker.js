importScripts("./WasmBuffer.js");
importScripts("./utils.js");
importScripts("https://cdn.jsdelivr.net/npm/d3-dsv@3");
importScripts("https://cdn.jsdelivr.net/npm/d3-scale@4");

/* 
 * Step executor functions. 
 * 
 * Each function corresponds to a standalone step in the linear analysis. It
 * should take an `args` object containing all of the user-specified arguments
 * for this step. These are checked against the existing argument values (if
 * any) in `utils.parameters`, and if they are different, the step is rerun. 
 *
 * Results may be cached in `utils.cached` for use in downstream steps; use
 * `utils.initCache` to set up an appropriate cache location. Note that each
 * step is responsible for the memory management of its cached results; for
 * Wasm-originating objects, we suggest using `utils.freeCache`, while for
 * JS-allocated buffers on the Wasm heap, we suggest using
 * `utils.allocateBuffer`.
 *
 * On success, the previous values in the corresponding entry of
 * `utils.parameters` are replaced by `args` so that the next run of the same
 * step can be skipped if there is no change. The step is also added to
 * `utils.upstream` so that any downstream steps know that they need to be
 * re-run if they detect dependencies have rerun. This is all handled by
 * `runStep`, which wraps the boilerplate around the actual step. 
 *
 * The return value contains an object to be passed to the main thread.  This
 * should not contain any Wasm-originating objects or allocated buffers.
 */

function loadFiles(wasm, args) {
  var step = "inputs";

  // Files are not directly comparable, so we just check their name and size.
  var mock_mtx = [];
  for (const f of args.files[0]) {
    mock_mtx.push({ "name": f.name, "size": f.size });
  }
  var mock_barcodes = [];
  for (const f of args.files[1]) {
    mock_barcodes.push({ "name": f.name, "size": f.size });
  }
  var mock_genes = [];
  for (const f of args.files[1]) {
    mock_genes.push({ "name": f.name, "size": f.size });
  }
  var mock_args = { "matrix": mock_mtx, "barcodes": mock_barcodes, "genes": mock_genes };

  return utils.runStep(step, mock_args, [], () => {
    var input = args.files;
    var mtx_files = input[0];
    var input_cache = utils.initCache(step);
    utils.freeCache(input_cache["matrix"]);

    // TODO: use ReadableStream to read directly into 'buffer'.
    var reader = new FileReaderSync();
    var file_size = mtx_files[0].size;
    var contents = reader.readAsArrayBuffer(mtx_files[0]);
    var contents = new Uint8Array(contents);

    var buffer = new WasmBuffer(wasm, file_size, "Uint8Array");
    try {
      buffer.array().set(contents);
      var ext = mtx_files[0].name.split('.').pop();
      var is_compressed = (ext == "gz");
      utils.cached.inputs.matrix = wasm.read_matrix_market(buffer.ptr, mtx_files[0].size, is_compressed);
    } finally {
      buffer.free();
    }

    const tsv = d3.dsvFormat("\t");

    var barcode_file = input[1];
    if (barcode_file.length > 0) {
      var reader = new FileReaderSync();
      var file_size = barcode_file[0].size;
      var buffer = reader.readAsText(barcode_file[0]);
      utils.cached.inputs.barcodes = tsv.parse(buffer);
    }

    var genes_file = input[2];
    if (genes_file.length > 0) {
      var reader = new FileReaderSync();
      var file_size = genes_file[0].size;
      var buffer = reader.readAsText(genes_file[0]);
      utils.cached.inputs.genes = tsv.parse(buffer);
    } else {
      let genes = []
      for (let i = 0; i < utils.cached.inputs.matrix.nrow(); i++) {
        genes.push(`Gene ${i + 1}`);
      }
      utils.cached.inputs.genes = genes;
    }

    return {};
  });
}

function fetchCountMatrix() {
  return utils.cached["inputs"]["matrix"];
}

function computeQualityControlMetrics(wasm, args) {
  var step = "quality_control_metrics";
  return utils.runStep(step, args, ["inputs"], () => {
    var qcm_cache = utils.initCache(step);
    utils.freeCache(qcm_cache["raw"]);

    var mat = fetchCountMatrix();

    // Testing:
    var nsubsets = 1;
    var subsets = new WasmBuffer(wasm, mat.nrow() * nsubsets, "Uint8Array");
    try {
      var subvec = subsets.array();
      subvec.set(subvec.map(() => 0));
      qcm_cache.raw = wasm.per_cell_qc_metrics(mat, nsubsets, subsets.ptr);
    } finally {
      subsets.free();
    }

    // compute distributions for all
    var maxDist = 100;
    var distributions = {};
    var ranges = {};
    var qc_output = qcm_cache["raw"];

    ["sums", "detected", "proportion"].forEach(function (x, i) {
      var current;
      switch (x) {
        case "sums":
          current = qc_output.sums();
          break;
        case "detected":
          current = qc_output.detected();
          break;
        case "proportion":
          current = qc_output.subset_proportions(0);
      };

      // if (x != "proportion") {
      //   self.qc_metrics[x] = self.qc_metrics[x].map(x => Math.log2(x + 1));
      // }

      var [tmin, tmax] = utils.getMinMax(current);
      ranges[x] = [tmin, tmax];

      // var tscale = d3.scaleLinear()
      //   .domain([tmin, tmax])
      //   .range([0, 100]);

      // var m = (100) / (tmax - tmin);
      // var b = -m * tmin;

      // distributions[x] = new Array(maxDist).fill(0);
      // current.forEach(function (y, j) {
      //   var idx = Math.ceil((m * y) + b);
      //   distributions[x][idx]++;
      // });
    });

    return {
      "data": {
        "sums": qc_output.sums(),
        "detected": qc_output.detected(),
        "proportion": qc_output.subset_proportions(0)
      },
      // "sums": distributions.sums,
      // "detected": distributions.detected,
      // "proportion": distributions.proportion,
      "ranges": ranges,
    };
  });
}

function computeQualityControlThresholds(wasm, args) {
  var step = "quality_control_thresholds";
  return utils.runStep(step, args, ["quality_control_metrics"], () => {
    var qct_cache = utils.initCache(step);
    utils.freeCache(qct_cache["raw"]);

    var metrics = utils.cached["quality_control_metrics"]["raw"];
    var filter_output = wasm.per_cell_qc_filters(metrics, false, 0, args.nmads);
    qct_cache["raw"] = filter_output;

    return {
      "sums": filter_output.thresholds_sums()[0],
      "detected": filter_output.thresholds_detected()[0],
      "proportion": filter_output.thresholds_proportions(0)[0] // TODO: generalize...
    };
  });
}

function filterCells(wasm, args) {
  var step = "quality_control_filtered";
  return utils.runStep(step, args, ["quality_control_thresholds"], () => {
    var qcf_cache = utils.initCache(step);
    utils.freeCache(qcf_cache["raw"]);

    var mat = fetchCountMatrix();
    var discards = utils.allocateBuffer(wasm, mat.ncol(), "Uint8Array", qcf_cache, "discard");

    // Possibly use a different filtering criterion here, as long 
    // as the choice of what to discard is put into 'discards'.
    var thresholds = utils.cached["quality_control_thresholds"]["raw"];
    discards.array().set(thresholds.discard_overall());

    qcf_cache["raw"] = wasm.filter_cells(mat, discards.ptr, false);

    return {};
  });
}

function fetchFilteredMatrix() { // helper for downstream functions.
  return utils.cached["quality_control_filtered"]["raw"];
}

function logNormCounts(wasm, args) {
  var step = "normalization";
  return utils.runStep(step, args, ["quality_control_metrics", "quality_control_filtered"], () => {
    var norm_cache = utils.initCache(step);
    utils.freeCache(norm_cache["raw"]);
    var mat = fetchFilteredMatrix();

    // Reusing the totals computed earlier.
    var sf_buffer = utils.allocateBuffer(wasm, mat.ncol(), "Float64Array", norm_cache);
    var sums = utils.cached["quality_control_metrics"]["raw"].sums();
    var discards = utils.cached["quality_control_filtered"]["discard"].array();

    var size_factors = sf_buffer.array();
    var j = 0;
    for (var i = 0; i < discards.length; ++i) {
        if (!discards[i]) {
            size_factors[j] = sums[i];
            j++;
        }
    }

    if (j != mat.ncol()) {
        throw "normalization and filtering are not in sync";
    }

    norm_cache["raw"] = wasm.log_norm_counts(mat, true, sf_buffer.ptr, false, 0);
    return {};
  });
}

function fetchNormalizedMatrix() { // helper for downstream functions.
  return utils.cached["normalization"]["raw"];
}

function modelGeneVar(wasm, args) {
  var step = "feature_selection";
  return utils.runStep(step, args, ["normalization"], () => {
    var feat_cached = utils.initCache(step);
    utils.freeCache(feat_cached["raw"]);

    var mat = fetchNormalizedMatrix();
    var model_output = wasm.model_gene_var(mat, false, 0, args.span);
    feat_cached["raw"] = model_output;

    feat_cached.residuals = model_output.residuals(0).slice();
    feat_cached.sorted_residuals = feat_cached.residuals.slice(); // a separate copy.
    feat_cached.sorted_residuals.sort();

    return {
      "means": model_output.means(0).slice(),
      "vars": model_output.variances(0).slice(),
      "fitted": model_output.fitted(0).slice(),
      "resids": feat_cached.residuals
    };
  });
}

function runPCA(wasm, args) {
  var step = "pca";
  return utils.runStep(step, args, ["feature_selection"], () => {
    var pca_cached = utils.initCache(step);
    utils.freeCache(pca_cached["raw"]);

    var feat_cached = utils.cached.feature_selection;
    var threshold_at = feat_cached.sorted_residuals[feat_cached.sorted_residuals.length - args.num_hvgs];

    var mat = fetchNormalizedMatrix();
    var sub = new WasmBuffer(wasm, mat.nrow(), "Uint8Array");
    try {
      sub.array().forEach((element, index, array) => {
        array[index] = feat_cached.residuals[index] >= threshold_at;
      });
      pca_cached.raw = wasm.run_pca(mat, args.num_pcs, true, sub.ptr, false);
    } finally {
      sub.free();
    }

    var pca_output = pca_cached.raw;
    var var_exp = pca_output.variance_explained().slice();
    var total_var = pca_output.total_variance();
    for (var n = 0; n < var_exp.length; n++) {
      var_exp[n] /= total_var;
    }

    return {
      "var_exp": var_exp
    };
  });
}

function fetchPCs() {
  return {
    "matrix": utils.cached.pca.raw.pcs(),
    "num_pcs": utils.parameters.pca.num_pcs,
    "num_obs": fetchNormalizedMatrix().ncol()
  }
}

function buildNeighborIndex(wasm, args) {
  var step = "neighbor_index";
  return utils.runStep(step, args, ["pca"], () => {
    var neighbor_cached = utils.initCache(step);
    utils.freeCache(neighbor_cached["raw"]);
    var pcs = fetchPCs();
    neighbor_cached.raw = wasm.build_neighbor_index(pcs.matrix.byteOffset, pcs.num_pcs, pcs.num_obs, args.approximate);
    return {};
  });
}

function fetchNeighborIndex() {
  return utils.cached["neighbor_index"]["raw"];
}

function findSNNeighbors(wasm, args) {
  var step = "snn_find_neighbors";
  return utils.runStep(step, args, ["neighbor_index"], () => {
    var snn_cached = utils.initCache(step);
    utils.freeCache(snn_cached["raw"]);
    var nn_index = fetchNeighborIndex();
    snn_cached.raw = wasm.find_nearest_neighbors(nn_index, args.k);
    return {};
  });
}

function buildSNNGraph(wasm, args) {
  var step = "snn_build_graph";
  return utils.runStep(step, args, ["snn_find_neighbors"], () => {
    var snn_cached = utils.initCache(step);
    utils.freeCache(snn_cached["raw"]);
    var neighbors = utils.cached.snn_find_neighbors.raw;
    snn_cached.raw = wasm.build_snn_graph(neighbors, args.scheme);
    return {};
  });
}

function clusterSNNGraph(wasm, args) {
  var step = "snn_cluster_graph";
  return utils.runStep(step, args, ["snn_build_graph"], () => {
    var snn_cached = utils.initCache(step);
    utils.freeCache(snn_cached["raw"]);

    var graph = utils.cached.snn_build_graph.raw;
    var clustering = wasm.cluster_snn_graph(graph, args.resolution);
    snn_cached.raw = clustering;

    var arr_clust = clustering.membership(clustering.best()).slice();
    return {
      "clusters": arr_clust
    };
  });
}

function chooseClustering(wasm, args) {
  var step = "choose_clustering";
  return utils.runStep(step, args, ["snn_cluster_graph"], () => {
    var clust_cached = utils.initCache(step);
    var num_obs = fetchNormalizedMatrix().ncol();
    var buffer = utils.allocateBuffer(wasm, num_obs, "Int32Array", clust_cached);

    var vec = buffer.array();
    if (args.method == "snn_graph") {
      var clustering = utils.cached["snn_cluster_graph"].raw;
      var src = clustering.membership(clustering.best());
      vec.set(src);
    }

    return {};
  });
}

function scoreMarkers(wasm, args) {
  var step = "marker_detection";
  return utils.runStep(step, args, ["choose_clustering", "normalization"], () => {
    var marker_cached = utils.initCache(step);
    utils.freeCache(marker_cached["raw"]);

    var mat = fetchNormalizedMatrix();
    var clusters = utils.cached["choose_clustering"].buffer;
    marker_cached.raw = wasm.score_markers(mat, clusters.ptr, false, 0);

    return {};
  });
}

/* 
 * Special functions for launching t-SNE and UMAP.
 *
 * These steps are run in separate workers, and need some accommodation for the
 * message passing. In particular, each function is responsible for initialization
 * of the worker, which persists for the lifetime of the application. We assume 
 * that the worker will wait for initialization before processing any RUN message.
 * 
 * Data are passed between workers using transferrable TypedArray. Initial
 * attempts with the SharedArrayBuffers are too fragile as reallocations seem
 * to invalidate existing references to the heap - I haven't figured out how
 * to avoid this. So we'll just copy into a TypedArray and transfer it.
 *
 * They also need to handle the animation.
 */

function transferNeighbors(wasm, k) {
  var nn_index = fetchNeighborIndex();

  var output = { "num_obs": nn_index.num_obs() };
  var results = null, rbuf = null, ibuf = null, dbuf = null;
  try {
    results = wasm.find_nearest_neighbors(nn_index, k);

    rbuf = new WasmBuffer(wasm, results.num_obs(), "Int32Array");
    ibuf = new WasmBuffer(wasm, results.size(), "Int32Array");
    dbuf = new WasmBuffer(wasm, results.size(), "Float64Array");

    results.serialize(rbuf.ptr, ibuf.ptr, dbuf.ptr);
    output["size"] = results.size();
    output["runs"] = rbuf.array().slice();
    output["indices"] = ibuf.array().slice();
    output["distances"] = dbuf.array().slice();

  } finally {
    if (results !== null) {
      results.delete();
    }
    if (rbuf !== null) {
      rbuf.free();
    }
    if (ibuf !== null) {
      ibuf.free();
    }
    if (dbuf !== null) {
      dbuf.free();
    }
  }

  return output;
}

var tsne_worker = null;
function launchTsne(wasm, params) {
  if (tsne_worker == null) {
    tsne_worker = new Worker("./tsneWorker.js");
    tsne_worker.postMessage({ "cmd": "INIT" });

    tsne_worker.onmessage = function (msg) {
      var type = msg.data.type;
      if (type == "run_tsne_DATA") {
        var x = msg.data.resp.x;
        var y = msg.data.resp.y;
        postMessage({
          type: "tsne_DATA",
          resp: { "x": x, "y": y },
          msg: "Success: t-SNE run completed"
        }, [x.buffer, y.buffer]);
      } else if (type == "error") {
        throw msg.data.object;
      }
    }
  }

  // Finding the neighbors on the linear worker.
  var step = "tsne_neighbors";
  var nn_out = utils.runStep(step, { "perplexity": params.perplexity }, ["neighbor_index"], () => {
    var k = wasm.perplexity_to_k(params.perplexity);
    return transferNeighbors(wasm, k);
  });

  var run_msg = {
    "cmd": "RUN",
    "params": params
  };

  if (nn_out !== null) {
    run_msg.neighbors = nn_out;
    tsne_worker.postMessage(run_msg, [nn_out.runs.buffer, nn_out.indices.buffer, nn_out.distances.buffer]);
  } else {
    tsne_worker.postMessage(run_msg);
  }
}

var umap_worker = null;
function launchUmap(wasm, params) {
  if (umap_worker == null) {
    umap_worker = new Worker("./umapWorker.js");
    umap_worker.postMessage({ "cmd": "INIT" });

    umap_worker.onmessage = function (msg) {
      var type = msg.data.type;
      if (type == "run_umap_DATA") {
        var x = msg.data.resp.x;
        var y = msg.data.resp.y;
        postMessage({
          type: "umap_DATA",
          resp: { "x": x, "y": y },
          msg: "Success: UMAP run completed"
        }, [x.buffer, y.buffer]);
      } else if (type == "error") {
        throw msg.data.object;
      }
    }
  }

  // Finding the neighbors on the linear worker.
  var step = "umap_neighbors";
  var nn_out = utils.runStep(step, { "num_neighbors": params.num_neighbors }, ["neighbor_index"], () => {
    return transferNeighbors(wasm, params.num_neighbors);
  });

  var run_msg = {
    "cmd": "RUN",
    "params": params
  };

  if (nn_out !== null) {
    run_msg.neighbors = nn_out;
    umap_worker.postMessage(run_msg, [nn_out.runs.buffer, nn_out.indices.buffer, nn_out.distances.buffer]);
  } else {
    umap_worker.postMessage(run_msg);
  }
}

/*
 * Helper function to retrieve marker statistics for plotting.
 * This is used both for cluster-specific markers as well as the
 * DE genes that are computed for a custom selection vs the rest.
 */

function formatMarkerStats(wasm, results, rank_type, cluster) {
  if (!rank_type || rank_type === undefined) {
      rank_type = "cohen-min-rank";
  }

  // Choosing the ranking statistic. Do NOT do any Wasm allocations
  // until 'ranking' is fully consumed!
  var index = 1;
  var increasing = false;
  if (rank_type.match(/-min$/)) {
      index = 0;
  } else if (rank_type.match(/-min-rank$/)) {
      increasing = true;
      index = 4;
  }

  var ranking = null;
  if (rank_type.match(/^cohen-/)) {
      ranking = results.cohen(cluster, index);
  } else if (rank_type.match(/^auc-/)) {
      ranking = results.auc(cluster, index);
  } else if (rank_type.match(/^lfc-/)) {
      ranking = results.lfc(cluster, index);
  } else if (rank_type.match(/^delta-d-/)) {
      ranking = results.delta_detected(cluster, index);
  }

  // Computing the ordering based on the ranking statistic.
  var ordering = new Int32Array(ranking.length);
  for (var i = 0; i < ordering.length; i++) {
      ordering[i] = i;
  }
  if (increasing) {
      ordering.sort((f, s) => (ranking[f] - ranking[s]));
  } else {
      ordering.sort((f, s) => (ranking[s] - ranking[f]));
  }

  // Apply that ordering to each statistic of interest.
  var reorder = function(stats) {
      var thing = new Float64Array(stats.length);
      for (var i = 0; i < ordering.length; i++) {
          thing[i] = stats[ordering[i]];
      }
      return thing;
  };

  var stat_detected = reorder(results.detected(cluster, 0));
  var stat_mean = reorder(results.means(cluster, 0));
  var stat_lfc = reorder(results.lfc(cluster, 1));
  var stat_delta_d = reorder(results.delta_detected(cluster, 1));

  // Getting some names, bruh.
  if (!utils.cached.normalization.genes) {
    var mat = fetchNormalizedMatrix();
    var perm = new WasmBuffer(wasm, mat.nrow(), "Int32Array");
    try {
      mat.permutation(perm.ptr);
      utils.cached.normalization.genes = perm.array().slice();
    } finally {
      perm.free();
    }
  }

  let gene_indices = utils.cached.normalization.genes;
  let genes = [];
  for (let i = 0; i < gene_indices.length; i++) {
    var o = ordering[i];
    genes.push(utils.cached.inputs.genes[gene_indices[o]]);
  }

  return {
    "means": stat_mean,
    "detected": stat_detected,
    "lfc": stat_lfc,
    "delta_d": stat_delta_d,
    "genes": genes
  };
}

/*
 * Free all marker results created from custom selections, so
 * as to avoid memory leaks.
 */

function freeCustomMarkers() {
  var custom = utils.initCache("custom_selection");
  if ("selection" in custom) {
    for (const [key, val] of custom.selection.entries()) {
      utils.freeCache(val);
    }
    custom.selection = {};
  }
}

/* 
 * Overlord function. This runs the executors and posts messages if the
 * response is not NULL.
 */

function runAllSteps(wasm, state) {
  utils.upstream.clear();

  var load_out = utils.processOutput(loadFiles, wasm, { "files": state.files });
  if (load_out !== null) {
    var mat = utils.cached.inputs.matrix;
    postMessage({
      type: `${load_out["$step"]}_DIMS`,
      resp: `${mat.nrow()} X ${mat.ncol()}`,
      msg: `Success: Data loaded, dimensions: ${mat.nrow()}, ${mat.ncol()}`
    });
  }

  var metrics_out = utils.processOutput(computeQualityControlMetrics, wasm, {});
  if (metrics_out !== null) {
    postMessage({
      type: `${metrics_out["$step"]}_DATA`,
      resp: metrics_out,
      msg: "Success: QC metrics computed"
    });
  }

  var thresholds_out = utils.processOutput(computeQualityControlThresholds, wasm, { "nmads": state.params.qc["qc-nmads"] });
  if (thresholds_out !== null) {
    postMessage({
      type: `${thresholds_out["$step"]}_DATA`,
      resp: thresholds_out,
      msg: "Success: QC thresholds computed"
    });
  }

  var filtered_out = utils.processOutput(filterCells, wasm, {});
  if (filtered_out !== null) {
    var mat = fetchFilteredMatrix();
    postMessage({
      type: `${filtered_out["$step"]}_DIMS`,
      resp: `${mat.nrow()} X ${mat.ncol()}`,
      msg: `Success: Data filtered, dimensions: ${mat.nrow()}, ${mat.ncol()}`
    });

    postMessage({
      type: `${filtered_out["$step"]}_DATA`,
      resp: filtered_out,
      msg: "Success: QC filtering completed"
    });

    // We free custom marker results here, because a custom selection is only
    // invalidated when the cell number or ordering changes... and this is the
    // latest point at which the cell number or ordering can change.
    freeCustomMarkers();
  }

  var norm_out = utils.processOutput(logNormCounts, wasm, {});
  if (norm_out !== null) {
    postMessage({
      type: `${norm_out["$step"]}_DATA`,
      resp: norm_out,
      msg: "Success: Log-normalization complete"
    });
  }

  var feat_out = utils.processOutput(modelGeneVar, wasm, { "span": state.params.fSelection["fsel-span"] });
  if (feat_out !== null) {
    postMessage({
      type: `${feat_out["$step"]}_DATA`,
      resp: feat_out,
      msg: "Success: Mean-variance relationship modelled"
    });
  }

  var pca_out = utils.processOutput(runPCA, wasm, { "num_hvgs": state.params.pca["pca-hvg"], "num_pcs": state.params.pca["pca-npc"] });
  if (norm_out !== null) {
    postMessage({
      type: `${pca_out["$step"]}_DATA`,
      resp: pca_out,
      msg: "Success: PCA complete"
    });
  }

  var index_out = utils.processOutput(buildNeighborIndex, wasm, { "approximate": state.params.cluster["clus-approx"] });
  if (index_out !== null) {
    postMessage({
      type: `${index_out["$step"]}_DATA`,
      resp: index_out,
      msg: "Success: Index construction complete"
    });
  }

  launchTsne(wasm, {
    "perplexity": state.params.tsne["tsne-perp"],
    "iterations": state.params.tsne["tsne-iter"]
  });

  launchUmap(wasm, {
    "num_epochs": state.params.umap["umap-epochs"],
    "num_neighbors": state.params.umap["umap-nn"],
    "min_dist": state.params.umap["umap-min_dist"]
  });

  var neighbors_out = utils.processOutput(findSNNeighbors, wasm, { "k": state.params.cluster["clus-k"] });
  if (neighbors_out !== null) {
    postMessage({
      type: `${neighbors_out["$step"]}_DATA`,
      resp: neighbors_out,
      msg: "Success: Neighbor search complete"
    });
  }

  var graph_out = utils.processOutput(buildSNNGraph, wasm, { "scheme": state.params.cluster["clus-scheme"] });
  if (graph_out !== null) {
    postMessage({
      type: `${graph_out["$step"]}_DATA`,
      resp: graph_out,
      msg: "Success: Neighbor search complete"
    });
  }

  var cluster_out = utils.processOutput(clusterSNNGraph, wasm, { "resolution": state.params.cluster["clus-res"] });
  if (cluster_out !== null) {
    postMessage({
      type: `${cluster_out["$step"]}_DATA`,
      resp: cluster_out,
      msg: "Success: Graph clustering complete"
    });
  }

  var choose_out = utils.processOutput(chooseClustering, wasm, { "method": state.params.cluster["clus-method"] });
  if (choose_out !== null) {
    postMessage({
      type: `${choose_out["$step"]}_DATA`,
      resp: choose_out,
      msg: "Success: Clustering chosen"
    });
  }

  var marker_out = utils.processOutput(scoreMarkers, wasm, {});
  if (marker_out !== null) {
    postMessage({
      type: `${marker_out["$step"]}_DATA`,
      resp: marker_out,
      msg: "Success: Marker detection complete"
    });
  }
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
