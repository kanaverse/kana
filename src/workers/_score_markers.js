import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
import * as choice from "./_choose_clustering.js";
import * as markers from "./_utils_markers.js";

var cache = {};
var parameters = {};

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

    return;
}

export function results() {
    return {};
}

export function serialize(handle) {
    let ghandle = handle.createGroup("marker_detection");
    ghandle.createGroup("parameters");

    {
        let chandle = ghandle.createGroup("results");
        let rhandle = chandle.createGroup("clusters");

        var num = cache.raw.numberOfGroups();
        for (var i = 0; i < num; i++) {
            markers.serializeGroupStats(rhandle, cache.raw, i);
        }
    }
}

class ScoreMarkersMimic {
    constructor(clusters) {
        this.clusters = clusters;
    }

    effect_grabber(key, group, summary, copy) {
        let sidx = markers.int2summaries[summary];
        let chosen = this.clusters[group][key][sidx];
        return utils.mimicGetter(chosen, copy);
    }

    lfc(group, { summary, copy }) {
        return this.effect_grabber("lfc", group, summary, copy);
    }

    deltaDetected(group, { summary, copy }) {
        return this.effect_grabber("delta_detected", group, summary, copy);
    }

    cohen(group, { summary, copy }) {
        return this.effect_grabber("cohen", group, summary, copy);
    }

    auc(group, { summary, copy }) {
        return this.effect_grabber("auc", group, summary, copy);
    }

    stat_grabber(key, group, copy) {
        let chosen = this.clusters[group][key];
        return utils.mimicGetter(chosen, copy);
    }

    means(group, { copy }) {
        return this.stat_grabber("means", group, copy);
    }

    detected(group, { copy }) {
        return this.stat_grabber("detected", group, copy);
    }

    numberOfGroups() {
        return Object.keys(this.clusters).length;
    }

    free() {}
}

export function unserialize(handle, permuter) {
    let ghandle = handle.open("marker_detection");

    // No parameters to unserialize.

    {
        let chandle = ghandle.open("results");
        let rhandle = chandle.open("clusters");
        let clusters = {};
        for (const cl of Object.keys(rhandle.children)) {
            clusters[Number(cl)] = markers.unserializeGroupStats(rhandle.open(cl), permuter);
        }
        cache.raw = new ScoreMarkersMimic(clusters);
    }

    return;
}

export function fetchGroupResults(rank_type, group) {
    return markers.fetchGroupResults(cache.raw, rank_type, group); 
}

export function numberOfGroups() {
    return cache.raw.numberOfGroups();
}

export function fetchGroupMeans(group, { copy = true }) {
    return cache.raw.means(group, { copy: copy });
}
