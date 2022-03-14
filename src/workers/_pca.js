import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
import * as variance from "./_model_gene_var.js";
import * as wa from "wasmarrays.js";

var cache = {};
var parameters = {};

export var changed = false;

function fetchPCsAsWasmArray() {
    if (!("pcs" in cache)) {
        return cache.reloaded.pcs;
    } else {
        return cache.pcs.principalComponents({ copy: "view" });
    }
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
        cache.pcs = scran.runPCA(mat, { features: sub, numberOfPCs: args.num_pcs });

        parameters.num_pcs = num_pcs;
        changed = true;
    }

    if (changed) {
        // Free some memory.
        if (reloaded !== null) {
            utils.free(reloaded.pcs);
            reloaded = null;
        }
    }
    return;
}

export function results() {
    var var_exp;

    if (!("pcs" in cache)) {
        var_exp = reloaded.var_exp.slice();
    } else {
        var pca_output = cache.pcs;
        var_exp = pca_output.varianceExplained();
        var total_var = pca_output.totalVariance();
        var_exp.forEach((x, i) => {
            var_exp[i] = x/total_var;
        });
    }

    return { "var_exp": var_exp };
}

export function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("pca");

    {
        let phandle = ghandle.createGroup("parameters"); 
        phandle.writeDataSet("num_hvgs", "Int32", [], parameters.num_hvgs);
        phandle.writeDataSet("num_pcs", "Int32", [], parameters.num_pcs);
    }

    {
        let rhandle = ghandle.createGroup("results");

        let ve = results().var_exp;
        rhandle.writeDataSet("var_exp", "Float64", [ve.length], ve);

        let pcs = fetchPCsAsWasmArray();
        rhandle.writeDataSet("pcs", "Float64", [pcs.length], pcs);
    }
}
 
export function unserialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.openGroup("pca");

    {
        let phandle = ghandle.openGroup("parameters"); 
        parameters = { 
            num_hvgs: phandle.openDataSet("num_hvgs", { load: true }).values[0],
            num_pcs: phandle.openDataSet("num_pcs", { load: true }).values[0]
        };
    }

    {
        let rhandle = ghandle.openGroup("results");
        reloaded = {
            var_exp: rhandle.openDataSet("var_exp", { load: true }).values,
        };

        let pcs = rhandle.openDataSet("pcs", { load: true }).values
        utils.allocateCachedArray(pcs.length, "Uint8Array", reloaded, "pcs");
        reloaded.pcs.set(pcs);        
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
