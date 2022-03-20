import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
import * as variance from "./_model_gene_var.js";
import * as wa from "wasmarrays.js";

var cache = {};
var parameters = {};

export var changed = false;

function fetchPCsAsWasmArray() {
    return cache.pcs.principalComponents({ copy: "view" });
}

function chooseFeatures(num_hvgs) {
    var sorted_resids = variance.fetchSortedResiduals();
    var threshold_at = sorted_resids[sorted_resids.length - num_hvgs];
    var sub = utils.allocateCachedArray(sorted_resids.length, "Uint8Array", cache, "hvg_buffer");
    var unsorted_resids = variance.fetchResiduals({ unsafe: true });
    sub.array().forEach((element, index, array) => {
        array[index] = unsorted_resids[index] >= threshold_at;
    });
}

export function compute(num_hvgs, num_pcs) {
    changed = false;
    
    if (variance.changed || num_hvgs !== parameters.num_hvgs) {
        chooseFeatures(num_hvgs);
        parameters.num_hvgs = num_hvgs;
        changed = true;
    }

    if (changed || normalization.changed || num_pcs !== parameters.num_pcs) { 
        // Need to check this in case we never ran a chooseFeatures
        // call, e.g., because we're running from a reloaded analysis
        // where the user only changed the number of PCs.
        if (!("hvg_buffer" in cache)) {
            chooseFeatures(parameters.num_hvgs);
        }
        let sub = cache.hvg_buffer;

        var mat = normalization.fetchNormalizedMatrix();
        utils.freeCache(cache.pcs);
        cache.pcs = scran.runPCA(mat, { features: sub, numberOfPCs: num_pcs });

        parameters.num_pcs = num_pcs;
        changed = true;
    }

    return;
}

export function results() {
    var pca_output = cache.pcs;
    var var_exp = pca_output.varianceExplained();
    var total_var = pca_output.totalVariance();
    var_exp.forEach((x, i) => {
        var_exp[i] = x/total_var;
    });
    return { "var_exp": var_exp };
}

export function serialize(handle) {
    let ghandle = handle.createGroup("pca");

    {
        let phandle = ghandle.createGroup("parameters"); 
        phandle.writeDataSet("num_hvgs", "Int32", [], parameters.num_hvgs);
        phandle.writeDataSet("num_pcs", "Int32", [], parameters.num_pcs);
    }

    {
        let rhandle = ghandle.createGroup("results");

        let ve = results().var_exp;
        rhandle.writeDataSet("var_exp", "Float64", null, ve);

        let pcs = fetchPCs();
        rhandle.writeDataSet("pcs", "Float64", [pcs.num_obs, pcs.num_pcs], pcs.pcs); // remember, it's transposed.
    }
}

class PCAMimic { 
    constructor(pcs, var_exp) {
        this.var_exp = var_exp;
        this.pcs = scran.createFloat64WasmArray(pcs.length);
        this.pcs.set(pcs);
    }

    principalComponents({ copy }) {
        return utils.mimicGetter(this.pcs, copy);
    }

    varianceExplained({ copy = true } = {}) {
        return utils.mimicGetter(this.var_exp, copy);
    }

    totalVariance () {
        return 1;
    }

    free() {
        this.pcs.free();
    }
}

export function unserialize(handle) {
    let ghandle = handle.open("pca");

    {
        let phandle = ghandle.open("parameters"); 
        parameters = { 
            num_hvgs: phandle.open("num_hvgs", { load: true }).values[0],
            num_pcs: phandle.open("num_pcs", { load: true }).values[0]
        };
    }

    {
        let rhandle = ghandle.open("results");
        let var_exp = rhandle.open("var_exp", { load: true }).values;
        let pcs = rhandle.open("pcs", { load: true }).values
        cache.pcs = new PCAMimic(pcs, var_exp);
    }

    return { ...parameters };
}

export function fetchPCs() {
    var pcs = fetchPCsAsWasmArray();
    return {
        "pcs": pcs,
        "num_pcs": parameters.num_pcs,
        "num_obs": pcs.length / parameters.num_pcs
    };
}
