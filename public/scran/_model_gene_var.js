const scran_model_gene_var = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions (standard) **/
  function spawnStats() {
    var model_output = cache.raw;
    return {
      "means": model_output.means(0).slice(),
      "vars": model_output.variances(0).slice(),
      "fitted": model_output.fitted(0).slice(),
      "resids": model_output.residuals(0).slice()
    };
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_normalization.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      var mat = scran_normalization.fetchNormalizedMatrix(wasm);
      cache.raw = wasm.model_gene_var(mat, false, 0, args.span);

      cache.sorted_residuals = cache.raw.residuals(0).slice(); // a separate copy.
      cache.sorted_residuals.sort();
      
      parameters = args;
      delete cache.reloaded;
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
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
  };

  x.serialize = function(wasm) {
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
    };

    return output;
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
