import * as scran_utils from "./_utils.js";
import * as scran_inputs from "./_inputs.js";
import * as scran_qc_thresholds from "./_qc_thresholds.js";

cache = {};
parameters = {};

export var changed = false;

function rawCompute(wasm) {
  scran_utils.freeCache(cache.matrix);

  var mat = scran_inputs.fetchCountMatrix(wasm);
  var disc_offset = scran_qc_thresholds.fetchDiscardsOFFSET(wasm);
  cache.matrix = wasm.filter_cells(mat, disc_offset, false);

  delete cache.reloaded;
  return;
}

/** Public functions (standard) **/
export function compute(wasm, args) {
  if (!scran_inputs.changed && !scran_qc_thresholds.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
  } else {
    rawCompute(wasm);
    parameters = args;
    changed = true;
  }
  return;
}

export function results(wasm) {
  return {
    "retained": fetchRetained(wasm)
  };
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
}

/** Public functions (standard) **/
export function fetchFilteredMatrix(wasm) {
  if ("reloaded" in cache) {
    rawCompute(wasm);
  }
  return cache.matrix;    
}

export function fetchRetained(wasm) {
  if ("reloaded" in cache) {
    return cache.reloaded.retained;
  } else {
    return cache.matrix.ncol();
  }
}
