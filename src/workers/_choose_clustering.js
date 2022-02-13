import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as snn_cluster from "./_snn_cluster.js";
import * as kmeans_cluster from "./_kmeans_cluster.js";

var cache = {};
var parameters = {};

export var changed = false;

/** Standard functions **/
export function compute(args) {
    changed = true;
    
    if (!utils.changedParameters(parameters, args)) {
        if (args.method == "snn_graph") {
            if (!snn_cluster.changed) {
                changed = false;
            }
        } else if (args.method == "kmeans") {
            if (!kmeans_cluster.changed) {
                changed = false;
            }
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
    if (parameters.method == "snn_graph") {
        return snn_cluster.fetchClustersAsWasmArray();
    } else if (parameters.method == "kmeans") {
        return kmeans_cluster.fetchClustersAsWasmArray();
    }
}
