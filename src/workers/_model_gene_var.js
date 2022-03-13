import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as normalization from "./_normalization.js";
  
var cache = {};
var parameters = {};
var reloaded = null;

export var changed = false;

export function compute(span) {
    changed = false;
    
    if (normalization.changed || span != parameters.span) {
        let mat = normalization.fetchNormalizedMatrix();
        cache.results = scran.modelGeneVar(mat, { span: args.span });

        cache.sorted_residuals = cache.results.residuals().slice(); // a separate copy.
        cache.sorted_residuals.sort();

        parameters.span = span;
        changed = true;
    }

    if (changed) {
        // Freeing some memory.
        reloaded = null;
    }

    return;
}

function chooseResults(copy = true) {
    if (!("results" in cache)) {
        var output = {
            means: reloaded.means,
            vars: reloaded.vars,
            fitted: reloaded.fitted,
            resids: reloaded.resids
        };
        return utils.copyVectors(output, copy);
    } else {
        copy = utils.copyOrView(copy);
        return {
            "means": cache.results.means({ copy: copy }),
            "vars": cache.results.variances({ copy: copy }),
            "fitted": cache.results.fitted({ copy: copy }),
            "resids": cache.results.residuals({copy: copy })
        };
    }
}

export function results() {
    return chooseResults();
}

export function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("feature_selection");

    {
        let phandle = ghandle.createGroup("parameters"); 
        phandle.writeDataSet("span", "Float64", [], parameters.span);
    }

    {
        let res = chooseResults(false);
        let rhandle = ghandle.createGroup("results"); 
        for (const x of [ "means", "vars", "fitted", "resids" ]) {
            let y = res[x];
            rhandle.writeDataSet(x, "Float64", [y.length], y);
        }
    }
}

export function unserialize(path, permutator) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.openGroup("feature_selection");

    {
        let phandle = ghandle.openGroup("parameters");
        parameters = {
            span: phandle.openDataSet("span", { load: true }).values[0]
        };
    }

    {
        let rhandle = ghandle.openGroup("results");
        reloaded = {
            means: rhandle.openDataSet("means", { load: true }).values,
            vars: rhandle.openDataSet("vars", { load: true }).values,
            fitted: rhandle.openDataSet("fitted", { load: true }).values,
            resids: rhandle.openDataSet("resids", { load: true }).values
        };

        // Possibly permuting it to match the new permutation order;
        // see 'unserialize' in './_inputs.js'.
        for (const [key, value] of Object.entries(reloaded)) {
            permuter(value);
        }
    }

    cache.sorted_residuals = reloaded.resids.slice();
    cache.sorted_residuals.sort();
    return;
}

export function fetchSortedResiduals() {
    return cache.sorted_residuals;
}

export function fetchResiduals({ unsafe = false } = {}) {
    if (!("results" in cache)) {
        return reloaded.resids;
    } else {
        return cache.results.residuals({ copy: !unsafe });
    }
}
