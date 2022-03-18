import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as index from "./_neighbor_index.js";

var cache = {};
var parameters = {};

export var changed = false;

export function valid() {
    return ("clusters" in cache);
}

export function fetchClustersAsWasmArray() {
    if (!valid()) {
        throw "cannot fetch SNN clusters from an invalid state";
    } else {
        return cache.clusters.membership({ copy: "view" });
    }
}

export function compute(run_me, k, scheme, resolution) {
    changed = false;

    let rerun_neighbors = (index.changed || k !== parameters.k);
    let rerun_graph = (rerun_neighbors || scheme !== parameters.scheme);
    let rerun_clusters = (rerun_graph || resolution !== parameters.resolution);
    if (run_me && !valid()) {
        rerun_clusters = true;
    }

    // Checking whether each step needs content from the preceding step(s).
    // This is necessary when working with reloaded states and we want to rerun
    // some later steps but still need to generate their prerequisites.
    if (!("graph" in cache)) {
        if (rerun_clusters) {
            rerun_graph = true;
        }
    }
    if (!("neighbors" in cache)) {
        if (rerun_graph || rerun_clusters) {
            rerun_neighbors = true;
        }
    }

    if (rerun_neighbors) {
        utils.freeCache(cache.neighbors);
        if (run_me) {
            cache.neighbors = scran.findNearestNeighbors(index.fetchIndex(), k);
        } else {
            delete cache.neighbors; // ensuring that this is re-run on future calls to compute() with run_me = true.
        }
        parameters.k = k;
    }

    if (rerun_graph) {
        utils.freeCache(cache.graph);
        if (run_me) {
            cache.graph = scran.buildSNNGraph(cache.neighbors, { scheme: scheme });
        } else {
            delete cache.graph;
        }
        parameters.scheme = scheme;
    }

    if (rerun_clusters) {
        utils.freeCache(cache.clusters);
        if (run_me) {
            cache.clusters = scran.clusterSNNGraph(cache.graph, { resolution: resolution });
        } else {
            delete cache.clusters;
        }
        parameters.resolution = resolution;
        changed = true;
    }

    return;
}

export function results() {
    // Cluster IDs will be passed to main thread in 
    // choose_clustering, so no need to do it here.
    return {};
}

export function serialize(handle) {
    let ghandle = handle.createGroup("snn_graph_cluster");

    {
        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("k", "Int32", [], parameters.k);
        phandle.writeDataSet("scheme", "Scheme", [], ["rank", "number", "jaccard"][parameters.scheme]); // TODO: scheme should just directly be the string.
        phandle.writeDataSet("resolution", "Float64", [], parameters.resolution);
    }

    {
        let rhandle = ghandle.createGroup("results");
        if (valid()) {
            let clusters = fetchClustersAsWasmArray();
            rhandle.writeDataSet("clusters", "Int32", null, clusters);
        }
    }

    return;
}

class SNNClusterMimic {
    constructor(clusters) {
        this.buffer = scran.createInt32WasmArray(clusters.length);
        this.buffer.set(clusters);
    }

    membership({ copy }) {
        return utils.mimicGetter(this.buffer, copy);
    }

    free() {
        this.buffer.free();
    }
}

export function unserialize(handle) {
    let ghandle = handle.open("snn_graph_cluster");

    {
        let phandle = ghandle.open("parameters");
        parameters = {
            k: phandle.open("k", { load: true }).values[0],
            scheme: phandle.open("scheme", { load: true }).values[0],
            resolution: phandle.open("resolution", { load: true }).values[0]
        };
        parameters.scheme = { "rank": 0, "number": 1, "jaccard": 2 }[parameters.scheme];
    }

    {
        let rhandle = ghandle.open("results");
        if ("clusters" in rhandle.children) {
            let clusters = rhandle.open("clusters", { load: true }).values;
            cache.clusters = new SNNClusterMimic(clusters);
        }
    }

    return { ...parameters };
}
