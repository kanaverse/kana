import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as iutils from "./_utils_inputs.js";

var cache = {};
var parameters = {};
var abbreviated = {};

export var changed = false;

function dummy_genes(numberOfRows) {
    let genes = []
    for (let i = 0; i < numberOfRows; i++) {
        genes.push(`Gene ${i + 1}`);
    }
    return { "id": genes };
}

function process_datasets(files, sample_factor) {
    // Loading all of the individual matrices.
    let datasets = {};
    try {
        for (const [key, val] of Object.entries(files)) {
            let namespace = iutils.chooseNamespace(val.format);
            let current = namespace.loadData(val);

            if (!("genes" in current)) {
                current.genes = dummy_genes(current.matrix.numberOfRows());
            } 
            if (current.matrix.isPermuted()) {
                scran.permuteFeatures(current.matrix, current.genes);
            }

            datasets[key] = current;
        }
    } catch (e) {
        // If any one fails, we free the rest.
        for (const [key, val] of Object.entries(datasets)){
            utils.freeCache(val.matrix);
        }
        throw e;
    }

    // Ensure we have a reproducible order; otherwise the batch
    // order becomes dependent on the JS engine's ordering.
    let dkeys = Object.keys(datasets);
    dkeys.sort();

    if (dkeys.length == 1) {
        let current = datasets[dkeys[0]];
        let blocks = null;
        let block_levels = null;

        if (sample_factor && sample_factor !== null) {
            // Single matrix with a batch factor.
            try {
                let anno_batch = current.annotations[sample_factor];
                let ncols = current.matrix.numberOfColumns();
                if (anno_batch.length != ncols) {
                    throw new Error("length of sample factor '" + sample_factor + "' should be equal to the number of cells"); 
                }

                blocks = scran.createInt32WasmArray(ncols);
                block_levels = [];
                let block_arr = blocks.array();

                let uvals = {};
                anno_batch.forEach((x, i) => {
                    if (!(x in uvals)) {
                        uvals[x] = block_levels.length;
                        block_levels.push(x);
                    }
                    block_arr[i] = uvals[x];
                });
            } catch (e) {
                utils.freeCache(blocks);
                utils.freeCache(current.matrix);
                throw e;
            }
        }

        current.block_ids = blocks;
        current.block_levels = block_levels;
        return current;

    } else {
        // Multiple matrices, each of which represents a batch.
        let output = {}
        let blocks;

        try {
            // Identify the gene columns to use
            let result = iutils.getCommonGenes(datasets);
            let best_fields = result.best_fields;

            let gnames = [];
            let mats = [];
            let total = 0;
            for (var i = 0; i < dkeys.length; i++) {
                let current = datasets[dkeys[i]];
                gnames.push(current.genes[best_fields[i]]);
                mats.push(current.matrix);
                total += current.matrix.numberOfColumns();
            }

            blocks = scran.createInt32WasmArray(total);
            let barr = blocks.array();
            let nice_barr = new Array(total);
            let sofar = 0;
            for (var i = 0; i < dkeys.length; i++) {
                let old = sofar;
                let current = datasets[dkeys[i]];
                sofar += current.matrix.numberOfColumns();
                barr.fill(i, old, sofar);
                nice_barr.fill(dkeys[i], old, sofar);
            }
            output.block_ids = blocks;
            output.block_levels = dkeys;

            let merged = scran.cbindWithNames(mats, gnames);
            output.matrix = merged.matrix;

            // Storing the identities of the genes in terms of the
            // original row indices of the first matrix.
            let firstperm = mats[0].permutation({ restore: false });
            output.indices = merged.indices.map(i => firstperm[i]);

            // Extracting gene information from the first object. We won't make
            // any attempt at merging and deduplication across objects.
            let included = new Set(merged.indices);
            output.genes = {};
            let first_genes = datasets[dkeys[0]].genes;
            for (const [key, val] of Object.entries(first_genes)) {
                output.genes[key] = val.filter((x, i) => included.has(i));
            }

            // Get all annotations keys across datasets; we then concatenate
            // columns with the same name, or we just fill them with missings.
            let ckeys = new Set();
            for (const d of dkeys) {
                let current = datasets[d];
                if (current.annotations !== null) {
                    for (const a of Object.keys(current.annotations)) {
                        ckeys.add(a);
                    }
                }
            }
            let anno_keys = [...ckeys];

            let combined_annotations = {};
            for (const i of anno_keys) {
                let current_combined = [];
                for (const d of datasets) {
                    let x;
                    if (d.annotations && d.annotations[i]) {
                        x = d.annotations[i];
                        if (!(x instanceof Array)) {
                            x = Array.from(x);
                        }
                    } else {
                        x = new Array(d.matrix.numberOfColumns());
                    }
                    current_combined = current_combined.concat(x);
                }
                combined_annotations[i] = current_combined;
            }

            output.annotations = combined_annotations;
            output.annotations["__batch__"] = nice_barr;

        } catch (e) {
            utils.freeCache(blocks);
            throw e;

        } finally {
            // Once the merged dataset is created, the individual dataset
            // matrices are no longer useful, so we need to delete them anyway.
            for (const v of Object.values(datasets)) {
                utils.freeCache(v.matrix);
            }
        }

        return output;
    }
}

export function process_and_cache(new_files, sample_factor) {
    let contents = process_datasets(new_files, sample_factor);
    cache.matrix = contents.matrix;
    cache.genes = contents.genes;
    cache.annotations = contents.annotations;
    cache.block_ids = contents.block_ids;
    cache.block_levels = contents.block_levels;
    cache.indices = contents.indices;
    return 
}

/******************************
 ****** Standard exports ******
 ******************************/

export function compute(files, sample_factor) {
    // Don't bother proceeding with any of the below
    // if we're operating from a reloaded state.
    let entries = Object.entries(files);
    if (entries.length == 1 && entries[0][1].format == "kana") {
        return;
    }

    changed = true;

    let tmp_abbreviated = {};
    for (const [key, val] of entries) {
        let namespace = iutils.chooseNamespace(val.format);
        tmp_abbreviated[key] = namespace.formatFiles(val, f => f.size);
    }

    if (!utils.changedParameters(tmp_abbreviated, abbreviated) && parameters.sample_factor != sample_factor) {
        changed = false;
        return;
    }

    let new_files = {};
    for (const [key, val] of Object.entries(files)) {
        let namespace = iutils.chooseNamespace(val.format);
        new_files[key] = namespace.formatFiles(val, f => (new FileReaderSync()).readAsArrayBuffer(f));
    }

    utils.freeCache(cache.matrix);
    utils.freeCache(cache.block_ids);
    process_and_cache(new_files, sample_factor);

    abbreviated = tmp_abbreviated;
    parameters.files = new_files;
    parameters.sample_factor = sample_factor;

    return;
}

export function results() {
    var output = {
        "dimensions": {
            "num_genes": cache.matrix.numberOfRows(),
            "num_cells": cache.matrix.numberOfColumns()
        },
        "genes": { ...cache.genes }
    };
    if (cache.annotations) {
        output.annotations = Object.keys(cache.annotations);
    }
    return output;
}

export async function serialize(handle, saver, embedded) {
    let ghandle = handle.createGroup("inputs");

    let multifile = false;
    {
        let phandle = ghandle.createGroup("parameters");

        let formats = [];
        let files = [];
        let names = [];
        let numbers = [];

        for (const [key, val] of Object.entries(parameters.files)) {
            formats.push(val.format);
            for (const x of val.files) {
                files.push(x);
            }
            names.push(key);
            numbers.push(val.files.length);
        }

        if (formats.length > 1) {
            multifile = true;
            phandle.writeDataSet("format", "String", null, formats);
            phandle.writeDataSet("sample_groups", "Int32", null, numbers);
            phandle.writeDataSet("sample_names", "String", null, names);
        } else {
            phandle.writeDataSet("format", "String", [], formats[0]);
        }

        let fihandle = phandle.createGroup("files");
        for (const [index, obj] of files.entries()) {
            let curhandle = fihandle.createGroup(String(index));
            curhandle.writeDataSet("type", "String", [], obj.type);
            curhandle.writeDataSet("name", "String", [], obj.name);

            let res = await saver(obj);
            if (embedded) {
                curhandle.writeDataSet("offset", "Uint32", [], res.offset);
                curhandle.writeDataSet("size", "Uint32", [], res.size);
            } else {
                curhandle.writeDataSet("id", "String", [], res);
            }
        }
    }

    {
        let rhandle = ghandle.createGroup("results");
        rhandle.writeDataSet("dimensions", "Int32", null, [cache.matrix.numberOfRows(), cache.matrix.numberOfColumns()]);
        if (multifile) {
            rhandle.writeDataSet("indices", "Int32", null, cache.indices);
        } else {
            rhandle.writeDataSet("permutation", "Int32", null, cache.matrix.permutation({ copy: "view" }));
        }
    }

    return;
}

export async function unserialize(handle, loader, embedded) {
    let ghandle = handle.open("inputs");
    let phandle = ghandle.open("parameters");

    // Extracting the files.
    let fihandle = phandle.open("files");
    let kids = fihandle.children;
    let all_files = new Array(kids.length);

    for (const x of Object.keys(kids)) {
        let current = fihandle.open(x);

        let curfile = {};
        for (const field of ["type", "name"]) {
            let dhandle = current.open(field, { load: true });
            curfile[field] = dhandle.values[0];
        }

        if (!embedded) {
            let dhandle = current.open("id", { load: true });
            curfile.buffer = await loader(dhandle.values[0]);
        } else {
            let buffer_deets = {};
            for (const field of ["offset", "size"]) {
                let dhandle = current.open(field, { load: true });
                buffer_deets[field] = dhandle.values[0];
            }
            curfile.buffer = await loader(buffer_deets.offset, buffer_deets.size);
        }

        let idx = Number(x);
        all_files[idx] = curfile;
    }

    // Extracting the format and organizing the files.
    parameters = { files: {}, sample_factor: null };
    let fohandle = phandle.open("format", { load: true });
    let solofile = (fohandle.shape.length == 0);
    if (solofile) {
        parameters.files["default"] = {
            format: fohandle.values[0],
            files: all_files
        };

        let sf = null;
        if ("sample_factor" in phandle.children) {
            sf = phandle.open("sample_factor", { load: true }).values[0];
        }
        parameters.sample_factor = sf;

    } else {
        let formats = fohandle.values;
        let sample_names = phandle.open("sample_names", { load: true }).values;
        let sample_groups = phandle.open("sample_groups", { load: true }).values;

        let sofar = 0;
        for (var i = 0; i < formats.length; i++) {
            let curfiles = [];
            for (var j = 0; j < sample_groups[i]; j++) {
                curfiles.push(all_files[sofar]);
                sofar++;
            }

            parameters.files[sample_names[i]] = {
                format: formats[i],
                files: curfiles
            };
        }
    }

    // Loading matrix data.
    process_and_cache(parameters.files, parameters.sample_factor);

    // We need to do something if the permutation is not the same.
    let rhandle = ghandle.open("results");
    let permuter;
    if (solofile) {
        let perm = null;
        if ("permutation" in rhandle.children) {
            let dhandle = rhandle.open("permutation", { load: true });
            perm = scran.updatePermutation(cache.matrix, dhandle.values);
        } else {
            // Otherwise, we're dealing with v0 states. We'll just
            // assume it was the same, I guess. Should be fine as we didn't change
            // the permutation code in v0.
        }

        if (perm !== null) {
            // Adding a permuter function for all per-gene vectors.
            permuter = (x) => {
                let temp = x.slice();
                x.forEach((y, i) => {
                    temp[i] = x[perm[i]];
                });
                x.set(temp);
                return;
            };
        } else {
            permuter = (x) => { };
        }
    } else {
        let old_indices = rhandle.open("indices", { load: true }).values;
        let new_indices = cache.indices;
        if (old_indices.length != new_indices.length) {
            throw new Error("old and new indices must have the same length for results to be interpretable");
        }

        let same = true;
        for (var i = 0; i < old_indices.length; i++) {
            if (old_indices[i] != new_indices[i]) {
                same = false
                break
            }
        }

        if (same) {
            permuter = (x) => {};
        } else {
            let remap = {};
            old_indices.forEach((x, i) => {
                remap[x] = i;
            });
            let perm = new_indices.map(o => {
                if (!(o in remap) || remap[o] === null) {
                    throw new Error("old and new indices should contain the same row identities");
                }
                let pos = remap[o];
                remap[o] = null;
                return pos;
            });
            permuter = (x) => {
                return x.map((y, i) => x[perm[i]]);
            };
        }
    }

    return permuter;
}

/****************************
 ****** Custom exports ******
 ****************************/

export function fetchCountMatrix() {
    return cache.matrix;
}

export function fetchGenes() {
    return cache.genes;
}

export function fetchGeneTypes() {
    if (!("gene_types" in cache)) {
        var gene_info_type = {};
        var gene_info = fetchGenes();
        for (const [key, val] of Object.entries(gene_info)) {
            gene_info_type[key] = scran.guessFeatures(val);
        }
        cache.gene_types = gene_info_type;
    }
    return cache.gene_types;
}

export function fetchAnnotations(col) {
    let annots = cache.annotations;
    let size = cache.matrix.numberOfColumns();

    if (!(col in annots)) {
        throw `column ${col} does not exist in col.tsv`;
    }

    if (utils.isObject(annots[col]) && "type" in annots[col]) {
        return annots[col];
    }

    let uvals = {};
    let uTypedAray = new Uint8Array(size);
    annots[col].map((x, i) => {
        if (!(x in uvals)) {
            uvals[x] = Object.keys(uvals).length;
        }

        uTypedAray[i] = uvals[x];
    });

    return {
        "index": Object.keys(uvals),
        "factor": uTypedAray
    }
}

export function fetchBlock() {
    return cache.block_ids;
}
