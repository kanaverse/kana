import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as inputs from "./_qc_inputs.js";
import * as thresholds from "./_qc_thresholds.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute(wasm) {
    utils.freeCache(cache.matrix);
    var mat = inputs.fetchCountMatrix();

    var disc = thresholds.fetchDiscardsAsWasmArray();
    cache.matrix = scran.filterCells(mat, disc);

    delete cache.reloaded;
    return;
}

export function compute(args) {
    if (!inputs.changed && !thresholds.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        rawCompute(wasm);
        parameters = args;
        changed = true;
    }
    return;
}
   
export function results() {
    return {
      "retained": fetchRetained()
    };
}

export function serialize() {
    return {
        "parameters": parameters,
        "contents": x.results()
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;

    // Precomputing this for easier retrieval later.
    var discards = thresholds.fetchDiscards({ unsafe: true });
    var retained = 0;
    for (const i of discards) {
        if (i == 0) {
            retained++;
        }
    }
    cache.reloaded.retained = retained;
    return;
}

export function fetchFilteredMatrix() {
    if ("reloaded" in cache) {
        rawCompute();
    }
    return cache.matrix;    
}

export function fetchRetained() {
    if ("reloaded" in cache) {
        return cache.reloaded.retained;
    } else {
        return cache.matrix.numberOfColumns();
    }
}
