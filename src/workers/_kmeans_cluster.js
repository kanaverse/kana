import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as graph from "./_pca.js";

var cache = {};
var parameters = {};

export var changed = false;

export function fetchClustersAsWasmArray() {
    if ("reloaded" in cache) {
        return cache.reloaded.clusters;
    } else {
        var tmp = cache.raw.clusters({ copy: false });
        return new scran.Int32WasmArray(tmp.length, tmp.byteOffset);
    }
}

export function compute(args) {
    if (!pca.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        utils.freeCache(cache.raw);
        var pcs = pca.fetchPCs();
        cache.raw = scran.clusterKmeans(pcs.pcs, args.kmeans_clusters, { numberOfDims: pcs.num_pcs, numberOfCells: pcs.num_obs });

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
