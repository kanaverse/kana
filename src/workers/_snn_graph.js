import * as scran from "scran.js";
import * as neighbors from "./_snn_neighbors.js";
import * as utils from "./_utils.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute(args) {
    utils.freeCache(cache.raw);
    var res = neighbors.fetchNeighbors();
    cache.raw = scran.buildSNNGraph(res, { scheme: args.scheme });
    delete cache.reloaded;
    return;
}

export function compute(args) {
    if (!neighbors.changed && !utils.changedParameters(parameters, args)) {
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

export function fetchGraph() {
    if ("reloaded" in cache) {
        rawCompute(parameters);
    }
    return cache.raw;
}
