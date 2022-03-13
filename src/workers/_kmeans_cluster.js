import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as pca from "./_pca.js";

var cache = {};
var parameters = {};

export var changed = false;
export var skipped = false;

export function fetchClustersAsWasmArray() {
    if (!("raw" in cache)) {
        return cache.reloaded.clusters;
    } else {
        return cache.raw.clusters({ copy: "view" });
    }
}

export function compute(run_me, k) {
    changed = false;
    skipped = !run_me;

    if (pca.changed || k != parameters.k) {
        if (run_me) {
            var pcs = pca.fetchPCs();
            utils.freeCache(cache.raw);
            cache.raw = scran.clusterKmeans(pcs.pcs, k, { numberOfDims: pcs.num_pcs, numberOfCells: pcs.num_obs, initMethod: "pca-part" });
        }

        parameters.k = k;
        changed = true;
    }

    if (changed) {
        if (reloaded !== null) {
            utils.free(reloaded.clusters);
            reloaded = null;
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
    let ghandle = fhandle.createGroup("kmeans_cluster");

    {
        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("k", "Int32", [], parameters.k);
    }

    {
        let rhandle = ghandle.createGroup("results");
        let clusters = fetchClustersAsWasmArray();
        phandle.writeDataSet("clusters", "Int32", [clusters.length], clusters);
    }
}

export function unserialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.openGroup("kmeans_cluster");

    {
        let phandle = ghandle.openGroup("parameters");
        parameters = {
            k: phandle.openDataSet("k", { load: true }).values[0]
        };
    }

    {
        let rhandle = ghandle.createGroup("results");
        let clusters = rhandle.openDataSet("clusters", { load: true }).values;
        
        reloaded = {};
        let buf = utils.allocateCachedArray(clusters.length, "Int32Array", reloaded, "clusters");
        buf.set(clusters);
    }
}
