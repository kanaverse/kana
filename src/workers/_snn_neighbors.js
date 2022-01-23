import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as index from "./_neighbor_index.js";

var cache = {};
var parameters = {};

export var changed = false;

export function rawCompute(args) {
    utils.freeCache(cache.raw);
    var nn_index = index.fetchIndex();
    cache.raw = scran.findNearestNeighbors(nn_index, args.k);
    delete cache.reloaded;
    return;
}

export function compute(args) {
    if (!index.changed && !utils.changedParameters(parameters, args)) {
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
};

export function unserialize(saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
}

export function fetchNeighbors() {
    if ("reloaded" in cache) {
        rawCompute(parameters);
    }
    return cache.raw;
}
