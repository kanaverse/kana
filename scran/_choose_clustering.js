const scran_choose_clustering = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    x.changed = true;

    if (!scran_utils.changedParameters(parameters, args)) {
      if (args.method == "snn_graph" && !scran_snn_graph.changed) {
        x.changed = false;
      }
    }

    if (x.changed) {
      delete cache.reloaded;
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
  x.fetchClustersOFFSET = function(wasm) {
//    if (parameters.method == "snn_graph") {
      return scran_snn_cluster.fetchClustersOFFSET(wasm); // really the only option right now.
//  }
  };
})(scran_choose_clustering);
