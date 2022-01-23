import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as metrics from "./_qc_metrics.js";

var cache = {};
var parameters = {};

export var changed = false;

export function compute(args) {
    if (!metrics.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        utils.freeCache(cache.raw);
        var stats = metrics.fetchQCMetrics();

        cache.raw = scran.computePerCellQCFilters(stats, { numberOfMADs: args.nmads });

        utils.freeReloaded(cache);
        changed = true;
        parameters = args;
    }
    return;
}

export function results() {
    let data;
    if ("reloaded" in cache) {
        data = {
            "sums": cache.reloaded.sums,
            "detected": cache.reloaded.detected,
            "proportion": cache.reloaded.proportion
        };
    } else {
        var obj = cache.raw;
        data = {
            "sums": obj.thresholdsSums()[0],
            "detected": obj.thresholdsDetected()[0],
            "proportion": obj.thresholds_proportions(0)[0] // TODO: generalize...
        };
    }
    return data;
}

export function serialize() {
    var contents = results();
    contents.discards = fetchDiscards();
    return {
        "parameters": parameters,
        "contents": contents
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;

    utils.freeReloaded(cache);
    cache.reloaded = saved.contents;

    var tmp = new scran.Float64WasmArray(cache.reloaded.discards.length);
    tmp.set(cache.reloaded.discards);
    cache.reloaded.discards = tmp;
    
    return;
}

export function fetchDiscardsAsWasmArray() {
    if ("reloaded" in cache) {
        return cache.reloaded.discards;        
    } else {
        var tmp = cache.raw.discard_overall();
        return new scran.Float64WasmArray(tmp.length, tmp.byteOffset);
    }
}

export function fetchDiscards({ unsafe = false } = {}) {
    var out;
    if ("reloaded" in cache) {
        out = cache.reloaded.discards.array();
    } else {
        out = cache.raw.discard_overall();
    }

    if (unsafe) {
        // Unsafe, because we're returning a raw view into the Wasm heap,
        // which might be invalidated upon further allocations.
        return out;
    } else {
        return out.slice();
    }
}
