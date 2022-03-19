import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as inputs from "./_inputs.js";
import { mito } from "./mito.js";

var cache = {};
var parameters = {};

export var changed = false;

/***************************
 ******** Compute **********
 ***************************/

function computeMetrics(use_mito_default, mito_prefix) {
    var mat = inputs.fetchCountMatrix();

    // TODO: add more choices.
    var nsubsets = 1;
    var subsets = utils.allocateCachedArray(mat.numberOfRows() * nsubsets, "Uint8Array", cache, "metrics_buffer");
    subsets.fill(0);

    // Finding the prefix.
    // TODO: use the guessed features to narrow the Ensembl/symbol search.
    var gene_info = inputs.fetchGenes();
    var sub_arr = subsets.array();
    for (const [key, val] of Object.entries(gene_info)) {
        if (use_mito_default) {
            val.forEach((x, i) => {
                if (mito.symbol.has(x) || mito.ensembl.has(x)) {
                    sub_arr[i] = 1;
                }
            });
        } else {
            var lower_mito = mito_prefix.toLowerCase();
            val.forEach((x, i) => {
                if(x.toLowerCase().startsWith(lower_mito)) {
                    sub_arr[i] = 1;
                }
            });
        }
    }

    utils.freeCache(cache.metrics);
    cache.metrics = scran.computePerCellQCMetrics(mat, subsets);
    return;
}

function computeFilters(nmads) {
    utils.freeCache(cache.filters);
    cache.filters = scran.computePerCellQCFilters(cache.metrics, { numberOfMADs: nmads });
    return;
}

function applyFilters() {
    var mat = inputs.fetchCountMatrix();
    var disc = fetchDiscards();
    utils.freeCache(cache.matrix);
    cache.matrix = scran.filterCells(mat, disc);
    return;
}

export function compute(use_mito_default, mito_prefix, nmads) {
    let run_metrics = (inputs.changed || use_mito_default !== parameters.use_mito_default || mito_prefix !== parameters.mito_prefix);
    let run_filters = (run_metrics || nmads !== parameters.nmads);
    let run_apply = (run_filters);

    // Checking whether each step needs content from the preceding steps.
    // This is necessary when working with reloaded states and we want to rerun
    // some later steps but still need to generate their prerequisites.
    if (cache.filters instanceof QCFiltersMimic) {
        if (run_apply) {
            run_filters = true;
        }
    }
    if (cache.metrics instanceof QCMetricsMimic) {
        if (run_apply || run_filters) {
            run_metrics = true;
        }
    }

    // Running the steps.
    if (run_metrics) {
        computeMetrics(use_mito_default, mito_prefix);
        parameters.use_mito_default = use_mito_default;
        parameters.mito_prefix = mito_prefix;
    }

    if (run_filters) {
        computeFilters(nmads);
        parameters.nmads = nmads;
    }

    if (run_apply) {
        applyFilters();
        changed = true;
    }

    return;
}

/***************************
 ******** Results **********
 ***************************/

function getData(copy = true) {
    copy = utils.copyOrView(copy);
    return {
        sums: cache.metrics.sums({ copy: copy }),
        detected: cache.metrics.detected({ copy: copy }),
        proportion: cache.metrics.subsetProportions(0, { copy: copy })
    };
}

function getThresholds(copy = true) {
    copy = utils.copyOrView(copy);
    return {
        sums: cache.filters.thresholdsSums({ copy: copy }),
        detected: cache.filters.thresholdsDetected({ copy: copy }),
        proportion: cache.filters.thresholdsSubsetProportions(0, { copy: copy })
    }
}

export function results() {
    var data = getData();
    var thresholds = getThresholds();

    var ranges = {};
    for (const k of Object.keys(data)) {
        var max = -Infinity, min = Infinity;
        data[k].forEach(function (x) {
            if (max < x) {
                max = x;
            }
            if (min > x) {
                min = x;
            }
        });
        ranges[k] = [min, max];
    }

    let remaining = 0;
    if ("matrix" in cache) {
        remaining = cache.matrix.numberOfColumns();
    } else {
        fetchDiscards().array().forEach(x => {
            if (x == 0) {
                remaining++;
            }
        });
    }

    return { 
        "data": data, 
        "ranges": ranges,
        "thresholds": thresholds,
        "retained": remaining
    };
}

/**********************************
 ******** Saving/loading **********
 **********************************/

export function serialize(handle) {
    let ghandle = handle.createGroup("quality_control");

    {
        let phandle = ghandle.createGroup("parameters"); 
        phandle.writeDataSet("use_mito_default", "Uint8", [], Number(parameters.use_mito_default));
        phandle.writeDataSet("mito_prefix", "String", [], parameters.mito_prefix);
        phandle.writeDataSet("nmads", "Float64", [], parameters.nmads);
    }

    {
        let rhandle = ghandle.createGroup("results"); 

        {
            let mhandle = rhandle.createGroup("metrics");
            let data = getData(false);
            mhandle.writeDataSet("sums", "Float64", null, data.sums)
            mhandle.writeDataSet("detected", "Int32", null, data.detected);
            mhandle.writeDataSet("proportion", "Float64", null, data.proportion);
        }

        {
            let thandle = rhandle.createGroup("thresholds");
            let thresholds = getThresholds(false);
            for (const x of [ "sums", "detected", "proportion" ]) {
                let current = thresholds[x];
                thandle.writeDataSet(x, "Float64", null, current);
            }
        }

        let disc = fetchDiscards();
        rhandle.writeDataSet("discards", "Uint8", null, disc);
    }
}

class QCMetricsMimic {
    constructor(sums, detected, proportion) {
        this.sums_ = sums;
        this.detected_ = detected;
        this.proportion_ = proportion;
    }

    sums({ copy }) {
        return utils.mimicGetter(this.sums_, copy);
    }

    detected({ copy }) {
        return utils.mimicGetter(this.detected_, copy);
    }

    subsetProportions(index, { copy }) {
        if (index != 0) {
            throw "only 'index = 0' is supported for mimics";
        }
        return utils.mimicGetter(this.proportion_, copy);
    }

    free() {}
}

class QCFiltersMimic {
    constructor(sums, detected, proportion, discards) {
        this.sums_ = sums;
        this.detected_ = detected;
        this.proportion_ = proportion;
        this.discards = scran.createUint8WasmArray(discards.length);
        this.discards.set(discards);
    }

    thresholdsSums({ copy }) {
        return utils.mimicGetter(this.sums_, copy);
    }

    thresholdsDetected({ copy }) {
        return utils.mimicGetter(this.detected_, copy);
    }

    thresholdsSubsetProportions(index, { copy }) {
        if (index != 0) {
            throw "only 'index = 0' is supported for mimics";
        }
        return utils.mimicGetter(this.proportion_, copy);
    }

    discardOverall({ copy }) {
        return utils.mimicGetter(this.discards, copy);
    }

    free() {
        this.discards.free();
    }
}

export function unserialize(handle) {
    let ghandle = handle.open("quality_control");

    {
        let phandle = ghandle.open("parameters"); 
        parameters = {
            use_mito_default: phandle.open("use_mito_default", { load: true }).values[0] > 0,
            mito_prefix: phandle.open("mito_prefix", { load: true }).values[0],
            nmads: phandle.open("nmads", { load: true }).values[0]
        }
    }

    {
        let rhandle = ghandle.open("results");

        let mhandle = rhandle.open("metrics");
        cache.metrics = new QCMetricsMimic(
            mhandle.open("sums", { load: true }).values,
            mhandle.open("detected", { load: true }).values,
            mhandle.open("proportion", { load: true }).values
        );

        let thandle = rhandle.open("thresholds");
        let thresholds_sums = thandle.open("sums", { load: true }).values;
        let thresholds_detected = thandle.open("detected", { load: true }).values;
        let thresholds_proportion = thandle.open("proportion", { load: true }).values;

        let discards = rhandle.open("discards", { load: true }).values; 
        cache.filters = new QCFiltersMimic(
            thresholds_sums, 
            thresholds_detected,
            thresholds_proportion,
            discards
        );
    }

    return { ...parameters };
}

/***************************
 ******** Getters **********
 ***************************/

export function fetchSums({ unsafe = false } = {}) {
    // Unsafe, because we're returning a raw view into the Wasm heap,
    // which might be invalidated upon further allocations.
    return cache.metrics.sums({ copy: !unsafe });
}

export function fetchDiscards() {
    return cache.filters.discardOverall({ copy: "view" });
}

export function fetchFilteredMatrix() {
    if (!("matrix" in cache)) {
        applyFilters();
    }
    return cache.matrix;
}
