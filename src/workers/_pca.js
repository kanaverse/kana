import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
import * as variance from "./_model_gene_var.js";
import * as wa from "wasmarrays.js";

var cache = {};
var parameters = {};

export var changed = false;

function fetchPCsAsWasmArray() {
    if ("reloaded" in cache) {
        return cache.reloaded.pcs;
    } else {
        return cache.raw.principalComponents({ copy: "view" });
    }
}

export function compute(args) {
    if (!normalization.changed && !variance.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        // Choosing the highly variable genes.
        var sorted_resids = variance.fetchSortedResiduals();
        var threshold_at = sorted_resids[sorted_resids.length - args.num_hvgs];

        var mat = normalization.fetchNormalizedMatrix();
        var sub = utils.allocateCachedArray(mat.numberOfRows(), "Uint8Array", cache);
        var unsorted_resids = variance.fetchResiduals({ unsafe: true });
        sub.array().forEach((element, index, array) => {
            array[index] = unsorted_resids[index] >= threshold_at;
        });

        // Actually performing the PCA.
        utils.freeCache(cache.raw);
        cache.raw = scran.runPCA(mat, { features: sub, numberOfPCs: args.num_pcs });

        utils.freeReloaded(cache);
        changed = true;
        parameters = args;
    }
    return;
}

export function results() {
    var var_exp;

    if ("reloaded" in cache) {
        var_exp = cache.reloaded.var_exp.slice();
    } else {
        var pca_output = cache.raw;
        var_exp = pca_output.varianceExplained();
        var total_var = pca_output.totalVariance();
        var_exp.forEach((x, i) => {
            var_exp[i] = x/total_var;
        });
    }

    return { "var_exp": var_exp };
}

export function serialize() {
    var to_save = results();
    to_save.pcs = fetchPCsAsWasmArray().slice();
    return {
      "parameters": parameters,
      "contents": to_save
    };
}
 
export function unserialize(saved) {
    parameters = saved.parameters;

    utils.freeReloaded(cache);
    cache.reloaded = saved.contents;

    var tmp = scran.createFloat64WasmArray(cache.reloaded.pcs.length);
    tmp.set(cache.reloaded.pcs);
    cache.reloaded.pcs = tmp;
    return;
}

export function fetchPCs() {
    var pcs = fetchPCsAsWasmArray();
    return {
        "pcs": pcs,
        "num_pcs": parameters.num_pcs,
        "num_obs": pcs.length / parameters.num_pcs
    };
}
