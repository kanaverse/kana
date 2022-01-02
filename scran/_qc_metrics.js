importScripts("./_utils.js");
importScripts("./_inputs.js");

const scran_qc_metrics = {};

(function(x) {
  cache = {};
  parameters = {};
  reloaded = false;

  // To be interrogated by downstream steps to figure out whether the
  // inputs changed.
  x.changed = false;

  x.compute = function(wasm, args) {
    if (!scran_inputs.changed || !scran_utils.compareParameters(parameters, args)) {
      x.changed = false;
      return;
    }

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
  };

  function fetchData() {
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

  x.results = function(wasm) {
    var data = fetchData();

    var ranges = {};
    ranges.sums = scran_utils.computeRange(data.sums);
    ranges.detected = scran_utils.computeRange(data.detected);
    ranges.proportion = scran_utils.computeRange(data.proportion);

    return { "data": data, "ranges": ranges };
  };

  x.serialize = function(wasm) {
    return {
      "parameters": parameters,
      "contents": fetchData()
    };
  };

  x.unserialize = function(saved) {
    reloaded = true;
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
  };
})(scran_qc_metrics);
