const scran_qc_metrics = {};

(function (x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function rawCompute(wasm, args) {
    scran_utils.freeCache(cache.raw);
    var mat = scran_inputs.fetchCountMatrix();

    // TODO: add more choices.
    var nsubsets = 1;
    var subsets = new WasmBuffer(wasm, mat.nrow() * nsubsets, "Uint8Array");
    try {
      subsets.fill(0);

      /** TODO: better systematic way of guessing Ensembl vs symbol. 
       * Currently I have a look at the first 1000 genes and see who wins.
       **/
      var output = scran_inputs.results().genes;
      for (const col in output) {
        output[col].forEach((x, i) => {
          if (args.usemitodefault) {
            if (mito.symbol.has(x[i]) || mito.ensembl.has(x[i])) {
              subsets[i] = 1;
            }
          } else {
            if(x[i].toLowerCase().startsWith(args.mito.toLowerCase())) {
              subsets[i] = 1;
            }
          }
        });
      }

      cache.raw = wasm.per_cell_qc_metrics(mat, nsubsets, subsets.ptr);
    } finally {
      subsets.free();
    }

    delete cache.reloaded;
    return;
  }

  function fetchResults() {
    var data = {};
    if ("reloaded" in cache) {
      var qc_output = cache.reloaded;
      data.sums = qc_output.sums.slice();
      data.detected = qc_output.detected.slice();
      data.proportion = qc_output.proportion.slice();
    } else {
      var qc_output = cache.raw;
      data.sums = qc_output.sums().slice();
      data.detected = qc_output.detected().slice();
      data.proportion = qc_output.subset_proportions(0).slice();
    }
    return data;
  }

  /** Public functions (standard) **/
  x.compute = function (wasm, args) {
    if (!scran_inputs.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      rawCompute(wasm, args);
      parameters = args;
      x.changed = true;
    }
    return;
  };

  x.results = function (wasm) {
    var data = fetchResults();

    var ranges = {};
    ranges.sums = scran_utils.computeRange(data.sums);
    ranges.detected = scran_utils.computeRange(data.detected);
    ranges.proportion = scran_utils.computeRange(data.proportion);

    return { "data": data, "ranges": ranges };
  };

  x.serialize = function (wasm) {
    return {
      "parameters": parameters,
      "contents": fetchResults()
    };
  };

  x.unserialize = function (wasm, saved) {
    /* TODO: reconstutite a fully-formed QCMetrics object so that
     * fetchQCMetrics() doesn't have to recompute it.
     */
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };

  /** Public functions (custom) **/
  x.fetchQCMetrics = function (wasm) {
    if ("reloaded" in cache) {
      rawCompute(wasm);
    }
    return cache.raw;
  };

  x.fetchSumsUNSAFE = function (wasm) {
    if ("reloaded" in cache) {
      return cache.reloaded.sums;
    } else {
      // Unsafe, because we're returning a raw view into the Wasm heap,
      // which might be invalidated upon further allocations.
      return cache.raw.sums();
    }
  };

})(scran_qc_metrics);
