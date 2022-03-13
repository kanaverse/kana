import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as inputs from "./_inputs.js";
import * as markers from "./_score_markers.js";
import * as downloads from "./DownloadsDBHandler.js";
import * as pako from "pako";

var cache = {};
var parameters = {};

export var changed = false;

var hs_loaded = {};
var mm_loaded = {};
var hs_references = {};
var mm_references = {};

const proxy = "https://cors-proxy.aaron-lun.workers.dev";
const hs_base = "https://github.com/clusterfork/singlepp-references/releases/download/hs-latest";
const mm_base = "https://github.com/clusterfork/singlepp-references/releases/download/mm-latest";

// Try to figure out the best feature identifiers to use,
// based on the highest confidence annotation.
function chooseFeatures() {
    let genes = inputs.fetchGenes();
    let types = inputs.fetchGeneTypes();

    let best_feature = null;
    let best = null;
    for (const [key, val] of Object.entries(types)) {
        if (best === null) {
            best_feature = key;
            best = val;
        } else if (val.confidence > best.confidence) {
            best_feature = key;
            best = val;
        }
    }

    cache.features = genes[best_feature];
    cache.feature_details = best;
    return;
}

// TODO: consolidate this with _inputs.readDSVFromBuffer to eliminate the D3 dependency.
function quickLineReader(buffer, compression = "gz") {
    let txt = buffer;
    if (compression == "gz") {
        txt = pako.ungzip(buffer);
    }

    const dec = new TextDecoder();
    let decoded = dec.decode(txt);

    let lines = decoded.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] == "") { // ignoring the trailing newline.
        lines.pop();
    }

    return lines;    
}

async function getBuiltReference(name, species, rebuild) {
    let base;
    let references;
    let preloaded;
    if (species == "human") {
        base = hs_base;
        preloaded = hs_loaded;
        references = hs_references;
    } else {
        base = mm_base;
        preloaded = mm_loaded;
        references = mm_references;
    }

    downloads.initialize();

    if (!(name in preloaded)) {
        let buffers = await Promise.all([
            downloads.get(proxy + "/" + encodeURIComponent(base + "/" + name + "_genes.csv.gz")),
            downloads.get(proxy + "/" + encodeURIComponent(base + "/" + name + "_labels_fine.csv.gz")),
            downloads.get(proxy + "/" + encodeURIComponent(base + "/" + name + "_label_names_fine.csv.gz")),
            downloads.get(proxy + "/" + encodeURIComponent(base + "/" + name + "_markers_fine.gmt.gz")),
            downloads.get(proxy + "/" + encodeURIComponent(base + "/" + name + "_matrix.csv.gz"))
        ]);

        console.log(buffers);

        let loaded;
        try {
            loaded = scran.loadLabelledReferenceFromBuffers(
                new Uint8Array(buffers[4]), // rank matrix
                new Uint8Array(buffers[3]), // markers
                new Uint8Array(buffers[1])) // label per sample

            let gene_lines = quickLineReader(new Uint8Array(buffers[0])); // gene names
            let ensembl = [];
            let symbol = [];
            gene_lines.forEach(x => {
                let fields = x.split(",");
                ensembl.push(fields[0]);
                symbol.push(fields[1]);
            });

            let labels = quickLineReader(new Uint8Array(buffers[2])); // full label names
            preloaded[name] = { 
                "raw": loaded, 
                "genes": {
                    "ensembl": ensembl,
                    "symbol": symbol
                },
                "labels": labels
            };

        } catch (e) {
            utils.freeCache(loaded);
            throw e;
        }
    }


    if (!(name in references) || rebuild) {
        let built;
        try {
            if (name in references) {
                utils.freeCache(references[name].raw);
            }

            let current = preloaded[name];
            let loaded = current.raw;

            let chosen_ids;
            if (cache.feature_details.type === "ensembl") {
                chosen_ids = current.genes.ensembl;
            } else {
                chosen_ids = current.genes.symbol;
            }

            let built = scran.buildLabelledReference(cache.features, loaded, chosen_ids); 
            references[name] = {
                "features": chosen_ids,
                "raw": built
            };

        } catch (e) {
            utils.freeCache(built);
            throw e;
        }
    }

    return {
        "loaded": preloaded[name],
        "built": references[name]
    };
}

export function compute(args) {
    if (!markers.changed && !inputs.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
        return;
    } 

    let rebuild = false;
    if (inputs.changed || !("feature_space" in cache)) {
        rebuild = true;
        chooseFeatures();
    }

    // automatically choose from the data
    let species = cache.feature_details.species;

    // Fetching all of the references.
    let init = downloads.initialize();
    let valid = {};
    if (species == "human") {
        for (const ref of args.human_references) {
            valid[ref] = getBuiltReference(ref, "human", rebuild);
        }
    } else if (species == "mouse") {
        for (const ref of args.mouse_references) {
            valid[ref] = getBuiltReference(ref, "mouse", rebuild);
        }
    }

    // Creating a column-major array of mean vectors.
    let ngenes = cache.features.length;
    let ngroups = markers.numberOfGroups(); 
    let cluster_means = utils.allocateCachedArray(ngroups * ngenes, "Float64Array", cache);
    for (var g = 0; g < ngroups; g++) {
        let means = markers.fetchGroupMeans(g, false); // Warning: direct view in wasm space - be careful.
        let cluster_array = cluster_means.array();
        cluster_array.set(means, g * ngenes);
    }

    // Running classifications on the cluster means. Note that compute() itself
    // cannot be async, as we need to make sure 'changed' is set and available for
    // downstream steps; hence the explicit then().
    cache.results = {};
    for (const [key, val] of Object.entries(valid)) {
        cache.results[key] = val.then(ref => {
            let output = scran.labelCells(cluster_means, ref.built.raw, { numberOfFeatures: ngenes, numberOfCells: ngroups });
            let labels = [];
            for (const o of output) {
                labels.push(ref.loaded.labels[o]);
            }
            return labels;
        });
    }

    // Performing additional integration, if necessary. We don't really 
    // need this if there's only one reference.
    let used_refs = Object.keys(valid);
    if (used_refs.length > 1) {
        if (rebuild || utils.changedParameters(used_refs, cache.used)) {
            let used_vals = Object.values(valid);

            cache.integrated = Promise.all(used_vals)
                .then(arr => {
                    let loaded = arr.map(x => x.loaded.raw);
                    let feats = arr.map(x => x.built.features);
                    let built = arr.map(x => x.built.raw);
                    return scran.integrateLabelledReferences(cache.features, loaded, feats, built);
                }
            );
        }

        cache.integrated_results = cache.integrated
            .then(async (integrated) => {
                let results = [];
                for (const key of used_refs) {
                    results.push(await cache.results[key]);
                }

                let out = scran.integrateCellLabels(cluster_means, results, integrated, { numberOfFeatures: ngenes, numberOfCells: ngroups });
                let as_names = [];
                out.forEach(i => {
                    as_names.push(used_refs[i]);
                });
                return as_names;
            }
        );
    } else {
        utils.freeCache(cache.integrated);
        delete cache.integrated_results;
    }
    cache.used = used_refs;

    changed = true;
    delete cache.reloaded;
    return;
}

export async function results() {
    if ("reloaded" in cache) {
        return cache.reloaded;
    } else {
        let perref = {};
        for (const [key, val] of Object.entries(cache.results)) {
            perref[key] = await val;
        }

        let output = { "per_reference": perref };
        if ("integrated_results" in cache) {
            output.integrated = await cache.integrated_results;
        }
        console.log(output);
        return output;
    }
}

export async function serialize() {
    return {
        "parameters": parameters,
        "contents": await results()
    };
}

export function unserialize(state) {
    parameters = state.parameters;
    cache.reloaded = state.contents;
    return;
}