import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as pca from "./_pca.js";

var cache = {};
var parameters = {};

export var changed = false;

export function valid() {
    return ("raw" in cache);
}

export function fetchClustersAsWasmArray() {
    if (!valid()) {
        throw "cannot fetch k-means clusters from an invalid state";
    } else {
        return cache.raw.clusters({ copy: "view" });
    }
}

export function compute(run_me, k) {
    changed = false;

    let run_k = (pca.changed || k != parameters.k);
    if (run_me && !valid()) {
        run_k = true;
    }

    if (run_k) {
        utils.freeCache(cache.raw);
        if (run_me) {
            var pcs = pca.fetchPCs();
            cache.raw = scran.clusterKmeans(pcs.pcs, k, { numberOfDims: pcs.num_pcs, numberOfCells: pcs.num_obs, initMethod: "pca-part" });
        } else {
            delete cache.raw; // ensure this step gets re-run later when run_me = true. 
        }
        parameters.k = k;
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
    let ghandle = handle.createGroup("kmeans_cluster");

    {
        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("k", "Int32", [], parameters.k);
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

class KmeansMimic {
    constructor(clusters) {
        this.buffer = scran.createInt32WasmArray(clusters.length);
        this.buffer.set(clusters);
    }

    clusters({ copy }) {
        return utils.mimicGetter(this.buffer, copy);
    }

    free() {
        this.buffer.free();
    }
}

export function unserialize(handle) {
    parameters = {
        k: 10
    };

    // Protect against old analysis states that don't have kmeans_cluster.
    if ("kmeans_cluster" in handle.children) {
        let ghandle = handle.open("kmeans_cluster");

        {
            let phandle = ghandle.open("parameters");
            parameters.k = phandle.open("k", { load: true }).values[0];
        }

        {
            let rhandle = ghandle.open("results");
            if ("clusters" in rhandle.children) {
                let clusters = rhandle.open("clusters", { load: true }).values;
                cache.raw = new KmeansMimic(clusters);
            }
        }
    }

    return { ...parameters };
}
