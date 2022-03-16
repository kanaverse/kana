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

function computeMetrics(use_mito_default, mito_prefix) {
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

    var mat = inputs.fetchCountMatrix();
    cache.metrics = scran.computePerCellQCMetrics(mat, subsets);
    return;
}

function computeFilters(nmads) {
    // Need to check this in case we're operating from a reloaded analysis,
    // where there is no guarantee that we reran the computeMetrics() step in compue().
    if (!("metrics" in cache)) { 
        computeMetrics(parameters.use_mito_default, parameters.mito_prefix);
    }
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
    changed = false;

    if (inputs.changed || use_mito_default !== parameters.use_mito_default || mito_prefix !== parameters.mito_prefix) {
        computeMetrics(use_mito_default, mito_prefix);
        parameters.use_mito_default = use_mito_default;
        parameters.mito_prefix = mito_prefix;
        changed = true;
    }

    if (changed || nmads !== parameters.nmads) {
        computeFilters(nmads);
        parameters.nmads = nmads;
        changed = true;
    }

    if (changed) {
        applyFilters();
        changed = true;
    }

    if (changed) {
        // Freeing some memory.
        if (reloaded !== null) {
            utils.freeCache(reloaded.discards_buffer);
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
    if (!("metrics" in cache)) {
        data.sums = reloaded.metrics.sums;
        data.detected = reloaded.metrics.detected;
        data.proportion = reloaded.metrics.proportion;
        utils.copyVectors(data, copy);
    } else {
        copy = utils.copyOrView(copy);
        data.sums = cache.metrics.sums({ copy: copy });
        data.detected = cache.metrics.detected({ copy: copy });
        data.proportion = cache.metrics.subsetProportions(0, { copy: copy });
    }
    return data;
}

function getThresholds(copy = true) {
    var thresholds = {};
    if (!("filters" in cache)) {
        thresholds.sums = reloaded.thresholds.sums;
        thresholds.detected = reloaded.thresholds.detected;
        thresholds.proportion = reloaded.thresholds.proportion;
        utils.copyVectors(thresholds, copy);
    } else {
        copy = utils.copyOrView(copy);
        thresholds.sums = cache.filters.thresholdsSums({ copy: copy });
        thresholds.detected = cache.filters.thresholdsDetected({ copy: copy });
        thresholds.proportion = cache.filters.thresholdsSubsetProportions(0, { copy: copy });
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

    var mat = fetchFilteredMatrix();

    return { 
        "data": data, 
        "ranges": ranges,
        "thresholds": thresholds,
        "dims": [mat.numberOfRows(), mat.numberOfColumns()]
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
            let thandle = rhandle.createGroup("thresholds");
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
    let ghandle = fhandle.open("quality_control");

    {
        let phandle = ghandle.open("parameters"); 
        parameters = {
            use_mito_default: phandle.open("mito_prefix", { load: true }).values[0] > 0,
            mito_prefix: phandle.open("mito_prefix", { load: true }).values[0],
            nmads: phandle.open("nmads", { load: true }).values[0]
        }
    }

    {
        reloaded = {};
        let rhandle = ghandle.open("results");

        let metrics = {};
        let mhandle = rhandle.open("metrics");
        metrics.sums = mhandle.open("sums", { load: true }).values;
        metrics.detected = mhandle.open("detected", { load: true }).values;
        metrics.proportion = mhandle.open("proportion", { load: true }).values;
        reloaded.metrics = metrics;

        let thresholds = {};
        let thandle = rhandle.open("thresholds");
        thresholds.sums = thandle.open("sums", { load: true }).values;
        thresholds.detected = thandle.open("detected", { load: true }).values;
        thresholds.proportion = thandle.open("proportion", { load: true }).values;
        reloaded.thresholds = thresholds;

        let discards = rhandle.open("discards", { load: true }).values; 
        utils.allocateCachedArray(discards.length, "Uint8Array", reloaded, "discards");
        reloaded.discards.set(discards);
    }

    return { ...parameters };
}

/***************************
 ******** Getters **********
 ***************************/

export function fetchSums({ unsafe = false } = {}) {
    if (!("metrics" in cache)) {
        return reloaded.sums;
    } else {
        // Unsafe, because we're returning a raw view into the Wasm heap,
        // which might be invalidated upon further allocations.
        return cache.metrics.sums({ copy: !unsafe });
    }
}

export function fetchDiscards() {
    if (!("filters" in cache)) {
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
