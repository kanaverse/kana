import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as pca from "./_pca.js";

var cache = {};
var parameters = {};

export var changed = false;

export function rawCompute(approximate) {
    var pcs = pca.fetchPCs();
    cache.raw = scran.buildNeighborSearchIndex(pcs.pcs, { approximate: approximate, numberOfDims: pcs.num_pcs, numberOfCells: pcs.num_obs });
    return;
}

export function compute(approximate) {
    changed = false;

    if (pca.changed || approximate != parameters.approximate) {
        rawCompute(approximate);
        parameters.approximate = approximate;
        changed = true;
    }

    return;
}

export function results() {
    return {};
}

export function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("neighbor_index");

    {
        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("approximate", "Uint8", [], Number(parameters.approximate));
    }

    ghandle.createGroup("results");
    return;
}

export function unserialize(saved) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.openGroup("neighbor_index");

    {
        let phandle = ghandle.openGroup("parameters");
        parameters = {
            approximate: phandle.openDataSet("approximate", { load: true }).value > 0
        };
    }

    return { ...parameters };
}

export function fetchIndex() {
    if (!("raw" in cache)) {
        rawCompute(parameters.approximate);
    }
    return cache.raw;
}
