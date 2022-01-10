import * as scran_utils from "./_utils.js";
import * as scran_qc_metrics from "./_qc_metrics.js";
import * as scran_qc_thresholds from "./_qc_thresholds.js";
import * as scran_qc_filter from "./_qc_filter.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute(wasm) {
  var mat = scran_qc_filter.fetchFilteredMatrix(wasm);
  var buffer = scran_utils.allocateBuffer(wasm, mat.ncol(), "Float64Array", cache);

  // Better not have any more allocations in between now and filling of size_factors!
  var sums = scran_qc_metrics.fetchSumsUNSAFE(wasm);
  var discards = scran_qc_thresholds.fetchDiscardsUNSAFE(wasm);

  // Reusing the totals computed earlier.
  var size_factors = buffer.array();
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
  cache.matrix = wasm.log_norm_counts(mat, true, buffer.ptr, false, 0);

  delete cache.reloaded;
  return;
}

export function compute(wasm, args) {
  if (!scran_qc_metrics.changed && !scran_qc_filter.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
  } else {
    rawCompute(wasm);
    parameters = args;
    changed = true;
  }
  return;
}

export function results(wasm) {
  return {};
}

export function serialize(wasm) {
  return {
    "parameters": parameters,
    "contents": results(wasm)
  };
}

export function unserialize(wasm, saved) {
  parameters = saved.parameters;
  cache.reloaded = saved.contents;
  return;
}

/** Public functions (custom) **/
export function fetchNormalizedMatrix(wasm) {
  if ("reloaded" in cache) {
    rawCompute(wasm);
  }
  return cache.matrix;
}

export function fetchExpression(wasm, index) {
  var mat = fetchNormalizedMatrix(wasm);
  var buffer = scran_utils.allocateBuffer(wasm, mat.ncol(), "Float64Array", cache); // re-using the buffer.
  mat.row(index, buffer.ptr)
  return buffer.array().slice();    
}
