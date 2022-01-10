import * as scran_qc_metrics from "./_qc_metrics.js";
import * as scran_utils from "./_utils.js";
import WasmBuffer from "./WasmBuffer.js";

var cache = {};
var parameters = {};

export var changed = false;

/** Public functions (standard) **/
export function compute(wasm, args) {
  if (!scran_qc_metrics.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
  } else {
    scran_utils.freeCache(cache.raw);
    var metrics = scran_qc_metrics.fetchQCMetrics(wasm);
    cache.raw = wasm.per_cell_qc_filters(metrics, false, 0, args.nmads);

    parameters = args;
    delete cache.reloaded;
    changed = true;
  }
  return;
};

export function results(wasm) {
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
}

export function serialize(wasm) {
  var contents = results(wasm);
  if ("reloaded" in cache) {
    contents.discards = cache.reloaded.discards;
  } else {
    contents.discards = cache.raw.discard_overall().slice();
  }
  return {
    "parameters": parameters,
    "contents": contents
  };
}

export function unserialize(wasm, saved) {
  parameters = saved.parameters;
  cache.reloaded = saved.contents;
  return;
}

/** Public functions (custom) **/
export function fetchDiscardsOFFSET(wasm) {
  if ("reloaded" in cache) {
    var current = cache.reloaded.discards;
    var buffer = scran_utils.allocateBuffer(wasm, current.length, "Uint8Array", cache);
    buffer.set(current);
    return buffer.ptr;
  } else {
    return cache.raw.discard_overall().byteOffset;
  }
};

export function fetchDiscardsUNSAFE(wasm) {
  if ("reloaded" in cache) {
    return cache.reloaded.discards;
  } else {
    // Unsafe, because we're returning a raw view into the Wasm heap,
    // which might be invalidated upon further allocations.
    return cache.raw.discard_overall();
  }
}
