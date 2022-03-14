import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
import * as choice from "./_choose_clustering.js";
import * as markers from "./_utils_markers.js";

var cache = {};
var parameters = {};
var reloaded = null;

export var changed = false;

export function compute() {
    changed = false;

    if (normalization.changed || choice.changed) {
        var mat = normalization.fetchNormalizedMatrix();
        var clusters = choice.fetchClustersAsWasmArray();
        
        utils.freeCache(cache.raw);
        cache.raw = scran.scoreMarkers(mat, clusters);

        // No parameters to set.
        changed = true;
    }

    if (changed) {
        reloaded = null;
    }
    return;
}

export function results() {
    return {};
}

export function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("marker_detection");
    ghandle.createGroup("parameters");

    {
        let chandle = ghandle.createGroup("results");
        let rhandle = chandle.createGroup("clusters");

        if ("raw" in cache) {
            var num = cache.raw.numberOfGroups();
            for (var i = 0; i < num; i++) {
                markers.serializeGroupStats(rhandle, cache.raw, i);
            }
        } else {
            for (const i of Object.keys(reloaded)) {
                markers.serializeGroupStats(rhandle, reloaded, i);
            }
        }
    }
}

export function unserialize(path, permuter) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("marker_detection");
    ghandle.createGroup("parameters");

    {
        let chandle = ghandle.openGroup("results");
        let rhandle = chandle.openGroup("clusters");
        reloaded = { clusters: {} };
        for (const cl of Object.keys(rhandle.children)) {
            clusters[Number(cl)] = markers.unserializeGroupStats(rhandle.openGroup(cl), permuter);
        }
    }

    return;
}

export function fetchGroupResults(rank_type, group) {
    let results = null;
    if ("raw" in cache) {
        return markers.fetchGroupResults(cache.raw, rank_type, group); 
    } else {
        return markers.fetchGroupResults(reloaded, rank_type, group); 
    }
}

export function numberOfGroups(results, reloaded) {
    if (!("raw" in cache)) {
        return Object.keys(reloaded.clusters).length;
    } else {
        return cache.raw.numberOfGroups();
    }
}

export function fetchGroupMeans(group, { copy = true }) {
    if (!("raw" in cache)) {
        let out = reloaded.clusters[group].means;
        if (copy) {
            return out.slice();
        } else {
            return out;
        }
    } else {
        return cache.raw.means(group, { copy: copy });
    }
}
