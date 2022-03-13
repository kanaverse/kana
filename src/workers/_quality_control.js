import * as scran from "scran.js"; 
import * as utils from "./_utils.js";
import * as inputs from "./_inputs.js";
import { mito } from "./mito.js";

var cache = {};
var parameters = {};
var reloaded = null;

export var changed = false;

/***************************
 ******** Compute **********
 ***************************/

function computeMetrics() {
    utils.freeCache(cache.metrics);
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
        if (parameters.use_mito_default) {
            val.forEach((x, i) => {
                if (mito.symbol.has(x) || mito.ensembl.has(x)) {
                    sub_arr[i] = 1;
                }
            });
        } else {
            var lower_mito = parameters.mito_prefix.toLowerCase();
            val.forEach((x, i) => {
                if(x.toLowerCase().startsWith(lower_mito)) {
                    sub_arr[i] = 1;
                }
            });
        }
    }

    var mat = inputs.fetchCountMatrix();
    cache.raw = scran.computePerCellQCMetrics(mat, subsets);
    return;
}

function computeFilters() {
    // Need to check this in case we're operating from a reloaded analysis,
    // where there is no guarantee that we reran the computeMetrics() step in compue().
    if (!("metrics" in cache)) { 
        computeMetrics();
    }

    var stats = cache.metrics;
    utils.freeCache(cache.filters);
    cache.filters = scran.computePerCellQCFilters(stats, { numberOfMADs: parameters.nmads });
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
    changed = false;
    if (!inputs.changed) {
        changed = true;
    }

    if (changed || use_mito_default !== parameters.use_mito_default || mito_prefix !== parameters.mito_prefix) {
        parameters.use_mito_default = use_mito_default;
        parameters.mito_prefix = mito_prefix;
        computeMetrics();
        changed = true;
    }

    if (changed || nmads !== parameters.nmads) {
        parameters.nmads = nmads;
        computeFilters();
        changed = true;
    }

    if (changed) {
        applyFilters();
        changed = true;
    }

    if (changed) {
        if (reloaded !== null) {
            utils.free(reloaded.discards_buffer);
            reloaded = null;
        }
    }
    return;
}

/***************************
 ******** Results **********
 ***************************/

function getData(copy = true) {
    var data = {};
    if (reloaded !== null) {
        data.sums = reloaded.metrics.sums;
        data.detected = reloaded.metrics.detected;
        data.proportion = reloaded.metrics.proportion;
        utils.copyVectors(data, copy);
    } else {
        copy = utils.copyOrView(copy);
        var qc_output = cache.metrics;
        data.sums = qc_output.sums({ copy: copy });
        data.detected = qc_output.detected({ copy: copy });
        data.proportion = qc_output.subsetProportions(0, { copy: copy });
    }
    return data;
}

function getThresholds(copy = true) {
    var thresholds = {};
    if (reloaded !== null) {
        thresholds.sums = reloaded.thresholds.sums.slice();
        thresholds.detected = reloaded.thresholds.detected.slice();
        thresholds.proportion = reloaded.thresholds.proportion.slice();
        utils.copyVectors(thresholds, copy);
    } else {
        copy = utils.copyOrView(copy);
        var qc_thresholds = cache.filters;
        thresholds.sums = obj.thresholdsSums({ copy: copy });
        thresholds.detected = obj.thresholdsDetected({ copy: copy });
        thresholds.proportion = obj.thresholdsSubsetProportions(0, { copy: copy });
    }
    return thresholds;
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

    return { 
        "data": data, 
        "ranges": ranges,
        "thresholds": thresholds
    };
}

/**********************************
 ******** Saving/loading **********
 **********************************/

export function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("quality_control");

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
            mhandle.writeDataSet("sums", "Float64", [data.sums.length], data.sums)
            mhandle.writeDataSet("detected", "Int32", [data.detected.length], data.detected);
            mhandle.writeDataSet("proportion", "Float64", [data.proportion.length], data.proportion);
        }

        {
            let thandle = chandle.createGroup("thresholds");
            let thresholds = getThresholds(false);
            for (const x of [ "sums", "detected", "proportion" ]) {
                let current = thresholds[x];
                thandle.writeDataSet(x, "Float64", [current.length], current);
            }
        }

        let disc = fetchDiscards();
        rhandle.writeDataSet("discards", "Uint8", [disc.length], disc);
    }
}

export function unserialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("quality_control");

    {
        let phandle = ghandle.openGroup("parameters"); 
        parameters = {
            use_mito_default: phandle.openDataSet("mito_prefix", { load: true }).values[0] > 0,
            mito_prefix: phandle.openDataSet("mito_prefix", { load: true }).values[0],
            nmads: phandle.openDataSet("nmads", { load: true }).values[0]
        }
    }

    {
        reloaded = {};

        let metrics = {};
        let mhandle = rhandle.openGroup("metrics");
        metrics.sums = mhandle.openDataSet("sums", { load: true }).values;
        metrics.detected = mhandle.openDataSet("detected", { load: true }).values;
        metrics.proportion = mhandle.openDataSet("proportion", { load: true }).values;
        reloaded.metrics = metrics;

        let thresholds = {};
        let thandle = rhandle.openGroup("thresholds");
        thresholds.sums = thandle.openDataSet("sums", { load: true }).values;
        thresholds.detected = thandle.openDataSet("detected", { load: true }).values;
        thresholds.proportion = thandle.openDataSet("proportion", { load: true }).values;
        reloaded.thresholds = thresholds;

        let discards = rhandle.openDataSet("discards", { load: true }).values; 
        reloaded.discards = utils.allocateCachedArray(discards.length, "Uint8Array", cache, "discards_buffer");
        reloaded.discards.set(discards);
    }
    return;
}

/***************************
 ******** Getters **********
 ***************************/

export function fetchSums({ unsafe = false } = {}) {
    if (reloaded !== null) {
        return reloaded.sums;
    } else {
        // Unsafe, because we're returning a raw view into the Wasm heap,
        // which might be invalidated upon further allocations.
        return cache.metrics.sums({ copy: !unsafe });
    }
}

export function fetchDiscards() {
    if (reloaded !== null) {
        return reloaded.discards;
    } else {
        return cache.filters.discardOverall({ copy: "view" });
    }
}

export function fetchFilteredMatrix() {
    if (!("matrix" in cache)) {
        applyFilters();
    }
    return cache.matrix;
}
