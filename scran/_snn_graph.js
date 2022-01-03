const scran_snn_graph = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function rawCompute(wasm, args) {
    scran_utils.freeCache(cache.raw);
    var neighbors = scran_snn_neighbors.fetchNeighbors(wasm);
    cache.raw = wasm.build_snn_graph(neighbors, args.scheme);
    delete cache.reloaded;
    return;
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_snn_neighbors.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      rawCompute(wasm, args);
      parameters = args;
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
    return {};
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
    return;
  };

  /** Public functions (custom) **/
  x.fetchGraph = function(wasm) {
    if ("reloaded" in cache) {
      rawCompute(wasm, parameters);
    }
    return cache.raw;
  };
})(scran_snn_graph);
