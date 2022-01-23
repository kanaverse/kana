import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as cluster from "./_snn_cluster.js";

var cache = {};
var parameters = {};

export var changed = false;

/** Standard functions **/
export function compute(args) {
    changed = true;
    
    if (!utils.changedParameters(parameters, args)) {
        if (args.method == "snn_graph" && !cluster.changed) {
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

export function results() {
    return {};
}

export function serialize() {
    return {
        "parameters": parameters,
        "contents": results()
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
}

/** Non-standard functions **/
export function fetchClustersAsWasmArray() {
//    if (parameters.method == "snn_graph") {
    return cluster.fetchClustersAsWasmArray(); // really the only option right now.
//  }
}
