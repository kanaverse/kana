import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as index from "./_neighbor_index.js";

var cache = {};
var parameters = {};

export var changed = false;

export function rawCompute(args) {
    utils.freeCache(cache.raw);
    var nn_index = index.fetchIndex();
    cache.raw = scran.findNearestNeighbors(nn_index, args.k);
    delete cache.reloaded;
    return;
}

export function compute(args) {
    // Setting the existing cluster_method to the new method so that we don't
    // pick up changes in the method in the changedParameters() call. This aims
    // to preserve the state if only the clustering method choice changed, such
    // that a user avoids recomputation when they switch back to this method.
    let method = args.cluster_method;
    delete args.cluster_method;

    if (changed !== null && !index.changed && !utils.changedParameters(parameters, args)) {
        changed = false;

    } else if (!method.startsWith("snn_")) {
        changed = null; // neither changed or unchanged, just skipped.
        utils.freeCache(cache.raw); // freeing some memory as a courtesy.
        delete cache.reloaded;

    } else {
        rawCompute(args);
        parameters = args;
        changed = true;
    }

    return;
}

export function results() {
    return {};
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
};

export function unserialize(saved) {
    if (saved !== undefined) {
        parameters = saved.parameters;
        cache.reloaded = saved.contents;
    }
    return;
}

export function fetchNeighbors() {
    if ("reloaded" in cache) {
        rawCompute(parameters);
    }
    return cache.raw;
}
