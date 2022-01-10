import * as scran_utils from "./_utils.js";
import * as scran_normalization from "./_normalization.js";

var cache = {};
var parameters = {};

export var changed = false;

function spawnStats() {
  var model_output = cache.raw;
  return {
    "means": model_output.means(0).slice(),
    "vars": model_output.variances(0).slice(),
    "fitted": model_output.fitted(0).slice(),
    "resids": model_output.residuals(0).slice()
  };
}

export function compute(wasm, args) {
  if (!scran_normalization.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
  } else {
    var mat = scran_normalization.fetchNormalizedMatrix(wasm);
    cache.raw = wasm.model_gene_var(mat, false, 0, args.span);

    cache.sorted_residuals = cache.raw.residuals(0).slice(); // a separate copy.
    cache.sorted_residuals.sort();
    
    parameters = args;
    delete cache.reloaded;
    changed = true;
  }
  return;
}

export function results(wasm) {
  if ("reloaded" in cache) {
    return {
      "means": cache.reloaded.means.slice(),
      "vars": cache.reloaded.vars.slice(),
      "fitted": cache.reloaded.fitted.slice(),
      "resids": cache.reloaded.resids.slice()
    };
  } else {
    return spawnStats();
  }
}

export function serialize(wasm) {
  var output = { "parameters": parameters };

  if ("reloaded" in cache) {
    output.contents = {
      "means": cache.reloaded.means,
      "vars": cache.reloaded.vars,
      "fitted": cache.reloaded.fitted,
      "resids": cache.reloaded.resids
    };
  } else {
    output.contents = spawnStats();
  }

  return output;
}

export function unserialize(wasm, saved) {
  parameters = saved.parameters;
  cache.reloaded = saved.contents;

  cache.sorted_residuals = cache.reloaded.resids.slice();
  cache.sorted_residuals.sort();
  return;
}

export function fetchSortedResiduals(wasm) {
  return cache.sorted_residuals;
}

export function fetchResidualsUNSAFE(wasm) {
  if ("reloaded" in cache) {
    return cache.reloaded.resids;
  } else {
    return cache.raw.residuals(0);
  }
}
