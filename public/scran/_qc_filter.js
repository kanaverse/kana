const scran_qc_filter = {};

(function(x) {
  /** Private members **/
  cache = {};
  parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function rawCompute(wasm) {
    scran_utils.freeCache(cache.matrix);

    var mat = scran_inputs.fetchCountMatrix(wasm);
    var disc_offset = scran_qc_thresholds.fetchDiscardsOFFSET(wasm);
    cache.matrix = wasm.filter_cells(mat, disc_offset, false);

    delete cache.reloaded;
    return;
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_inputs.changed && !scran_qc_thresholds.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      rawCompute(wasm);
      parameters = args;
      x.changed = true;
    }
    return;
  }
   
  x.results = function(wasm) {
    return {
      "retained": x.fetchRetained(wasm)
    };
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

    // Precomputing this for easier retrieval later.
    var discards = scran_qc_thresholds.fetchDiscardsUNSAFE(wasm);
    var retained = 0;
    for (const i of discards) {
      if (i == 0) {
        retained++;
      }
    }
    cache.reloaded.retained = retained;
    return;
  };

  /** Public functions (standard) **/
  x.fetchFilteredMatrix = function(wasm) {
    if ("reloaded" in cache) {
      rawCompute(wasm);
    }
    return cache.matrix;    
  };

  x.fetchRetained = function(wasm) {
    if ("reloaded" in cache) {
      return cache.reloaded.retained;
    } else {
      return cache.matrix.ncol();
    }
  };

})(scran_qc_filter);
