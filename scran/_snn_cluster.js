import * as scran_utils from "./_utils.js";
import * as scran_snn_graph from "./_snn_graph.js";

var cache = {};
var parameters = {};

export var changed = false;

function fetchClusters(wasm) {
  var chosen = cache.raw.best();
  return cache.raw.membership(chosen);
}

export function compute(wasm, args) {
  if (!scran_snn_graph.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
  } else {
    scran_utils.freeCache(cache.raw);
    var graph = scran_snn_graph.fetchGraph(wasm);
    cache.raw = wasm.cluster_snn_graph(graph, args.resolution);

    parameters = args;
    changed = true;

    if ("reloaded" in cache) {
      cache.reloaded.clusters.free();
      delete cache.reloaded;
    }
  }
  return;
}

export function results(wasm) {
  var clusters;
  if ("reloaded" in cache) {
    clusters = cache.reloaded.clusters.clone();
  } else {
    clusters = fetchClusters(wasm).slice();
  }
  return { "clusters": clusters };
}

export function serialize(wasm) {
  return {
    "parameters": parameters,
    "contents": results(wasm)
  };
}

export function unserialize(wasm, saved) {
  parameters = saved.parameters;
  cache.reloaded = saved.contents;
  cache.reloaded.clusters = scran_utils.wasmifyArray(wasm, cache.reloaded.clusters);
  return;
}

export function fetchClustersOFFSET(wasm) {
  if ("reloaded" in cache) {
    return cache.reloaded.clusters.ptr;
  } else {
    return fetchClusters(wasm).byteOffset;
  }
}
