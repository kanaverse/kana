import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
  
var cache = {};
var parameters = {};

export var changed = false;

export function compute(span) {
    changed = false;
    
    if (normalization.changed || span != parameters.span) {
        utils.freeCache(cache.results);

        let mat = normalization.fetchNormalizedMatrix();
        cache.results = scran.modelGeneVar(mat, { span: span });

        cache.sorted_residuals = cache.results.residuals().slice(); // a separate copy.
        cache.sorted_residuals.sort();

        parameters.span = span;
        changed = true;
    }

    return;
}

function getResults(copy = true) {
    copy = utils.copyOrView(copy);
    return {
        "means": cache.results.means({ copy: copy }),
        "vars": cache.results.variances({ copy: copy }),
        "fitted": cache.results.fitted({ copy: copy }),
        "resids": cache.results.residuals({copy: copy })
    };
}

export function results() {
    return getResults();
}

export function serialize(handle) {
    let ghandle = handle.createGroup("feature_selection");

    {
        let phandle = ghandle.createGroup("parameters"); 
        phandle.writeDataSet("span", "Float64", [], parameters.span);
    }

    {
        let res = getResults(false);
        let rhandle = ghandle.createGroup("results"); 
        for (const x of [ "means", "vars", "fitted", "resids" ]) {
            rhandle.writeDataSet(x, "Float64", null, res[x]);
        }
    }
}

class ModelGeneVarMimic {
    constructor(means, vars, fitted, resids) {
        this.means_ = means;
        this.vars_ = vars;
        this.fitted_ = fitted;
        this.resids_ = resids;
    }

    means({copy}) {
        return utils.mimicGetter(this.means_, copy);
    }

    variances({copy}) {
        return utils.mimicGetter(this.vars_, copy);
    }

    fitted({copy}) {
        return utils.mimicGetter(this.fitted_, copy);
    }

    residuals({copy}) {
        return utils.mimicGetter(this.resids_, copy);
    }

    free() {}
}

export function unserialize(handle, permuter) {
    let ghandle = handle.open("feature_selection");

    {
        let phandle = ghandle.open("parameters");
        parameters = {
            span: phandle.open("span", { load: true }).values[0]
        };
    }

    {
        let rhandle = ghandle.open("results");
        let reloaded = {};

        // Possibly permuting it to match the new permutation order;
        // see 'unserialize' in './_inputs.js'.
        for (const key of [ "means", "vars", "fitted", "resids" ]) {
            let value = rhandle.open(key, { load: true }).values;
            permuter(value);
            reloaded[key] = value;
        }

        cache.results = new ModelGeneVarMimic(reloaded.means, reloaded.vars, reloaded.fitted, reloaded.resids);
    }

    cache.sorted_residuals = cache.results.residuals({ copy: true });
    cache.sorted_residuals.sort();

    return { ...parameters };
}

export function fetchSortedResiduals() {
    return cache.sorted_residuals;
}

export function fetchResiduals({ unsafe = false } = {}) {
    return cache.results.residuals({ copy: !unsafe });
}
