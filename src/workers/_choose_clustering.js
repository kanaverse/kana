import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as snn_cluster from "./_snn_cluster.js";
import * as kmeans_cluster from "./_kmeans_cluster.js";

var cache = {};
var parameters = {};

export var changed = false;

export function compute(method) {
    changed = true;
    
    if (method == parameters.method) {
        if (method == "snn_graph") {
            if (!snn_cluster.changed) {
                changed = false;
            }
        } else if (method == "kmeans") {
            if (!kmeans_cluster.changed) {
                changed = false;
            }
        }
    }

    parameters.method = method;
    return;
}

export function results() {
    var clusters = fetchClustersAsWasmArray();
    return { "clusters": clusters.slice() };
}

export function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("choose_clustering");

    {
        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("method", "String", [], parameters.method);
    }

    // No need to serialize the cluster IDs as this is done for each step.
    ghandle.createGroup("results");
    return;
}

export function unserialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.open("choose_clustering");

    {
        let phandle = ghandle.open("parameters");
        parameters = {
            method: phandle.open("method", { load: true }).values[0]
        };
    }

    return { ...parameters };
}

export function fetchClustersAsWasmArray() {
    if (parameters.method == "snn_graph") {
        return snn_cluster.fetchClustersAsWasmArray();
    } else if (parameters.method == "kmeans") {
        return kmeans_cluster.fetchClustersAsWasmArray();
    }
}
