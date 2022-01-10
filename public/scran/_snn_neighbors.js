import * as scran_utils from "./_utils.js";
import * as scran_neighbor_index from "./_neighbor_index.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute(wasm, args) {
  scran_utils.freeCache(cache.raw);
  var nn_index = scran_neighbor_index.fetchIndex(wasm);
  cache.raw = wasm.find_nearest_neighbors(nn_index, args.k);
  delete cache.reloaded;
  return;
}

export function compute(wasm, args) {
  if (!scran_neighbor_index.changed && !scran_utils.changedParameters(parameters, args)) {
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

export function fetchNeighbors(wasm) {
  if ("reloaded" in cache) {
    rawCompute(wasm, parameters);
  }
  return cache.raw;
}
