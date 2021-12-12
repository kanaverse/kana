importScripts("./WasmBuffer.js");
importScripts("./cache.js");
importScripts("https://cdn.jsdelivr.net/npm/d3-dsv@3");
importScripts("https://cdn.jsdelivr.net/npm/d3-scale@4");

var wasm = null;
var cached = {};
var parameters = {};
var initCache = createInitCache(cached);
var checkParams = createCheckParams(parameters);

/* Executor functions. The general policy here is that each function
 * corresponds to a standalone step in the linear analysis. Each function
 * should take inputs by reference from 'parameters' and should cache its
 * results in 'cached' (possibly freeing any previously cached results). 
 * The return value contains any content to be passed to the main thread.
 */

function loadFiles(args, upstream) {
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

  return checkParams(step, mock_args, upstream, () => {
    var input = args.files;
    var mtx_files = input[0];
    var input_cache = initCache(step);
    freeCache(input_cache, "matrix");
  
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
      cached.inputs.matrix = wasm.read_matrix_market(buffer.ptr, mtx_files[0].size, is_compressed);
    } finally {
      buffer.free();
    }
  
    const tsv = d3.dsvFormat("\t");
  
    var barcode_file = input[1];
    if (barcode_file.length > 0) {
      var reader = new FileReaderSync();
      var file_size = barcode_file[0].size;
      var buffer = reader.readAsText(barcode_file[0]);
      cached.inputs.barcodes = tsv.parse(buffer);
    }
  
    var genes_file = input[2];
    if (genes_file.length > 0) {
      var reader = new FileReaderSync();
      var file_size = genes_file[0].size;
      var buffer = reader.readAsText(genes_file[0]);
      cached.inputs.genes = tsv.parse(buffer);
    }
    
    return { "$step": step };
  });
}

function fetchCountMatrix() {
  return cached["inputs"]["matrix"];
}

function computeQualityControlMetrics(args, upstream) {
  var step = "quality_control_metrics";
  return checkParams(step, args, upstream, () => {
    var qcm_cache = initCache(step);
    freeCache(qcm_cache, "raw");

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
      switch(x) {
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
  
      var tmin = Math.min(...current);
      var tmax = Math.max(...current);
      ranges[x] = [tmin, tmax];
  
      // var tscale = d3.scaleLinear()
      //   .domain([tmin, tmax])
      //   .range([0, 100]);
  
      var m = (100) / (tmax - tmin);
      var b = -m * tmin;

      distributions[x] = new Array(maxDist).fill(0);
      current.forEach(function (y, j) {
        var idx = Math.ceil((m * y) + b);
        distributions[x][idx]++;
      });
    });
  
    return {
      "$step": step,
      "sums": distributions.sums,
      "detected": distributions.detected,
      "proportion": distributions.proportion,
      "ranges": ranges,
    };
  });
}

function computeQualityControlThresholds(args, upstream) {
  var step = "quality_control_thresholds";
  return checkParams(step, args, upstream, () => {
    var qct_cache = initCache(step);
    freeCache(qct_cache, "raw");

    var metrics = cached["quality_control_metrics"]["raw"];
    var filter_output = wasm.per_cell_qc_filters(metrics, false, 0, args.nmads);
    qct_cache["raw"] = filter_output;

    return {
      "$step": step,
      "sums": filter_output.thresholds_sums()[0],
      "detected": filter_output.thresholds_detected()[0],
      "proportion": filter_output.thresholds_proportions(0)[0] // TODO: generalize...
    };
  });
}

function filterCells(args, upstream) {
  var step = "quality_control_filtered";
  return checkParams(step, args, upstream, () => {
    var qcf_cache = initCache(step);
    freeCache(qcf_cache, "raw");
  
    var mat = fetchCountMatrix();
    var thresholds = cached["quality_control_thresholds"]["raw"];
    var discard_ptr = thresholds.discard_overall().byteOffset;

    qcf_cache["raw"] = wasm.filter_cells(mat, discard_ptr, false);
  
    return {
      "$step": step
    }
  });
}

function fetchFilteredMatrix() { // helper for downstream functions.
  return cached["quality_control_filtered"]["raw"];
}

function logNormCounts(args, upstream) {
  var step = "normalization";
  return checkParams(step, args, upstream, () => {
    var norm_cache = initCache(step);
    freeCache(norm_cache, "raw");
    var mat = fetchFilteredMatrix();
    norm_cache["raw"] = wasm.log_norm_counts(mat, false, 0, false, 0);
    return {
      "$step": step
    };
  });
}

function fetchNormalizedMatrix() { // helper for downstream functions.
  return cached["normalization"]["raw"];
}

function modelGeneVar(args, upstream) {
  var step = "feature_selection";
  return checkParams(step, args, upstream, () => {
    var feat_cached = initCache(step);
    freeCache(feat_cached, "raw");

    var mat = fetchNormalizedMatrix();
    var model_output = wasm.model_gene_var(mat, false, 0, args.span);
    feat_cached["raw"] = model_output;

    feat_cached.residuals = model_output.residuals(0).slice();
    feat_cached.sorted_residuals = feat_cached.residuals.slice(); // a separate copy.
    feat_cached.sorted_residuals.sort();

    return {
      "$step": step,
      "means": model_output.means(0).slice(),
      "vars": model_output.variances(0).slice(),
      "fitted": model_output.fitted(0).slice(),
      "resids": feat_cached.residuals
    };
  });
}

function runPCA(args, upstream) {
  var step = "pca";
  return checkParams(step, args, upstream, () => {
    var pca_cached = initCache(step);
    freeCache(pca_cached, "raw");
  
    var feat_cached = cached.feature_selection;
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
      "$step": step,
      "var_exp": var_exp
    };
  });
}

function fetchPCs () {
  return {
    "matrix" : cached.pca.raw.pcs(),
    "num_pcs": parameters.pca.num_pcs,
    "num_obs": fetchNormalizedMatrix().ncol()
  }
}

function buildNeighborIndex(args, upstream) {
  var step = "neighbor_index";
  return checkParams(step, args, upstream, () => {
    var neighbor_cached = initCache(step);
    freeCache(neighbor_cached, "raw");
    var pcs = fetchPCs();
    neighbor_cached.raw = wasm.build_neighbor_index(pcs.matrix.byteOffset, pcs.num_pcs, pcs.num_obs, args.approximate);
    return {
      "$step": step
    };
  });
}

function fetchNeighborIndex() {
  return cached["neighbor_index"]["raw"];
}

function findSNNeighbors(args, upstream) {
  var step = "snn_find_neighbors";
  return checkParams(step, args, upstream, () => {
    var snn_cached = initCache(step);
    freeCache(snn_cached, "raw");
    var nn_index = fetchNeighborIndex();
    snn_cached.raw = wasm.find_nearest_neighbors(nn_index, args.k);
    return {
      "$step": step
    };
  });
}

function buildSNNGraph(args, upstream) {
  var step = "snn_build_graph";
  return checkParams(step, args, upstream, () => {
    var snn_cached = initCache(step);
    freeCache(snn_cached, "raw");
    var neighbors = cached.snn_find_neighbors.raw;
    snn_cached.raw = wasm.build_snn_graph_from_neighbors(neighbors, args.scheme);
    return {
      "$step": step
    };
  });
}

function clusterSNNGraph(args, upstream) {
  var step = "snn_cluster_graph";
  return checkParams(step, args, upstream, () => {
    var snn_cached = initCache(step);
    freeCache(snn_cached, "raw");
  
    var clustering = wasm.cluster_snn_graph_from_graph(cached.snn_build_graph.raw, args.resolution);
    snn_cached.raw = clustering;
  
    var arr_clust = clustering.membership(clustering.best()).slice();
    return {
      "$step": step,
      "clusters": arr_clust
    }
  });
}

function chooseClustering(args, upstream) {
  var step = "choose_clustering";
  return checkParams(step, args, upstream, () => {
    var num_obs = fetchNormalizedMatrix().ncol();

    var reallocate = true;
    if (step in cached) {
      if (cached[step].size != num_obs) {
        cached[step].free();
      } else {
        reallocate = false;
      }
    }

    if (reallocate) {
      cached[step] = new WasmBuffer(wasm, num_obs, "Int32Array");
    }

    var vec = cached[step].array();
    if (args.method == "snn_graph") {
      var clustering = cached["snn_cluster_graph"].raw;
      var src = clustering.membership(clustering.best());
      vec.set(src);
    }

    return {
      "$step": step
    }
  });
}

function scoreMarkers(args, upstream) {
  var step = "marker_detection";
  return checkParams(step, args, upstream, () => {
    var marker_cached = initCache(step);
    freeCache(marker_cached, "raw");

    var mat = fetchNormalizedMatrix();
    var clusters = cached["choose_clustering"];
    console.log(clusters);
    marker_cached.raw = wasm.score_markers(mat, clusters.ptr, false, 0);

    return {
      "$step": step
    }
  });
}

/* 
 * Overlord function. This runs the executors and posts messages if the
 * response is not NULL.
 */

function processStep(body, args, upstream) {
  var t0 = performance.now();

  var output = null;
  try {
    var output = body(args, upstream);
  } catch (error) {
    console.log(error);
    throw error;
  }

  if (output !== null) {
    var t1 = performance.now();
    var ftime = (t1 - t0) / 1000;
    postMessage({
        type: `${output["$step"]}_DONE`,
        resp: `~${ftime.toFixed(2)} sec`,
        msg: 'Done'
    });
  }

  return output;
}

function runAllSteps(state) {
  var upstream = false;

  var load_out = processStep(loadFiles, { "files": state.files }, upstream);
  if (load_out !== null) {
    var mat = cached.inputs.matrix;
    postMessage({
        type: `${load_out["$step"]}_DIMS`,
        resp: `${mat.nrow()} X ${mat.ncol()}`,
        msg: `Success: Data loaded, dimensions: ${mat.nrow()}, ${mat.ncol()}`
    });
    upstream = true;
  }

  var metrics_out = processStep(computeQualityControlMetrics, {}, upstream);
  if (metrics_out !== null) { 
    postMessage({
        type: `${metrics_out["$step"]}_DATA`,
        resp: metrics_out,
        msg: "Success: QC metrics computed"
    });
    upstream = true;
  }

  var thresholds_out = processStep(computeQualityControlThresholds, { "nmads": state.params.qc["qc-nmads"] }, upstream);
  if (thresholds_out !== null) { 
    postMessage({
        type: `${thresholds_out["$step"]}_DATA`,
        resp: thresholds_out,
        msg: "Success: QC thresholds computed"
    });
    upstream = true;
  }

  var filtered_out = processStep(filterCells, {}, upstream);
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

    upstream = true;
  }

  var norm_out = processStep(logNormCounts, {}, upstream);
  if (norm_out !== null) { 
    postMessage({
        type: `${norm_out["$step"]}_DATA`,
        resp: norm_out,
        msg: "Success: Log-normalization complete"
    });
    upstream = true;
  }

  var feat_out = processStep(modelGeneVar, { "span": state.params.fSelection["fsel-span"] }, upstream);
  if (feat_out !== null) { 
    postMessage({
        type: `${feat_out["$step"]}_DATA`,
        resp: feat_out,
        msg: "Success: Mean-variance relationship modelled"
    });
    upstream = true;
  }

  var pca_out = processStep(runPCA, { "num_hvgs": 4000, "num_pcs": state.params.pca["pca-npc"] }, upstream);
  if (norm_out !== null) { 
    postMessage({
        type: `${pca_out["$step"]}_DATA`,
        resp: pca_out,
        msg: "Success: PCA complete"
    });
    upstream = true;
  }

  var index_out = processStep(buildNeighborIndex, { "approximate": state.params.cluster["clus-approx"] }, upstream);
  if (index_out !== null) {
    postMessage({
        type: `${index_out["$step"]}_DATA`,
        resp: index_out,
        msg: "Success: Index construction complete"
    });
    upstream = true;
  }

  var neighbors_out = processStep(findSNNeighbors, { "k": state.params.cluster["clus-k"] }, upstream);
  if (neighbors_out !== null) {
    postMessage({
        type: `${neighbors_out["$step"]}_DATA`,
        resp: neighbors_out,
        msg: "Success: Neighbor search complete"
    });
    upstream = true;
  }

  var graph_out = processStep(buildSNNGraph, { "scheme": state.params.cluster["clus-scheme"] }, upstream);
  if (graph_out !== null) {
    postMessage({
        type: `${graph_out["$step"]}_DATA`,
        resp: graph_out,
        msg: "Success: Neighbor search complete"
    });
    upstream = true;
  }

  var cluster_out = processStep(clusterSNNGraph, { "resolution": state.params.cluster["clus-res"] }, upstream);
  if (cluster_out !== null) {
    postMessage({
        type: `${cluster_out["$step"]}_DATA`,
        resp: cluster_out,
        msg: "Success: Graph clustering complete"
    });
    upstream = true;
  }

  var choose_out = processStep(chooseClustering, { "method": "snn_graph" }, upstream);
  if (choose_out !== null) {
    postMessage({
        type: `${choose_out["$step"]}_DATA`,
        resp: choose_out,
        msg: "Success: Clustering chosen"
    });
    upstream = true;
  }

  var marker_out = processStep(scoreMarkers, {}, upstream);
  if (marker_out !== null) {
    postMessage({
        type: `${marker_out["$step"]}_DATA`,
        resp: marker_out,
        msg: "Success: Marker detection complete"
    });
    upstream = true;
  }
}

onmessage = function (msg) {
  var self = this;
  console.log("in worker");
  console.log(msg.data);

  const payload = msg.data;
  if (payload.type == "INIT") {
      // TODO: parcel2 doesn't load inline importScripts
      importScripts("./scran.js");
      loadScran()
      .then((Module) => {
         wasm = Module;
         postMessage({
             type: payload.type,
             msg: `Success: ScranJS/WASM initialized`
         });
      })
  } else if (payload.type == "RUN") {
      runAllSteps(payload.payload);
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
      var t0 = performance.now();
      var resp = data.getClusterMarkers(payload.input[0]);
      var t1 = performance.now();

      postMessage({
          type: "setMarkersForCluster",
          resp: JSON.parse(JSON.stringify(resp)),
          msg: `Success: GET_MARKER_GENE done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}` + " took " + (t1 - t0) + " milliseconds."
      });
  } else {
      console.log("MIM:::msg type incorrect")
  }
}
