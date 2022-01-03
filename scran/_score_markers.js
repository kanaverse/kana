const scran_score_markers = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_normalization.changed && !scran_choose_clustering.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      scran_utils.freeCache(cache.raw);

      var mat = scran_normalization.fetchNormalizedMatrix(wasm);
      var cluster_offset = scran_choose_clustering.fetchClustersOFFSET(wasm);
      cache.raw = wasm.score_markers(mat, cluster_offset, false, 0);

      parameters = args;
      delete cache.reloaded;
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
    return {};
  };

  x.serialize = function(wasm) {
    var contents;
    if ("reloaded" in cache) {
      contents = cache.reloaded;
    } else {
      var contents = [];
      var num = cache.raw.num_groups(); /** TODO: get the number of groups. **/
      for (var i = 0; i < num; i++) {
        contents.push(scran_utils_markers.serializeGroupStats(cache.raw, i));
      }
    }
    return {
      "parameters": parameters,
      "contents": contents
    };
  };

  x.unserialize = function(wasm, saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };

  /** Public functions (custom) **/
  x.fetchGroupResults = function(wasm, rank_type, group) {
    return scran_utils_markers.fetchGroupResults(wasm, cache.raw, cache.reloaded, rank_type, group); 
  }
})(scran_score_markers);
