import * as scran_utils from "./_utils.js";
import * as scran_snn_neighbors from "./_snn_neighbors.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute(wasm, args) {
  scran_utils.freeCache(cache.raw);
  var neighbors = scran_snn_neighbors.fetchNeighbors(wasm);
  cache.raw = wasm.build_snn_graph(neighbors, args.scheme);
  delete cache.reloaded;
  return;
}

export function compute(wasm, args) {
  if (!scran_snn_neighbors.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
  } else {
    rawCompute(wasm, args);
    parameters = args;
    changed = true;
  }
  return;
}

export function results(wasm) {
  return {};
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
  return;
}

export function fetchGraph(wasm) {
  if ("reloaded" in cache) {
    rawCompute(wasm, parameters);
  }
  return cache.raw;
}
