import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
  
var cache = {};
var parameters = {};

export var changed = false;

function spawnStats() {
    var model_output = cache.raw;
    return {
        "means": model_output.means(),
        "vars": model_output.variances(),
        "fitted": model_output.fitted(),
        "resids": model_output.residuals()
    };
}

export function compute(args) {
    if (!normalization.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
    } else {
        var mat = normalization.fetchNormalizedMatrix();
        cache.raw = scran.modelGeneVar(mat, { span: args.span });

        cache.sorted_residuals = cache.raw.residuals().slice(); // a separate copy.
        cache.sorted_residuals.sort();

        parameters = args;
        delete cache.reloaded;
        changed = true;
    }
    return;
}

export function results() {
    if ("reloaded" in cache) {
        return {
            "means": cache.reloaded.means.slice(),
            "vars": cache.reloaded.vars.slice(),
            "fitted": cache.reloaded.fitted.slice(),
            "resids": cache.reloaded.resids.slice()
        };
    } else {
        return spawnStats();
    }
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
    cache.sorted_residuals = cache.reloaded.resids.slice();
    cache.sorted_residuals.sort();
    return;
}

export function fetchSortedResiduals() {
    return cache.sorted_residuals;
}

export function fetchResiduals({ unsafe = false } = {}) {
    if ("reloaded" in cache) {
        return cache.reloaded.resids;
    } else {
        return cache.raw.residuals({ copy: !unsafe });
    }
}
