importScripts("./_utils.js");
importScripts("./_normalization.js");

const scran_model_gene_var = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_normalization.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      var mat = fetchNormalizedMatrix(wasm);
      cached.raw = wasm.model_gene_var(mat, false, 0, args.span);

      cached.sorted_residuals = model_output.residuals(0).slice(); // a separate copy.
      cached.sorted_residuals.sort();
      
      parameters = args;
      delete cache.reloaded;
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
    if ("reloaded" in cache) {
      return cache.reloaded;
    } else {
      var model_output = cache.raw;
      return {
        "means": model_output.means(0).slice(),
        "vars": model_output.variances(0).slice(),
        "fitted": model_output.fitted(0).slice(),
        "resids": model_output.residuals(0).slice()
      };
    }
  };

  x.serialize = function(wasm) {
    return {
      "parameters": parameters,
      "contents": x.results(wasm)
    };
  };

  x.unserialize = function(wasm, saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;

    cache.sorted_residuals = cache.reloaded.resids.slice();
    cache.sorted_residuals.sort();
    return;
  };

  /** Public functions (custom) **/
  x.fetchSortedResiduals = function(wasm) {
    return cache.sorted_residuals;
  }

  x.fetchResidualsUNSAFE = function(wasm) {
    if ("reloaded" in cache) {
      return cache.reloaded.resids;
    } else {
      return cache.raw.residuals(0);
    }
  };
})(scran_model_gene_var);
