import * as scran_utils from "./_utils.js";
import * as scran_normaliazation from "./_normalization.js";
import * as scran_choose_clustering from "./_choose_clustering.js";

var cache = {};
var parameters = {};

export var changed = false;

export function compute(wasm, args) {
  if (!scran_normalization.changed && !scran_choose_clustering.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
  } else {
    scran_utils.freeCache(cache.raw);

    var mat = scran_normalization.fetchNormalizedMatrix(wasm);
    var cluster_offset = scran_choose_clustering.fetchClustersOFFSET(wasm);
    cache.raw = wasm.score_markers(mat, cluster_offset, false, 0);

    parameters = args;
    delete cache.reloaded;
    changed = true;
  }
  return;
}

export function results(wasm) {
  return {};
}

export function serialize(wasm) {
  var contents;
  if ("reloaded" in cache) {
    contents = cache.reloaded;
  } else {
    var contents = [];
    var num = cache.raw.num_groups();
    for (var i = 0; i < num; i++) {
      contents.push(scran_utils_markers.serializeGroupStats(cache.raw, i));
    }
  }
  return {
    "parameters": parameters,
    "contents": contents
  };
}

export function unserialize(wasm, saved) {
  parameters = saved.parameters;
  cache.reloaded = saved.contents;
  return;
}

export function fetchGroupResults(wasm, rank_type, group) {
  return scran_utils_markers.fetchGroupResults(wasm, cache.raw, cache.reloaded, rank_type, group); 
}
