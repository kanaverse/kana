import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as index from "./_neighbor_index.js";

var cache = {};
var parameters = {};

export var changed = false;
export var invalid = true;

export function fetchClustersAsWasmArray() {
    if (!("clusters" in cache)) {
        if (invalid) {
            throw "cannot fetch SNN clusters from an invalid state";
        }
        return reloaded.clusters;
    } else {
        return cache.clusters.membership({ copy: "view" });
    }
}

function computeNeighbors(k) {
    utils.freeCache(cache.neighbors);
    cache.neighbors = scran.findNearestNeighbors(index.fetchIndex(), k);
    return;
}

function computeGraph(scheme) {
    if (!("neighbors" in cache)) {
        computeNeighbors(parameters.k);
    }
    utils.freeCache(cache.graph);
    cache.graph = scran.buildSNNGraph(cache.neighbors, { scheme: scheme });
    return;
}

function computeClusters(resolution) {
    if (!("graph" in cache)) {
        computeGraph(parameters.scheme);
    }
    utils.freeCache(cache.clusters);
    cache.clusters = scran.clusterSNNGraph(cache.graph, { resolution: args.resolution });
    return;
}

export function compute(run_me, k, scheme, resolution) {
    changed = false;
    invalid = false;

    if (index.changed || k !== parameters.k) {
        if (run_me) {
            computeNeighbors(k);
        }
        parameters.k = k;
        changed = true;
    }

    if (changed || scheme !== parameters.scheme) { 
        if (run_me) {
            computeGraph(scheme);
        }
        parameters.scheme = scheme;
        changed = true;
    }

    if (changed || resolution !== parameters.resolution) {
        if (run_me) {
            computeClusters(resolution);
        }
        parameters.resolution = resolution;
        changed = true;
    }

    if (changed) {
        if (reloaded !== null) {
            utils.free(reloaded.clusters);
            reloaded = null;
        }
        if (!run_me) {
            invalid = true;
        }
    }

    return;
}

export function results() {
    // Cluster IDs will be passed to main thread in 
    // choose_clustering, so no need to do it here.
    return {};
}

export function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("snn_graph_cluster");

    {
        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("k", "Int32", [], parameters.k);
        phandle.writeDataSet("scheme", "Scheme", [], ["rank", "number", "jaccard"][parameters.scheme]); // TODO: scheme should just directly be the string.
        phandle.writeDataSet("resolution", "Float64", [], parameters.resolution);
    }

    {
        let rhandle = ghandle.createGroup("results");
        let clusters = fetchClustersAsWasmArray();
        phandle.writeDataSet("clusters", "Int32", [clusters.length], clusters);
    }

    return;
}

export function unserialize(saved) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.openGroup("snn_graph_cluster");

    {
        let phandle = ghandle.openGroup("parameters");
        parameters = {
            k: phandle.openDataSet("k", { load: true }).values[0],
            scheme: phandle.openDataSet("scheme", { load: true }).values[0],
            resolution: phandle.openDataSet("resolution", { load: true }).values[0]
        };
        parameters.scheme = { "rank": 0, "number": 1, "jaccard": 2 }[parameters.scheme];
    }

    {
        let rhandle = ghandle.createGroup("results");

        if ("clusters" in rhandle.children) {
            let clusters = rhandle.openDataSet("clusters", { load: true }).values;
            reloaded = {};
            let buf = utils.allocateCachedArray(clusters.length, "Int32Array", reloaded, "clusters");
            buf.set(clusters);
            invalid = false;
        } else {
            invalid = true;
        }
    }

    return { ...parameters };
}
