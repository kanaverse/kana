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
    // Removing the cluster_method so that we don't pick up changes in the
    // method in the changedParameters() call. This aims to preserve the state
    // if only the clustering method choice changed, such that a user avoids
    // recomputation when they switch back to this method.
    let method = args.cluster_method;
    delete args.cluster_method;

    if (changed !== null && !pca.changed && !utils.changedParameters(parameters, args)) {
        changed = false;

    } else if (method !== "kmeans") {
        changed = null; // neither changed or unchanged, just skipped.
        utils.freeCache(cache.raw); // free up some memory as a courtesy.
        utils.freeReloaded(cache);

    } else {
        utils.freeCache(cache.raw);
        var pcs = pca.fetchPCs();
        cache.raw = scran.clusterKmeans(pcs.pcs, args.k, { numberOfDims: pcs.num_pcs, numberOfCells: pcs.num_obs });
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
    if (changed === null) {
        return null;
    } else {
        return {
          "parameters": parameters,
          "contents": results()
        };
    }
}

export function unserialize(saved) {
    if (saved !== undefined) {
        parameters = saved.parameters;

        utils.freeReloaded(cache); // free anything that might have been there previously.
        cache.reloaded = saved.contents;

        var out = new scran.Int32WasmArray(cache.reloaded.clusters.length);
        out.set(cache.reloaded.clusters);
        cache.reloaded.clusters = out;
    }
    return;
}
