import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as inputs from "./_inputs.js";
import * as markers from "./_score_markers.js";
import * as downloads from "./DownloadsDBHandler.js";
import * as pako from "pako";

var cache = {};
var parameters = {};

export var changed = false;

var hs_references = {};
var mm_references = {};

// TODO: figure out a better CORS-friendly location
//const hs_base = "https://github.com/clusterfork/singlepp-references/releases/download/hs-latest";
//const mm_base = "https://github.com/clusterfork/singlepp-references/releases/download/mm-latest";
const hs_base = "https://clusterfork.github.io/singlepp-references/testing/human";
const mm_base = "https://clusterfork.github.io/singlepp-references/testing/mouse";

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
    if (species == "human") {
        base = hs_base;
        references = hs_references;
    } else {
        base = mm_base;
        references = mm_references;
    }

    downloads.initialize();

    if (!(name in references) || rebuild) {
        let buffers = await Promise.all([
            downloads.get(base + "/" + name + "_genes.csv.gz"),
            downloads.get(base + "/" + name + "_labels_fine.csv.gz"),
            downloads.get(base + "/" + name + "_label_names_fine.csv.gz"),
            downloads.get(base + "/" + name + "_markers_fine.gmt.gz"),
            downloads.get(base + "/" + name + "_matrix.csv.gz")
        ]);

        let loaded, built;
        try {
            // Technically, we could persist the loaded reference before it is
            // built.  This would avoid the need for a reload if rebuild =
            // true. However, it would be rare to see a rebuild = true, because
            // that implies a completely new dataset; and I don't want to spend
            // more memory holding the loaded dataset alongside the built one.
            let loaded = scran.loadLabelledReferenceFromBuffers(
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

            let chosen_ids;
            if (cache.feature_details.type === "ensembl") {
                chosen_ids = ensembl;
            } else {
                chosen_ids = symbol;
            }

            let built = scran.buildLabelledReference(cache.features, loaded, chosen_ids); 
            references[name] = {
                "labels": labels, 
                "raw": built
            };

        } catch (e) {
            if (built !== undefined) {
                built.free();
            }
            throw e;

        } finally {
            if (loaded !== undefined) {
                loaded.free();
            }
        }
    }

    return references[name];
}

export function compute(args) {
    if (!markers.changed && !inputs.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
        return;
    } 

    let rebuild = false;
    if (inputs.changed || !("feature_space" in cached)) {
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
    for (const [key, val] of Object.entries(valid)) {
        valid[key] = val.then(builtref => {
            let output = scran.labelCells(cluster_means, builtref.raw, { numberOfFeatures: ngenes, numberOfCells: ngroups });
            let labels = [];
            for (const o of output) {
                labels.push(builtref.labels[o]);
            }
            return labels;
        });
    }

    cache.results = valid;
    changed = true;
    delete cache.reloaded;
    return;
}

export async function results() {
    let output = {};
    if ("reloaded" in cache) {
        return cache.reloaded;
    } else {
        for (const [key, val] of Object.entries(cache.results)) {
            output[key] = await val;
        }
    }
    console.log(output);
    return output;
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
