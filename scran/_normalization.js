const scran_normalization = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function rawCompute(wasm) {
    var mat = scran_qc_filter.fetchFilteredMatrix(wasm);
    var sf_buffer = scran_utils.allocateBuffer(wasm, mat.ncol(), "Float64Array", cache);

    // Better not have any more allocations in between now and filling of size_factors!
    var sums = scran_qc_metrics.fetchSumsUNSAFE(wasm);
    var discards = scran_qc_thresholds.fetchDiscardsUNSAFE(wasm);

    // Reusing the totals computed earlier.
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

    scran_utils.freeCache(cache.matrix);
    cache.matrix = wasm.log_norm_counts(mat, true, sf_buffer.ptr, false, 0);

    delete cache.reloaded;
    return;
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_qc_metrics.changed && !scran_qc_filter.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      rawCompute(wasm);
      parameters = args;
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
    return {};
  };

  x.serialize = function(wasm) {
    return {
      "parameters": parameters,
      "contents": x.results(wasm)
    };
  };

  x.unserialize = function(wasm, saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };

  /** Public functions (custom) **/
  x.fetchNormalizedMatrix = function(wasm) {
    if ("reloaded" in cache) {
      rawCompute(wasm);
    }
    return cache.matrix;
  };
})(scran_normalization);
