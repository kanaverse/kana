const scran_tsne_init = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_viz_neighbors.changed && !scran_utils.changedParameters(args, parameters)) {
      x.changed = false;
    } else {
      scran_utils.freeCache(cache.raw);
      cache.raw = wasm.initialize_tsne(scran_viz_neighbors.fetchResults(wasm), args.perplexity);
      parameters = args;
      x.changed = true;
    }
    return;
  };
 
  x.results = function(wasm) {
    return {};
  };

  /** Public functions (custom) **/
  x.cloneInit = function(wasm) {
    return cache.raw.deepcopy();
  };
})(scran_tsne_init);
