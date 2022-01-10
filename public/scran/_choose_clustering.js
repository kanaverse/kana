import * as scran_utils from "./_utils.js";
import * as scran_snn_cluster from "./_snn_cluster.js";

var cache = {};
var parameters = {};

export var changed = false;

export function compute(wasm, args) {
  changed = true;

  if (!scran_utils.changedParameters(parameters, args)) {
    if (args.method == "snn_graph" && !scran_snn_cluster.changed) {
      changed = false;
    }
  }

  if (changed) {
    delete cache.reloaded;
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

export function fetchClustersOFFSET(wasm) {
//  if (parameters.method == "snn_graph") {
    return scran_snn_cluster.fetchClustersOFFSET(wasm); // really the only option right now.
//  }
}
