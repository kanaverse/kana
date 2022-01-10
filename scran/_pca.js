import * as scran_utils from "./_utils.js";
import * as scran_normalization from "./_normalization.js";
import * as scran_model_gene_var from "./_model_gene_var.js";

var cache = {};
var parameters = {};

export var changed = false;

function fetchPCsUNSAFE(wasm) {
  if ("reloaded" in cache) {
    return cache.reloaded.pcs.array();
  } else {
    return cache.raw.pcs();
  }
}

export function compute(wasm, args) {
  if (!scran_normalization.changed && !scran_model_gene_var.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
  } else {
    // Choosing the highly variable genes.
    var sorted_resids = scran_model_gene_var.fetchSortedResiduals(wasm)
    var threshold_at = sorted_resids[sorted_resids.length - args.num_hvgs];

    var mat = scran_normalization.fetchNormalizedMatrix(wasm);
    var sub = scran_utils.allocateBuffer(wasm, mat.nrow(), "Uint8Array", cache);
    var unsorted_resids = scran_model_gene_var.fetchResidualsUNSAFE(wasm);
    sub.array().forEach((element, index, array) => {
      array[index] = unsorted_resids[index] >= threshold_at;
    });

    // Actually performing the PCA.
    scran_utils.freeCache(cache.raw);
    cache.raw = wasm.run_pca(mat, args.num_pcs, true, sub.ptr, false);

    changed = true;
    parameters = args;

    if ("reloaded" in cache) {
      cache.reloaded.pcs.free();
      delete cache.reloaded;
    }
  }
  return;
}

export function results(wasm) {
  var var_exp;

  if ("reloaded" in cache) {
    var_exp = cache.reloaded.var_exp.slice();
  } else {
    var pca_output = cache.raw;
    var_exp = pca_output.variance_explained().slice();
    var total_var = pca_output.total_variance();
    for (var n = 0; n < var_exp.length; n++) {
      var_exp[n] /= total_var;
    }
  }

  return { "var_exp": var_exp };
}

export function serialize(wasm) {
  var to_save = results(wasm);
  to_save.pcs = fetchPCsUNSAFE(wasm).slice();
  return {
    "parameters": parameters,
    "contents": to_save
  };
}

export function unserialize(wasm, saved) {
  parameters = saved.parameters;
  cache.reloaded = saved.contents;
  cache.reloaded.pcs = scran_utils.wasmifyArray(wasm, cache.reloaded.pcs);
  return;
}

export function fetchPCsOFFSET(wasm) {
  var pcs = fetchPCsUNSAFE(wasm);
  return {
    "offset": pcs.byteOffset,
    "num_pcs": parameters.num_pcs,
    "num_obs": pcs.length / parameters.num_pcs
  };
}
