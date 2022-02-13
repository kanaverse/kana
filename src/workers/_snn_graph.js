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
    if (neighbors.changed === null) { // If my upstream was skipped, then I am also skipped.
        changed = null;
        utils.freeCache(cache.raw); // Clearing out memory as a courtesy.
        delete cache.reloaded;
        parameters = args;

    } else if (changed !== null && !neighbors.changed && !utils.changedParameters(parameters, args)) {
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
    let output = { 
        "parameters": parameters
    };

    if (changed === null) {
        output.contents = null;
    } else {
        output.contents = results();
    }

    return output;
}

export function unserialize(saved) {
    parameters = saved.parameters;

    if (saved !== undefined) {
        cache.reloaded = saved.contents;
    } else {
        changed = null;
    }

    return;
}

export function fetchGraph() {
    if ("reloaded" in cache) {
        rawCompute(parameters);
    }
    return cache.raw;
}
