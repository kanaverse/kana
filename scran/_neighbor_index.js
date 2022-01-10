import * as scran_utils from "./_utils.js";
import * as scran_pca from "./_pca.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute(wasm, args) {
  scran_utils.freeCache(cache.raw);
  var pcs = scran_pca.fetchPCsOFFSET(wasm);
  cache.raw = wasm.build_neighbor_index(pcs.offset, pcs.num_pcs, pcs.num_obs, args.approximate);
  delete cache.reloaded;
  return;
}

export function compute(wasm, args) {
  if (!scran_pca.changed && !scran_utils.changedParameters(parameters, args)) {
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

export function fetchIndex(wasm) {
  if ("reloaded" in cache) {
    rawCompute(wasm, parameters);
  }
  return cache.raw;
}
