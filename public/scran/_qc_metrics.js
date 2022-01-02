importScripts("./_utils.js");
importScripts("./_inputs.js");

const scran_qc_metrics = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};
  var reloaded = false;

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function rawCompute(wasm) {
    scran_utils.freeCache(cache.raw);
    var mat = fetchCountMatrix();

    // Testing:
    var nsubsets = 1;
    var subsets = new WasmBuffer(wasm, mat.nrow() * nsubsets, "Uint8Array");
    try {
      subsets.fill(0);
      cache.raw = wasm.per_cell_qc_metrics(mat, nsubsets, subsets.ptr);
    } finally {
      subsets.free();
    }

    x.changed = true;
    reloaded = false;
    delete cache.reloaded; 
    return;
  }

  function fetchResults() {
    var data = {};
    if (reloaded) {
      var qc_output = cache.reloaded;
      data.sums = qc_output.sums.slice();
      data.detected = qc_output.detected.slice();
      data.proportion = qc_output.subset_proportions[0].slice();
    } else {
      var qc_output = cache.raw;
      data.sums = qc_output.sums().slice();
      data.detected = qc_output.detected().slice();
      data.proportion = qc_output.subset_proportions(0).slice();
    }
    return data;
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_inputs.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      rawCompute(wasm);
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
    var data = fetchResults();

    var ranges = {};
    ranges.sums = scran_utils.computeRange(data.sums);
    ranges.detected = scran_utils.computeRange(data.detected);
    ranges.proportion = scran_utils.computeRange(data.proportion);

    return { "data": data, "ranges": ranges };
  };

  x.serialize = function(wasm) {
    return {
      "parameters": parameters,
      "contents": fetchResults()
    };
  };

  x.unserialize = function(wasm, saved) {
    /* TODO: reconstutite a fully-formed QCMetrics object so that
     * fetchQCMetrics() doesn't have to recompute it.
     */
    reloaded = true;
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };

  /** Public functions (custom) **/
  x.fetchQCMetrics = function(wasm) {
    if (reloaded) {
      rawCompute(wasm);
    } 
    return cache.raw;
  }

  x.fetchSums = function(wasm) {
    if (reloaded) {
      return cache.reloaded.sums;
    } else {
      // Don't return 'sums' directly; callers might be doing arbitrary Wasm
      // allocations, so it's just safer to suffer the cost of making a copy.
      return cache.raw.sums().slice();
    }
  }

})(scran_qc_metrics);
