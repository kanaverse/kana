importScripts("./_utils.js");
importScripts("./_qc_metrics.js");

const scran_qc_thresholds = {};

(function(x) {
  /** Private members **/
  cache = {};
  parameters = {};
  reloaded = false;

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_qc_metrics.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      scran_utils.freeCache(cache.raw);
      var metrics = scran_qc_metrics.fetchQCMetrics();
      cache.raw = wasm.per_cell_qc_filters(metrics, false, 0, args.nmads);
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
    let data;
    if (reloaded) {
      data = cache.reloaded;
    } else {
      data = {
        "sums": filter_output.thresholds_sums()[0],
        "detected": filter_output.thresholds_detected()[0],
        "proportion": filter_output.thresholds_proportions(0)[0] // TODO: generalize...
      };
    }
    return data;
  });

  x.serialize = function(wasm) {
    var contents = x.results();
    if (reloaded) {
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
    reloaded = true;
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
  };

  /** Public functions (custom) **/
  x.fetchDiscardOffset = function(wasm) {
    if (reloaded) {
      var current = cache.reloaded.discards;
      var buffer = scran_utils.allocateBuffer(wasm, current.length, "Uint8Array", cache);
      buffer.set(current);
      return buffer.ptr;
    } else {
      return cache.raw.discard_overall().byteOffset;
    }
  };
})(scran_qc_thresholds);
