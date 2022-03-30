import * as scran from "scran.js";
import * as utils from "./_utils.js";
import { H5Reader } from "./_reader_h5.js";
import { H5ADReader } from "./_reader_h5ad.js";
import { MtxReader } from "./_reader_mtx.js";
import * as rutils from "./_reader_utils.js";

var cache = {};
var parameters = {};
var abbreviated = {};

export var changed = false;

function merge_datasets(odatasets) {
    let datasets = {};
    for (const f in odatasets) {
        datasets[f] = odatasets[f].getDataset();
    }

    changed = true;

    let keys = Object.keys(datasets);

    if (keys.length == 1) {
        cache = datasets[keys[0]];

        let batchfield = parameters[keys[0]].batch;
        if (batchfield && batchfield.toLowerCase() != "none") {

            let anno_batch = cache.annotations[batchfield]
            if (anno_batch && anno_batch.length == cache.matrix.numberOfColumns()) {
                let uvals = {};
                
                // everything is a single batch to start with
                cache.batch = new Array(cache.matrix.numberOfColumns()).fill(0);

                anno_batch.map((x, i) => {
                    if (!(x in uvals)) {
                        uvals[x] = Object.keys(uvals).length;
                    }
            
                    cache.batch[i] = uvals[x];
                });
            }
        }

        return;
    }

    // get gene columns to use
    let result = rutils.getCommonGenes(datasets);
    let best_fields = result.best_fields;

    let gnames = [], mats = [];
    cache.batch = [];
    for (var i = 0; i < keys.length; i++) {
        gnames.push(datasets[keys[i]].genes[best_fields[i]]);
        mats.push(datasets[keys[i]].matrix);

        let arr = new Array(datasets[keys[i]].matrix.numberOfColumns()).fill(i);
        cache.batch = cache.batch.concat(arr);
    }

    // cbind assays with names
    let merged_mats = scran.cbindWithNames(mats, gnames);

    // TODO: use indices when available
    cache.genes = {
        "id": merged_mats.names
    };

    cache.matrix = merged_mats.matrix;
    cache.indices = merged_mats.indices;

    let ckeys = [];
    // first pass get all annotations keys across datasets
    for (const i in datasets) {
        if (datasets[i].annotations) ckeys = ckeys.concat(Object.keys(datasets[i].annotations));
    }

    ckeys = [...new Set(ckeys)];

    // merge cells
    let combined_annotations = {};
    for (const i of ckeys) {
        combined_annotations[i] = []
        for (const f in datasets) {
            if (datasets[f].annotations && datasets[f].annotations[i]) {
                combined_annotations[i] = combined_annotations[i].concat(datasets[f].annotations[i]);
            } else {
                combined_annotations[i] = combined_annotations[i].concat(new Array(datasets[f].matrix.numberOfColumns()));
            }
        }
    }

    cache.annotations = combined_annotations;

    // also after the merged dataset is created, the individual 
    // dataset matrices are no longer useful
    for (const f in odatasets) {
        utils.freeCache(odatasets[f].getDataset().matrix);
    }
}

/******************************
 ****** Standard exports ******
 ******************************/

export function compute(files) {
    parameters.files = [];
    for (const f in files) {
        datasets[f] = {};
        let curf = files[f];

        let obj;
        switch (files[f].format) {
            case "mtx":
                obj = new MtxReader(files[f]);
                break;
            case "hdf5":
            case "tenx":
                obj = new H5Reader(files[f]);
                break;
            case "h5ad":
                obj = new H5ADReader(files[f]);
                break;
            case "kana":
                // do nothing, this is handled by unserialize.
                break;
            default:
                throw "unknown matrix file extension: '" + format + "'";
        }

        parameters.files.push(obj);
    }

    // Constructing the abbrievation.
    let test_abbreviated = [];
    for (const obj of parameters.files) {
        test_abbreviated.push(obj.formatFiles(f => f.size));
    }
    if (!utils.changedParameters(abbreviated, test_abbreviated)) {
        changed = false;
        return;
    }

    // Otherwise loading in the buffers.
    parameters.files = [];
    for (const obj of parameters.files) {
        let curfiles = files[f];
        parameters.files.push(obj.formatFiles(curfiles, f => {
            var reader = new FileReaderSync();
            bufferFun = (f) => reader.readAsArrayBuffer(f);
        }));
    }

    // Constructing a matrix.
    merge_datasets();
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

    {
        let phandle = ghandle.createGroup("parameters");

        let formats = [];
        let files = [];
        let names = [];
        let numbers = [];

        for (const obj of parameters.files) {
            formats.push(obj.format);
            for (const x of obj.files) {
                files.push(x);
            }
            names.push(obj.name);
            numbers.push(obj.files.length);
        }

        if (formats.length > 1) {
            phandle.writeDataSet("format", "String", null, formats);
            phandle.writeDataSet("sample_groups", "Int32", null, numbers);
            phandle.writeDataSet("sample_names", "Int32", null, names);
        } else {
            phandle.writeDataSet("format", "String", [], formats[0]);
        }

        let fihandle = phandle.createGroup("files");
        let sofar = 0;
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
        let dims = [cache.matrix.numberOfRows(), cache.matrix.numberOfColumns()];
        rhandle.writeDataSet("dimensions", "Int32", null, dims);

        if (formats.length > 1) {
            let perm = cache.matrix.permutation({ restore: false });
            let permed_indices = cache.indices.map(i => perm[i]);
            rhandle.writeDataSet("indices", "Int32", null, permed_indices);
        } else {
            let perm = cache.matrix.permutation({ copy: "view" });
            rhandle.writeDataSet("permutation", "Int32", null, perm);
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
    let files = new Array(kids.length);

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
        files[idx] = curfile;
    }

    // Run the reloaders now.
    let format = phandle.open("format", { load: true }).values[0];
    if (format == "MatrixMarket") {
        loadMatrixMarketRaw(files);

    } else if (format == "H5AD") {
        loadH5ADRaw(files);

    } else if (format == "10X") {
        load10XRaw(files);

    } else if (format == "HDF5") {
        // legacy support: trying to guess what it is based on its extension.
        if (files[0].name.match(/h5ad$/i)) {
            loadH5ADRaw(files);
        } else {
            load10XRaw(files);
        }

    } else {
        throw `unrecognized count matrix format "${format}"`;
    }

    parameters = {
        format: format,
        files: files
    };

    // We need to do something if the permutation is not the same.
    let rhandle = ghandle.open("results");

    let perm = null;
    if ("permutation" in rhandle.children) {
        let dhandle = rhandle.open("permutation", { load: true });
        perm = scran.updatePermutation(cache.matrix, dhandle.values);
    } else {
        // Otherwise, we're dealing with v0 states. We'll just
        // assume it was the same, I guess. Should be fine as we didn't change
        // the permutation code in v0.
    }

    let permuter;
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

    if (!cache.batch) {
        return null;
    }

    if (!cache.batchBuffer) {
        cache.batchBuffer = scran.createInt32WasmArray(cache.batch.length);
        cache.batchBuffer.set(cache.batch);
    }

    return cache.batchBuffer;
}
