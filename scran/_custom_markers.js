import * as scran_utils from "./_utils.js";
import * as scran_qc_filter from "./_qc_filter.js";
import * as scran_utils_markers from "./_utils_markers.js";
import * as scran_normalization from "./_normalization.js";

var cache = { "results": {} };
var parameters = { "selections": {} };

export var changed = false;

export function compute(wasm, args) {
  /* If the QC filter was re-run, all of the selections are invalidated as
   * the identity of the indices may have changed.
   */
  if (scran_qc_filter.changed) {
    parameters.selections = {};
    for (const [key, val] of Object.entries(cache.results)) {
      scran_utils.freeCache(val.raw);                    
    }
    cache.results = {};
  }

  /*
   * Technically we would need to re-run detection on the existing selections
   * if the normalization changed but the QC was the same. In practice, this
   * never happens, so we'll deal with it later.
   */

  changed = true;
  return;
};

export function results(wasm) {
  return {};
}

export function serialize(wasm) {
  var results = {};

  for (const [key, val] of Object.entries(cache.results)) {
    if ("reloaded" in val) {
      results[key] = val.reloaded;
    } else {
      results[key] = scran_utils_markers.serializeGroupStats(val.raw, 1);
    }
  }

  return {
    "parameters": parameters,
    "contents": { "results": results }
  };
}

export function unserialize(wasm, saved) {
  parameters = saved.parameters;

  for (const [key, val] of Object.entries(saved.contents)) {
    cache.results[key] = { "reloaded": val };
  }
  return;
}

export function addSelection(wasm, id, selection) {
  var mat = scran_normalization.fetchNormalizedMatrix(wasm);

  var buffer = scran_utils.allocateBuffer(wasm, mat.ncol(), "Int32Array", cache, "buffer");
  buffer.fill(0);
  var tmp = buffer.array();
  selection.forEach(element => { tmp[element] = 1; });

  var res = wasm.score_markers(mat, buffer.ptr, false, 0); // assumes that we have at least one cell in and outside the selection!

  // Removing previous results, if there were any.
  if (id in cache.results) {
    scran_utils.freeCache(cache.results[id].raw);
    delete cache.results[id];
  }

  cache.results[id] = { "raw": res };
  parameters.selections[id] = selection;
}

export function removeSelection(wasm, id) {
  scran_utils.freeCache(cache.results[id].raw);
  delete cache.results[id];
  delete parameters.selections[id];
};

export function fetchResults(wasm, id, rank_type) {
  var current = cache.results[id];
  return scran_utils_markers.fetchGroupResults(wasm, current.raw, current.reloaded, rank_type, 1); 
}
