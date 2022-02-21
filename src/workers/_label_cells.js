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
const hs_base = "https://github.com/clusterfork/singlepp-references/releases/download/hs-latest";
const mm_base = "https://github.com/clusterfork/singlepp-references/releases/download/mm-latest";

// TODO: consolidate this with _inputs.readDSVFromBuffer to eliminate the D3 dependency.
function quickLineReader(buffer, compression) {
    let txt = buffer;
    if (compression == "gz") {
        let txt = pako.ungzip(buffer);
    }

    const dec = new TextDecoder();
    let decoded = dec.decode(txt);

    let lines = decoded.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] == "") { // ignoring the trailing newline.
        lines.pop();
    }

    return lines;    
}

function loadReference(name, species) {
    let base;
    let ref;
    if (species == "human") {
        base = hs_base;
        ref = hs_references;
    } else {
        base = mm_base;
        ref = mm_references;
    }

    if (name in ref) {
        return new Promise(resolve => resolve(ref[name]));
    }

    let collection = [
        downloads.get(base + "/" + name + "_genes.csv.gz"),
        downloads.get(base + "/" + name + "_labels_fine.csv.gz"),
        downloads.get(base + "/" + name + "_labels_names_fine.csv.gz"),
        downloads.get(base + "/" + name + "_markers_fine.gmt.gz"),
        downloads.get(base + "/" + name + "_markers_matrix.csv.gz")
    ];

    return Promise.all(collection).then(buffers => {
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
            ensembl.push(fields[1]);
        });

        let labels = quickLineReader(new Uint8Array(buffers[2]); // full label names
        ref[name] = {
            "genes": { "ensembl": ensembl, "symbol": symbol },
            "labels": labels, 
            "raw": loaded
        };

        return ref[name];
    });
}

export function compute(args) {
    if (!markers.changed && !utils.changedParameters(parameters, args)) {
        changed = false;
        return;
    } 
    
    // Try to figure out the species from the highest confidence annotation.
    let genes = inputs.fetchGenes();
    let types = inputs.fetchGeneTypes(); // TODO: add this function.
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

    // Fetching all of the references.
    let init = downloads.initialize();
    let valid = {};

    if (best.species == "human") {
        for (const ref of args.human_references) {
            valid[ref] = loadReference(ref, "human");
        }
    } else if (best.species == "mouse") {
        for (const ref of args.mouse_references) {
            valid[ref] = loadReference(ref, "mouse");
        }
    }

    // Creating a column-major array of mean vectors.
    let ngroups = markers.numberOfGroups(); // TODO: add this
    let ngenes = markers.numberOfGenes(); // TODO: add this
    let cluster_means = utils.allocateCachedArray(ngroups * ngenes, "Float64Array", cache);
    let cluster_array = cluster_means.array();
    for (var g = 0; g < ngroups; g++) {
        let means = markers.fetchMeansAsWasmArray(g);
        cluster_array.set(means, g * ngenes);
    }

    // Running classifications on the cluster means.
    for (const [key, val] of Object.entries(valid)) {
        valid[key] = val.then(refpack => {
            let chosen_ids;
            if (best.type == "ensembl") {
                chosen_ids = refpack.genes.ensembl;
            } else {
                chosen_ids = refpack.genes.symbol;
            }

            // TODO: support dense array inputs into labelCells.
            let output = scran.labelCells(cluster_means, refpack.raw, { geneNames: genes[best_feature], referenceGeneNames: chosen_ids });

            let labels = [];
            for (const o of output) {
                labels.push(refpack.labels[o]);
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
