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
        return cache.raw.membership({ copy: "view" });
    }
}

export function compute(args) {
    if (graph.changed === null) { // If my upstream was skipped, then I am also skipped.
        changed = null;
        utils.freeCache(cache.raw); // Also freeing some memory as a courtesy.
        utils.freeReloaded(cache);
        parameters = args;

    } else if (changed !== null && !graph.changed && !utils.changedParameters(parameters, args)) {
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
    // Cluster IDs will be passed to main thread in 
    // choose_clustering, so no need to do it here.
    return {};
}

export function serialize() {
    let output = { 
        "parameters": parameters
    };

    if (changed === null) {
        output.contents = null;
    } else {
        output.contents = {
            "clusters": fetchClustersAsWasmArray().slice()
        };
    }

    return output;
}

export function unserialize(saved) {
    parameters = saved.parameters;

    if (saved.contents !== null) {
        utils.freeReloaded(cache);
        cache.reloaded = saved.contents;

        var out = new scran.Int32WasmArray(cache.reloaded.clusters.length);
        out.set(cache.reloaded.clusters);
        cache.reloaded.clusters = out;
    } else {
        changed = null;
    }

    return;
}
