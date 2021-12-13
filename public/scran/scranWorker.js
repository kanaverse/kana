importScripts("./WasmBuffer.js");
importScripts("./utils.js");
importScripts("https://cdn.jsdelivr.net/npm/d3-dsv@3");
importScripts("https://cdn.jsdelivr.net/npm/d3-scale@4");

var wasm = null;
var cached = {};
var parameters = {};
var upstream = new Set();
var initCache = createInitCache(cached);
var runStep = createRunStep(parameters, upstream);

/* 
 * Step executor functions. 
 * 
 * Each function corresponds to a standalone step in the linear analysis. It
 * should take an `args` object containing all of the user-specified arguments
 * for this step. These are checked against the existing argument values (if
 * any) in `parameters`, and if they are different, the step is rerun. 
 *
 * Results may be cached in `cached` for use in downstream steps. Note that
 * each step is responsible for the memory management of its cached results;
 * for Wasm-originating objects, we suggest using `freeCache`, while for
 * JS-allocated buffers on the Wasm heap, we suggest using `allocateBuffer`.
 *
 * On success, the previous `parameters` are replaced by `args` so that the
 * next run of the same step can be skipped if there is no change. The step is
 * also added to `upstream` so that any downstream steps know that they need
 * to be re-run if they detect dependencies have rerun. This is all handled
 * by `runStep`, which wraps the boilerplate around the actual step. 
 *
 * The return value contains an object to be passed to the main thread.
 * This should not contain any Wasm-originating objects or allocated buffers.
 */

function loadFiles(args) {
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

  return runStep(step, mock_args, [], () => {
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
    
    return {};
  });
}

function fetchCountMatrix() {
  return cached["inputs"]["matrix"];
}

function computeQualityControlMetrics(args) {
  var step = "quality_control_metrics";
  return runStep(step, args, ["inputs"], () => {
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
      "sums": distributions.sums,
      "detected": distributions.detected,
      "proportion": distributions.proportion,
      "ranges": ranges,
    };
  });
}

function computeQualityControlThresholds(args) {
  var step = "quality_control_thresholds";
  return runStep(step, args, ["quality_control_metrics"], () => {
    var qct_cache = initCache(step);
    freeCache(qct_cache, "raw");

    var metrics = cached["quality_control_metrics"]["raw"];
    var filter_output = wasm.per_cell_qc_filters(metrics, false, 0, args.nmads);
    qct_cache["raw"] = filter_output;

    return {
      "sums": filter_output.thresholds_sums()[0],
      "detected": filter_output.thresholds_detected()[0],
      "proportion": filter_output.thresholds_proportions(0)[0] // TODO: generalize...
    };
  });
}

function filterCells(args) {
  var step = "quality_control_filtered";
  return runStep(step, args, ["quality_control_thresholds"], () => {
    var qcf_cache = initCache(step);
    freeCache(qcf_cache, "raw");
  
    var mat = fetchCountMatrix();
    var thresholds = cached["quality_control_thresholds"]["raw"];
    var discard_ptr = thresholds.discard_overall().byteOffset;

    qcf_cache["raw"] = wasm.filter_cells(mat, discard_ptr, false);
  
    return {};
  });
}

function fetchFilteredMatrix() { // helper for downstream functions.
  return cached["quality_control_filtered"]["raw"];
}

function logNormCounts(args) {
  var step = "normalization";
  return runStep(step, args, ["quality_control_filtered"], () => {
    var norm_cache = initCache(step);
    freeCache(norm_cache, "raw");
    var mat = fetchFilteredMatrix();
    norm_cache["raw"] = wasm.log_norm_counts(mat, false, 0, false, 0);
    return {};
  });
}

function fetchNormalizedMatrix() { // helper for downstream functions.
  return cached["normalization"]["raw"];
}

function modelGeneVar(args) {
  var step = "feature_selection";
  return runStep(step, args, ["normalization"], () => {
    var feat_cached = initCache(step);
    freeCache(feat_cached, "raw");

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

function runPCA(args) {
  var step = "pca";
  return runStep(step, args, ["feature_selection"], () => {
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

function buildNeighborIndex(args) {
  var step = "neighbor_index";
  return runStep(step, args, ["pca"], () => {
    var neighbor_cached = initCache(step);
    freeCache(neighbor_cached, "raw");
    var pcs = fetchPCs();
    neighbor_cached.raw = wasm.build_neighbor_index(pcs.matrix.byteOffset, pcs.num_pcs, pcs.num_obs, args.approximate);
    return {};
  });
}

function fetchNeighborIndex() {
  return cached["neighbor_index"]["raw"];
}

function findSNNeighbors(args) {
  var step = "snn_find_neighbors";
  return runStep(step, args, ["neighbor_index"], () => {
    var snn_cached = initCache(step);
    freeCache(snn_cached, "raw");
    var nn_index = fetchNeighborIndex();
    snn_cached.raw = wasm.find_nearest_neighbors(nn_index, args.k);
    return {};
  });
}

function buildSNNGraph(args) {
  var step = "snn_build_graph";
  return runStep(step, args, ["snn_find_neighbors"], () => {
    var snn_cached = initCache(step);
    freeCache(snn_cached, "raw");
    var neighbors = cached.snn_find_neighbors.raw;
    snn_cached.raw = wasm.build_snn_graph_from_neighbors(neighbors, args.scheme);
    return {};
  });
}

function clusterSNNGraph(args) {
  var step = "snn_cluster_graph";
  return runStep(step, args, ["snn_build_graph"], () => {
    var snn_cached = initCache(step);
    freeCache(snn_cached, "raw");
  
    var clustering = wasm.cluster_snn_graph_from_graph(cached.snn_build_graph.raw, args.resolution);
    snn_cached.raw = clustering;
  
    var arr_clust = clustering.membership(clustering.best()).slice();
    return {
      "clusters": arr_clust
    };
  });
}

function chooseClustering(args) {
  var step = "choose_clustering";
  return runStep(step, args, ["snn_cluster_graph"], () => {
    var clust_cached = initCache(step);
    var num_obs = fetchNormalizedMatrix().ncol();
    var buffer = allocateBuffer(wasm, num_obs, "Int32Array", clust_cached);

    var vec = buffer.array();
    if (args.method == "snn_graph") {
      var clustering = cached["snn_cluster_graph"].raw;
      var src = clustering.membership(clustering.best());
      vec.set(src);
    }

    return {};
  });
}

function scoreMarkers(args) {
  var step = "marker_detection";
  return runStep(step, args, ["choose_clustering", "normalization"], () => {
    var marker_cached = initCache(step);
    freeCache(marker_cached, "raw");

    var mat = fetchNormalizedMatrix();
    var clusters = cached["choose_clustering"].buffer;
    console.log(clusters);
    marker_cached.raw = wasm.score_markers(mat, clusters.ptr, false, 0);

    return {};
  });
}

/* 
 * Special functions for launching t-SNE and UMAP.
 *
 * These steps are run in separate workers, and need some accommodation for the
 * message passing. In particular, each function is responsible for initialization
 * of the worker, which persists for the lifetime of the application. Some 
 * care is required to ensure that the worker is successfully initialized before
 * performing the actual request for execution.
 *
 * They also need to handle the animation.
 */

var tsne_worker = null;
var tsne_initialized = true;

function launchTsne(params) {
  function executeTsne() {
    tsne_worker.postMessage({
        "cmd": "RUN",
        "params": params,
        "upstream": upstream.has("neighbor_index"),
        "nn_index_ptr": fetchNeighborIndex().$$.ptr
    });

    tsne_worker.onmessage = function(msg) {
      if (msg.data.type == "run_tsne_DATA") {
        var buffer = msg.data.resp.buffer;
        var contents = WasmBuffer.toArray(wasm, buffer.ptr, buffer.size, buffer.type);
        var x = [], y = [];
        for (var i = 0; i < contents.length; i += 2) {
          x.push(contents[i]);
          y.push(contents[i + 1]);
        }
        postMessage({
            type: "tsne_DATA",
            resp: { "x": x, "y": y },
            msg: "Success: t-SNE run completed"
        });
      }
    }
  }

  if (tsne_worker == null) {
    tsne_worker = new Worker("./tsneWorker.js");
    tsne_worker.postMessage({ 
        "cmd": "INIT",
        "wasmMemory": wasm.wasmMemory
    });
  }

  tsne_worker.onmessage = function(msg) {
    if ("status" in msg.data && msg.data.status === "SUCCESS") {
      executeTsne();
    } else {
      throw "failed to initialize the t-SNE worker";
    }
  };
}

/* 
 * Overlord function. This runs the executors and posts messages if the
 * response is not NULL.
 */

function runAllSteps(state) {
  upstream.clear();

  var load_out = processOutput(loadFiles, { "files": state.files });
  if (load_out !== null) {
    var mat = cached.inputs.matrix;
    postMessage({
        type: `${load_out["$step"]}_DIMS`,
        resp: `${mat.nrow()} X ${mat.ncol()}`,
        msg: `Success: Data loaded, dimensions: ${mat.nrow()}, ${mat.ncol()}`
    });
  }

  var metrics_out = processOutput(computeQualityControlMetrics, {});
  if (metrics_out !== null) { 
    postMessage({
        type: `${metrics_out["$step"]}_DATA`,
        resp: metrics_out,
        msg: "Success: QC metrics computed"
    });
  }

  var thresholds_out = processOutput(computeQualityControlThresholds, { "nmads": state.params.qc["qc-nmads"] });
  if (thresholds_out !== null) { 
    postMessage({
        type: `${thresholds_out["$step"]}_DATA`,
        resp: thresholds_out,
        msg: "Success: QC thresholds computed"
    });
  }

  var filtered_out = processOutput(filterCells, {});
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
  }

  var norm_out = processOutput(logNormCounts, {});
  if (norm_out !== null) { 
    postMessage({
        type: `${norm_out["$step"]}_DATA`,
        resp: norm_out,
        msg: "Success: Log-normalization complete"
    });
  }

  var feat_out = processOutput(modelGeneVar, { "span": state.params.fSelection["fsel-span"] });
  if (feat_out !== null) { 
    postMessage({
        type: `${feat_out["$step"]}_DATA`,
        resp: feat_out,
        msg: "Success: Mean-variance relationship modelled"
    });
  }

  var pca_out = processOutput(runPCA, { "num_hvgs": 4000, "num_pcs": state.params.pca["pca-npc"] });
  if (norm_out !== null) { 
    postMessage({
        type: `${pca_out["$step"]}_DATA`,
        resp: pca_out,
        msg: "Success: PCA complete"
    });
  }

  var index_out = processOutput(buildNeighborIndex, { "approximate": state.params.cluster["clus-approx"] });
  if (index_out !== null) {
    postMessage({
        type: `${index_out["$step"]}_DATA`,
        resp: index_out,
        msg: "Success: Index construction complete"
    });
  }

  launchTsne({
    "init": {
      "perplexity": state.params.tsne["tsne-perp"]
    },
    "run": {
      "iterations": state.params.tsne["tsne-iter"]
    }
  });

  var neighbors_out = processOutput(findSNNeighbors, { "k": state.params.cluster["clus-k"] });
  if (neighbors_out !== null) {
    postMessage({
        type: `${neighbors_out["$step"]}_DATA`,
        resp: neighbors_out,
        msg: "Success: Neighbor search complete"
    });
  }

  var graph_out = processOutput(buildSNNGraph, { "scheme": state.params.cluster["clus-scheme"] });
  if (graph_out !== null) {
    postMessage({
        type: `${graph_out["$step"]}_DATA`,
        resp: graph_out,
        msg: "Success: Neighbor search complete"
    });
  }

  var cluster_out = processOutput(clusterSNNGraph, { "resolution": state.params.cluster["clus-res"] });
  if (cluster_out !== null) {
    postMessage({
        type: `${cluster_out["$step"]}_DATA`,
        resp: cluster_out,
        msg: "Success: Graph clustering complete"
    });
  }

  var choose_out = processOutput(chooseClustering, { "method": "snn_graph" });
  if (choose_out !== null) {
    postMessage({
        type: `${choose_out["$step"]}_DATA`,
        resp: choose_out,
        msg: "Success: Clustering chosen"
    });
  }

  var marker_out = processOutput(scoreMarkers, {});
  if (marker_out !== null) {
    postMessage({
        type: `${marker_out["$step"]}_DATA`,
        resp: marker_out,
        msg: "Success: Marker detection complete"
    });
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
