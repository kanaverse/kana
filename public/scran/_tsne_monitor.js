const scran_tsne_monitor = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};
  var worker = null;

  /** Public members **/
  x.changed = false;

  /** Public functions **/
  x.compute = function(wasm, args) {
    if (!scran_neighbor_index.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
      return;
    }

    if (worker == null) {
      worker = scran_utils_viz_parent.createWorker("./tsneWorker.js", "tsne", "t-SNE");
    }
   
    var nn_out = null;
    if (scran_neighbor_index.changed || scran_utils.changedParameters(parameters.perplexity, args.perplexity)) {
      var k = wasm.perplexity_to_k(params.perplexity);
      nn_out = scran_utils_viz_parent.transferNeighbors(wasm, k);
    }

    scran_utils_viz_parent.sendNeighbors(worker, args, nn_out);

    parameters = args;
    delete cache.reloaded;
    x.changed = true;
  };

  x.serialize = function(wasm) {
    /* TODO: interrogate the worker for coordinates and return a promise. */
    return {
      "parameters": parameters,
      "contents": {} 
    };
  };

  x.unserialize = function(wasm, saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };
  
})(scran_tsne_monitor);
