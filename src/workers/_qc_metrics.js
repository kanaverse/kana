import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as inputs from "./_qc_inputs.js";
import { mito } from "./mito.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute(args) {
    utils.freeCache(cache.raw);
    var mat = inputs.fetchCountMatrix();

    // TODO: add more choices.
    var nsubsets = 1;
    var subsets = utils.allocateCachedBuffer(mat.numberOfRows() * nsubsets, "Uint8Array", cache);
    subsets.fill(0);

    var gene_info = inputs.fetchGenes();
    var sub_arr = subsets.array();
    for (const [key, val] of Object.entries(gene_info)) {
        if (args.use_mito_default) {
            val.forEach((x, i) => {
                if (mito.symbol.has(x) || mito.ensembl.has(x)) {
                    sub_arr[i] = 1;
                }
            });
        } else {
            var lower_mito = args.mito_prefix.toLowerCase();
            val.forEach((x, i) => {
                if(x.toLowerCase().startsWith(lower_mito)) {
                    sub_arr[i] = 1;
                }
            });
        }
    }

    scran.computePerCellQCMetrics(mat, subsets);
    delete cache.reloaded;
    return;
}

function fetchResults() {
    var data = {};
    if ("reloaded" in cache) {
        var qc_output = cache.reloaded;
        data.sums = qc_output.sums.slice();
        data.detected = qc_output.detected.slice();
        data.proportion = qc_output.proportion.slice();
    } else {
        var qc_output = cache.raw;
        data.sums = qc_output.sums();
        data.detected = qc_output.detected();
        data.proportion = qc_output.subset_proportions(0);
    }
    return data;
}

export function compute(args) {
    if (!inputs.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        rawCompute(args);
        parameters = args;
        changed = true;
    }
    return;
}

export function results() {
    var data = fetchResults();

    var ranges = {};
    ranges.sums = utils.computeRange(data.sums);
    ranges.detected = utils.computeRange(data.detected);
    ranges.proportion = utils.computeRange(data.proportion);

    return { 
        "data": data, 
        "ranges": ranges 
    };
}

export function serialize() {
    return {
      "parameters": parameters,
      "contents": fetchResults()
    };
}

export function unserialize(saved) {
    /* TODO: reconstutite a fully-formed QCMetrics object so that
     * fetchQCMetrics() doesn't have to recompute it.
     */
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
}

export function fetchQCMetrics() {
    if ("reloaded" in cache) {
        rawCompute();
    }
    return cache.raw;
}

export function fetchSums({ unsafe: true }) {
    if ("reloaded" in cache) {
        return cache.reloaded.sums;
    } else {
        // Unsafe, because we're returning a raw view into the Wasm heap,
        // which might be invalidated upon further allocations.
        return cache.raw.sums({ copy: !unsafe });
    }
}
