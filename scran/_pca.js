importScripts("./_utils.js");
importScripts("./_normalization.js");
importScripts("./_model_gene_var.js");

const scran_pca = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function fetchPCsUNSAFE(wasm) {
    if ("reloaded" in cache) {
      return cache.reloaded.pcs.array();
    } else {
      return cache.raw.pcs();
    }
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_normalization.changed && !scran_model_gene_var.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
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
      utils.freeCache(cache.raw);
      cached.raw = wasm.run_pca(mat, args.num_pcs, true, sub.ptr, false);

      x.changed = true;
      parameters = args;

      if ("reloaded" in cache) {
        cache.reloaded.pcs.free();
        delete cache.reloaded;
      }
    }
    return;
  }

  x.results = function(wasm) {
    var var_exp;

    if ("reloaded" in cache) {
      var_exp = cache.reloaded.var_exp;
    } else {
      var pca_output = cached.raw;
      var_exp = pca_output.variance_explained().slice();
      var total_var = pca_output.total_variance();
      for (var n = 0; n < var_exp.length; n++) {
        var_exp[n] /= total_var;
      }
    }

    return { "var_exp": var_exp };
  };

  x.serialize = function(wasm) {
    var to_save = x.results(wasm);
    to_save.pcs = fetchPCsUNSAFE(wasm).slice();
    return {
      "parameters": parameters,
      "contents": to_save
    };
  };

  x.unserialize = function(wasm, saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;

    var tmp = new WasmBuffer(wasm, cache.reloaded.pcs.length, "Float64Array");
    tmp.set(cache.reloaded.pcs);
    cache.reloaded.pcs = tmp;
    return;
  };

  /** Public functions (custom) **/
  x.fetchPCsUNSAFE = function(wasm) {
    var pcs = fetchPCsUNSAFE(wasm);
    return {
      "matrix": pcs,
      "num_pcs": parameters.num_pcs,
      "num_obs": pcs.length / parameters.num_pcs
    };
  };
})(scran_pca);
