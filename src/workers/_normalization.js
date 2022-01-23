import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as thresholds from "./_qc_thresholds.js";
import * as filter from "./_qc_filter.js";
import * as metrics from "./_qc_metrics.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute() {
    var mat = filter.fetchFilteredMatrix();
    var buffer = utils.allocateCachedArray(mat.numberOfColumns(), "Float64Array", cache);

    // Better not have any more allocations in between now and filling of size_factors!
    var sums = metrics.fetchSums({ unsafe: true });
    var discards = thresholds.fetchDiscards({ unsafe: true });

    // Reusing the totals computed earlier.
    var size_factors = buffer.array();
    var j = 0;
    for (var i = 0; i < discards.length; ++i) {
        if (!discards[i]) {
            size_factors[j] = sums[i];
            j++;
        }
    }

    if (j != mat.numberOfColumns()) {
        throw "normalization and filtering are not in sync";
    }

    utils.freeCache(cache.matrix);
    cache.matrix = scran.logNormCounts(mat, { sizeFactors: buffer });

    delete cache.reloaded;
    return;
}

export function compute(args) {
    if (!metrics.changed && !filter.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        rawCompute();
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

export function fetchNormalizedMatrix() {
    if ("reloaded" in cache) {
        rawCompute();
    }
    return cache.matrix;
}

export function fetchExpression(index) {
    var buffer = utils.allocateCachedArray(mat.numberOfColumns(), "Float64Array", cache); // re-using the buffer.
    var mat = x.fetchNormalizedMatrix();
    mat.row(index, { buffer: buffer });
    return buffer.slice();
}
