import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
import * as choice from "./_choose_clustering.js";
import * as markers from "./_utils_markers.js";

var cache = {};
var parameters = {};

export var changed = false;

export function compute(args) {
    if (!normalization.changed && !choice.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        utils.freeCache(cache.raw);
        var mat = normalization.fetchNormalizedMatrix();
        var clusters = choice.fetchClustersAsWasmArray();

        cache.raw = scran.scoreMarkers(mat, clusters);

        parameters = args;
        delete cache.reloaded;
        x.changed = true;
    }
    return;
}

export function results() {
    return {};
}

export function serialize() {
    var contents;
    if ("reloaded" in cache) {
        contents = cache.reloaded;
    } else {
        var contents = [];
        var num = cache.raw.num_groups(); /** TODO: get the number of groups. **/
        for (var i = 0; i < num; i++) {
            contents.push(markers.serializeGroupStats(cache.raw, i));
        }
    }
    return {
        "parameters": parameters,
        "contents": contents
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
}

export function fetchGroupResults(rank_type, group) {
    return markers.fetchGroupResults(cache.raw, cache.reloaded, rank_type, group); 
}
