import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as qc from "./_quality_control.js";
import * as normalization from "./_normalization.js";
import * as markers from "./_utils_markers.js";

var cache = { "results": {} };
var parameters = { "selections": {} };

export var changed = false;

export function compute(args) {
    /* If the QC filter was re-run, all of the selections are invalidated as
     * the identity of the indices may have changed.
     */
    if (qc.changed) {
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

export function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("custom_selections");

    {
        let phandle = ghandle.createGroup("parameters");
        let rhandle = chandle.createGroup("selections");
        for (const [key, val] of Object.entries(parameters.selections)) {
            rhandle.writeDataSet(String(key), "Uint8", [val.length], val);
        }
    }

    {
        let chandle = ghandle.createGroup("results");
        let rhandle = chandle.createGroup("markers");
        for (const [key, val] of Object.entries(cache.results)) {
            markers.serializeGroupStats(rhandle, val, 1);
        }
    }
}

export function unserialize(path, permuter) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("custom_selections");

    {
        let phandle = ghandle.createGroup("parameters");
        let rhandle = chandle.createGroup("selections");
        parameters = { selections: {} };
        for (const key of Object.keys(rhandle.children)) {
            parameters.selections[key] = rhandle.openDataSet(key, { load: true }).values;
        }
    }

    {
        let chandle = ghandle.openGroup("results");
        let rhandle = chandle.openGroup("markers");
        reloaded = { clusters: {} };
        for (const sel of Object.keys(rhandle.children)) {
            clusters[sel] = markers.unserializeGroupStats(rhandle.openGroup(sel), permuter);
        }
    }

    return;
}


export function addSelection(id, selection) {
    var mat = normalization.fetchNormalizedMatrix();

    var buffer = utils.allocateCachedArray(mat.numberOfColumns(), "Int32Array", cache);
    buffer.fill(0);
    var tmp = buffer.array();
    selection.forEach(element => { tmp[element] = 1; });

    // Assumes that we have at least one cell in and outside the selection!
    var res = scran.scoreMarkers(mat, buffer); 
  
    // Removing previous results, if there were any.
    if (id in cache.results) {
        utils.freeCache(cache.results[id].raw);
        delete cache.results[id];
    }
  
    cache.results[id] = { "raw": res };
    parameters.selections[id] = selection;
}

export function removeSelection(id) {
    utils.freeCache(cache.results[id].raw);
    delete cache.results[id];
    delete parameters.selections[id];
    return;
}

export function fetchResults(id, rank_type) {
    var current = cache.results[id];
    return markers.fetchGroupResults(current, rank_type, 1); 
}
