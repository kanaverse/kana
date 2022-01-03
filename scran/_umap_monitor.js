const scran_umap_monitor = {};

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
      worker = scran_utils_viz_parent.createWorker("./umapWorker.js", "umap", "UMAP");
    }
   
    var nn_out = null;
    if (scran_neighbor_index.changed || scran_utils.changedParameters(parameters.num_neighbors, args.num_neighbors)) {
      nn_out = scran_utils_viz_parent.computeNeighbors(wasm, args.num_neighbors);
    }

    scran_utils_viz_parent.postMessage(worker, args, nn_out);

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
  
})(scran_umap_monitor);
