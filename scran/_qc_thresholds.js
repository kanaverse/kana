const scran_qc_thresholds = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_qc_metrics.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      scran_utils.freeCache(cache.raw);
      var metrics = scran_qc_metrics.fetchQCMetrics(wasm);
      cache.raw = wasm.per_cell_qc_filters(metrics, false, 0, args.nmads);

      parameters = args;
      delete cache.reloaded;
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
    let data;
    if ("reloaded" in cache) {
      data = {
        "sums": cache.reloaded.sums,
        "detected": cache.reloaded.detected,
        "proportion": cache.reloaded.proportion
      };
    } else {
      var obj = cache.raw;
      data = {
        "sums": obj.thresholds_sums()[0],
        "detected": obj.thresholds_detected()[0],
        "proportion": obj.thresholds_proportions(0)[0] // TODO: generalize...
      };
    }
    return data;
  };

  x.serialize = function(wasm) {
    var contents = x.results();
    if ("reloaded" in cache) {
      contents.discards = cache.reloaded.discards;
    } else {
      contents.discards = cache.raw.discard_overall().slice();
    }
    return {
      "parameters": parameters,
      "contents": contents
    };
  };

  x.unserialize = function(saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };

  /** Public functions (custom) **/
  x.fetchDiscardsOFFSET = function(wasm) {
    if ("reloaded" in cache) {
      var current = cache.reloaded.discards;
      var buffer = scran_utils.allocateBuffer(wasm, current.length, "Uint8Array", cache);
      buffer.set(current);
      return buffer.ptr;
    } else {
      return cache.raw.discard_overall().byteOffset;
    }
  };

  x.fetchDiscardsUNSAFE = function(wasm) {
    if ("reloaded" in cache) {
      return cache.reloaded.discards;
    } else {
      // Unsafe, because we're returning a raw view into the Wasm heap,
      // which might be invalidated upon further allocations.
      return cache.raw.discard_overall();
    }
  };
})(scran_qc_thresholds);
