const scran_snn_cluster = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions (standard) **/
  function fetchClusters(wasm) {
    var chosen = cache.raw.best();
    return cache.raw.membership(chosen);
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_snn_graph.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      scran_utils.freeCache(cache.raw);
      var graph = scran_snn_graph.fetchGraph(wasm);

      try {
        cache.raw = wasm.cluster_snn_graph(graph, args.resolution);
      } catch (e) {
        throw wasm.get_error_message(e);
      }

      parameters = args;
      x.changed = true;

      if ("reloaded" in cache) {
        cache.reloaded.clusters.free();
        delete cache.reloaded;
      }
    }
    return;
  };

  x.results = function(wasm) {
    var clusters;
    if ("reloaded" in cache) {
      clusters = cache.reloaded.clusters.clone();
    } else {
      clusters = fetchClusters(wasm).slice();
    }
    return { "clusters": clusters };
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
    cache.reloaded.clusters = scran_utils.wasmifyArray(wasm, cache.reloaded.clusters);
    return;
  };

  /** Public functions (custom) **/
  x.fetchClustersOFFSET = function(wasm) {
    if ("reloaded" in cache) {
      return cache.reloaded.clusters.ptr;
    } else {
      return fetchClusters(wasm).byteOffset;
    }
  };
})(scran_snn_cluster);
