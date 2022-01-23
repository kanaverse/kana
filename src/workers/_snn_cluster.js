import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as graph from "./_snn_graph.js";

var cache = {};
var parameters = {};

export var changed = false;

export function fetchClustersAsWasmArray() {
    if ("reloaded" in cache) {
        return cache.reloaded.clusters;
    } else {
        var tmp = cache.raw.membership({ copy: false });
        return new scran.Int32WasmArray(tmp.length, tmp.byteOffset);
    }
}

export function compute(args) {
    if (!graph.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        utils.freeCache(cache.raw);
        var g = graph.fetchGraph();
        cache.raw = scran.clusterSNNGraph(g, { resolution: args.resolution });

        parameters = args;
        changed = true;
        utils.freeReloaded(cache);
    }
    return;
}

export function results() {
    var clusters = fetchClustersAsWasmArray();
    return { "clusters": clusters.slice() };
}

export function serialize() {
    return {
      "parameters": parameters,
      "contents": results()
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;

    utils.freeReloaded(cache);
    cache.reloaded = saved.contents;

    var out = new scran.Int32WasmArray(cache.reloaded.clusters.length);
    out.set(cache.reloaded.clusters);
    cache.reloaded.clusters = out;

    return;
}
