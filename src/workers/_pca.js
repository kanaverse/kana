import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
import * as variance from "./model_gene_var.js";

var cache = {};
var parameters = {};

export var changed = false;

function fetchPCsAsWasmArray(wasm) {
    if ("reloaded" in cache) {
        return cache.reloaded.pcs;
    } else {
        let tmp = cache.raw.pcs({ copy: false });
        return new scran.Float64WasmArray(tmp.length, tmp.byteOffset);
    }
}

export function compute(args) {
    if (!normalization.changed && !variance.changed && !utils.changedParameters(parameters, args)) {
        x.changed = false;
    } else {
        // Choosing the highly variable genes.
        var sorted_resids = variance.fetchSortedResiduals();
        var threshold_at = sorted_resids[sorted_resids.length - args.num_hvgs];

        var mat = normalization.fetchNormalizedMatrix();
        var sub = utils.allocateCachedArray(mat.numberOfRows(), "Uint8Array", cache);
        var unsorted_resids = scran_model_gene_var.fetchResiduals({ unsafe: true });
        sub.array().forEach((element, index, array) => {
            array[index] = unsorted_resids[index] >= threshold_at;
        });

        // Actually performing the PCA.
        scran_utils.freeCache(cache.raw);
        cache.raw = scran.runPCA(mat, { features: sub, numberOfPCs: args.num_pcs });

        utils.freeReloaded(cache);
        changed = true;
        parameters = args;
    }
    return;
}

export function results(wasm) {
    var var_exp;

    if ("reloaded" in cache) {
        var_exp = cache.reloaded.var_exp.slice();
    } else {
        var pca_output = cache.raw;
        var_exp = pca_output.variance_explained();
        var total_var = pca_output.total_variance();
        var_exp.forEach((x, i) => {
            var_exp[i] = x/total_var;
        });
    }

    return { "var_exp": var_exp };
}

export function serialize() {
    var to_save = x.results();
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

    var tmp = new scran.Float64WasmArray(cache.reloaded.pcs.length);
    tmp.set(cache.reloaded.pcs);
    cache.reloaded.pcs = tmp;
    return;
}

export function fetchPCs() {
    return {
        "pcs": fetchPCsAsWasmArray(),
        "num_pcs": parameters.num_pcs,
        "num_obs": pcs.length / parameters.num_pcs
    };
}
