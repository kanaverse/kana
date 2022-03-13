import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as qc from "./_quality_control.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute() {
    var mat = filter.fetchFilteredMatrix();
    var buffer = utils.allocateCachedArray(mat.numberOfColumns(), "Float64Array", cache);

    // Better not have any more allocations in between now and filling of size_factors!
    var sums = metrics.fetchSums({ unsafe: true });
    var discards = thresholds.fetchDiscards().array();

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
    return;
}

export function compute() {
    changed = false;
    if (quality_control.changed) {
        changed = true;
    } 

    if (changed) {
        rawCompute();
    }
    return;
}

export function results() {
    return {};
}

export function serialize(path) {
    // Token effort.
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("normalization");
    ghandle.openGroup("parameters"); 
    ghandle.openGroup("results"); 
}

export function unserialize(path) {
    // Nothing to do here.
    return;
}

export function fetchNormalizedMatrix() {
    if (!("matrix" in cache)) {
        rawCompute();
    }
    return cache.matrix;
}

export function fetchExpression(index) {
    var mat = fetchNormalizedMatrix();
    var buffer = utils.allocateCachedArray(mat.numberOfColumns(), "Float64Array", cache); // re-using the buffer.
    mat.row(index, { buffer: buffer });
    return buffer.slice();
}
