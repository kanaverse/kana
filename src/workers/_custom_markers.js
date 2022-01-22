import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as filter from "./_qc_filter.js";
import * as markers from "./_score_markers.js";

var cache = { "results": {} };
var parameters = { "selections": {} };

export var changed = false;

export function compute = function(args) {
    /* If the QC filter was re-run, all of the selections are invalidated as
     * the identity of the indices may have changed.
     */
    if (filter.changed) {
        parameters.selections = {};
        for (const [key, val] of Object.entries(cache.results)) {
            utils.freeCache(val.raw);                    
        }
        cache.results = {};
    }

    /*
     * Technically we would need to re-run detection on the existing selections
     * if the normalization changed but the QC was the same. In practice, this
     * never happens, so we'll deal with it later.
     */
    
    changed = true;
    return;
}

export function results() {
    return {};
}

export function serialize() {
    var results = {};
    
    for (const [key, val] of Object.entries(cache.results)) {
        if ("reloaded" in val) {
            results[key] = val.reloaded;
        } else {
            results[key] = markers.serializeGroupStats(val.raw, 1);
        }
    }
    
    return {
        "parameters": parameters,
        "contents": { "results": results }
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;
    for (const [key, val] of Object.entries(saved.contents)) {
        cache.results[key] = { "reloaded": val };
    }
    return;
}

export function addSelection(id, selection) {
    var mat = scran_normalization.fetchNormalizedMatrix();

    var buffer = scran_utils.allocateCachedArray(mat.numberOfColumns(), "Int32Array", cache);
    buffer.fill(0);
    var tmp = buffer.array();
    selection.forEach(element => { tmp[element] = 1; });

    // Assumes that we have at least one cell in and outside the selection!
    var res = scran.score_markers(mat, buffer); 
  
    // Removing previous results, if there were any.
    if (id in cache.results) {
        scran_utils.freeCache(cache.results[id].raw);
        delete cache.results[id];
    }
  
    cache.results[id] = { "raw": res };
    parameters.selections[id] = selection;
}

export function removeSelection = function(id) {
    scran_utils.freeCache(cache.results[id].raw);
    delete cache.results[id];
    delete parameters.selections[id];
}

export function fetchResults = function(id, rank_type) {
    var current = cache.results[id];
    return markers.fetchGroupResults(current.raw, current.reloaded, rank_type, 1); 
};
