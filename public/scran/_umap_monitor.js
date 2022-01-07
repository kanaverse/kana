const scran_umap_monitor = {};

(function(x) {
  /** Private members **/
  var cache = { "counter": 0, "promises": {} };
  var parameters = {};
  var worker = null;

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function core(wasm, args, reneighbor) {
    if (worker == null) {
      worker = scran_utils_viz_parent.createWorker("./umapWorker.js", cache);
      cache.initialized = scran_utils_viz_parent.initializeWorker(worker, cache);
    }

    var nn_out = null;
    if (reneighbor()) {
      nn_out = scran_utils_viz_parent.computeNeighbors(wasm, args.num_neighbors);
    }

    cache.run = cache.initialized.then(x => scran_utils_viz_parent.runWithNeighbors(worker, args, nn_out, cache));
    return;
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_neighbor_index.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
      return;
    }

    core(wasm, args, () => {
      return scran_neighbor_index.changed || scran_utils.changedParameters(parameters.num_neighbors, args.num_neighbors);
    });

    parameters = args;
    delete cache.reloaded;
    x.changed = true;
  };

  x.results = function(wasm) {
    return scran_utils_viz_parent.retrieveCoordinates(worker, cache);
  }

  x.serialize = function(wasm) {
    return scran_utils_viz_parent.retrieveCoordinates(worker, cache)
    .then(contents => {
      return {
        "parameters": parameters,
        "contents": contents
      };
    });
  };

  x.unserialize = function(wasm, saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };

  /** Public functions (custom) **/
  x.animate = function(wasm) {
    if ("reloaded" in cache) {
      var param_copy = { ...parameters };
      param_copy.animate = true;
      core(wasm, param_copy, ()=>true);
      delete cache.reloaded;

      // Mimicking the response from the re-run.
      return cache.run.then(contents => { 
        return {
          "type": "umap_rerun",
          "data": { "status": "SUCCESS" }
        };
      });
    } else {
      return scran_utils_viz_parent.sendTask(worker, { "cmd": "RERUN" }, cache);
    }
  }
  
})(scran_umap_monitor);
