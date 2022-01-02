importScripts("./_utils.js");
importScripts("./_pca.js");

const scran_neighbor_index = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function rawCompute(wasm) {
    scran_utils.freeCache(cache.raw);
    var pcs = scran_pca.fetchPCsOFFSET(wasm);
    cache.raw = wasm.build_neighbor_index(pcs.offset, pcs.num_pcs, pcs.num_obs, args.approximate);
    delete cache.reloaded;
    return;
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_pca.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      rawCompute(wasm);
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
  x.fetchIndex = function(wasm) {
    if ("reloaded" in cache) {
      rawCompute(wasm);
    }
    return cache.raw;
  };
})(scran_neighbor_index);
