import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as pca from "./_pca.js";

var cache = {};
var parameters = {};

export var changed = false;

export function rawCompute(args) {
    utils.freeCache(cache.raw);
    var pcs = pca.fetchPCs();
    cache.raw = scran.buildNeighborSearchIndex(pcs.pcs, { numberOfDims: pcs.num_pcs, numberOfCells: pcs.num_obs });
    delete cache.reloaded;
    return;
}

export function compute(args) {
    if (!pca.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        rawCompute(args);
        parameters = args;
        changed = true;
    }
    return;
}

export function results() {
    return {};
}

export function serialize() {
    return {
      "parameters": parameters,
      "contents": results()
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
}

export function fetchIndex() {
    if ("reloaded" in cache) {
        rawCompute(parameters);
    }
    return cache.raw;
}
