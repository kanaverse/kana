import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as d3 from "d3-dsv";
import * as pako from "pako";

var cache = {};
var parameters = {};
var abbreviated = {};

export var changed = false;

function dummyGenes(numberOfRows) {
    let genes = []
    for (let i = 0; i < numberOfRows; i++) {
        genes.push(`Gene ${i + 1}`);
    }
    return { "id": genes };
}

function readDSVFromBuffer(content, fname, delim = "\t") {
    var ext = fname.name.split('.').pop();

    if (ext == "gz") {
        content = pako.ungzip(content);
    }

    const dec = new TextDecoder();
    let decoded = dec.decode(content);
    const tsv = d3.dsvFormat(delim);
    let parsed = tsv.parseRows(decoded);

    return parsed;
}

/***********************************
 ****** Matrix Market loaders ******
 ***********************************/

function loadMatrixMarketRaw(files) {
    utils.freeCache(cache.matrix);

    // In theory, this section may support multiple files (e.g., for multiple samples).
    var mtx_files = files.filter(x => x.type == "mtx");
    var first_mtx = mtx_files[0];
    var contents = new Uint8Array(first_mtx.buffer);
    var ext = first_mtx.name.split('.').pop();
    var is_compressed = (ext == "gz");
    cache.matrix = scran.initializeSparseMatrixFromMatrixMarketBuffer(contents, { "compressed": is_compressed });

    var genes_file = files.filter(x => x.type == "genes");
    if (genes_file.length == 1) {
        var genes_file = genes_file[0]
        var content = new Uint8Array(genes_file.buffer);

        let parsed = readDSVFromBuffer(content, genes_file);

        if (parsed.length != cache.matrix.numberOfRows()) {
            throw "number of matrix rows is not equal to the number of genes in '" + genes_file.name + "'";
        }

        var ids = [], symb = [];
        parsed.forEach(x => {
            ids.push(x[0]);
            symb.push(x[1]);
        });

        cache.genes = { "id": ids, "symbol": symb };
    } else {
        cache.genes = dummyGenes(cache.matrix.numberOfRows());
    }

    scran.permuteFeatures(cache.matrix, cache.genes);

    var annotations_file = files.filter(x => x.type == "annotations");
    if (annotations_file.length == 1) {
        var annotations_file = annotations_file[0]
        var content = new Uint8Array(annotations_file.buffer);

        let parsed = readDSVFromBuffer(content, annotations_file);

        let diff = cache.matrix.numberOfColumns() - parsed.length;
        // check if a header is present or not
        let headerFlag = false;
        if (diff === 0) {
            headerFlag = false;
        } else if (diff === -1) {
            headerFlag = true;
        } else {
            throw "number of annotations rows is not equal to the number of cells in '" + annotations_file.name + "'";
        }

        let headers = [];
        if (headerFlag) {
            headers = parsed.shift();
        } else {
            parsed[0].forEach((x, i) => {
                headers.push(`Column_${i + 1}`);
            })
        }

        cache.annotations = {}
        headers.forEach((x, i) => {
            cache.annotations[x] = parsed.map(y => y[i]);
        });

    } else {
        cache.annotations = null;
    }

    return;
}

function loadMatrixMarket(args) {
    var reader = new FileReaderSync();

    // First pass computes an abbreviated version to quickly check for changes.
    // Second pass does the actual readArrayBuffer.
    for (var it = 0; it < 2; it++) {
        var formatted = { "type": "MatrixMarket", "files": [] };

        var bufferFun;
        if (it == 0) {
            bufferFun = (f) => f.size;
        } else {
            bufferFun = (f) => reader.readAsArrayBuffer(f);
        }

        for (const f of args.mtx) {
            formatted.files.push({ "type": "mtx", "name": f.name, "buffer": bufferFun(f) });
        }

        if (args.gene !== null) {
            if (args.gene.length !== 1) {
                throw "expected no more than one gene file";
            }
            var genes_file = args.gene[0];
            formatted.files.push({ "type": "genes", "name": genes_file.name, "buffer": bufferFun(genes_file) });
        }

        if (args.barcode !== null) {
            if (args.barcode.length !== 1) {
                throw "expected no more than one cell annotation file";
            }
            var annotations_file = args.barcode[0];
            formatted.files.push({ "type": "annotations", "name": annotations_file.name, "buffer": bufferFun(annotations_file) });
        }

        if (it == 0) {
            if (!utils.changedParameters(abbreviated, formatted)) {
                changed = false;
                return;
            } else {
                abbreviated = formatted;
                changed = true;
            }
        } else {
            parameters = formatted;
            loadMatrixMarketRaw(formatted.files);
        }
    }

    return;
}

/**************************
 ****** HDF5 loaders ******
 **************************/

function load10XRaw(files) {
    utils.freeCache(cache.matrix);

    // In theory, we could support multiple HDF5 buffers.
    var first_file = files[0];
    var tmppath = first_file.name;
    scran.writeFile(tmppath, new Uint8Array(first_file.buffer));

    try {
        cache.matrix = scran.initializeSparseMatrixFromHDF5(tmppath, "matrix");

        // Fetching the gene IDs and names.
        cache.genes = null;
        let objects = scran.extractHDF5ObjectNames(tmppath);
        if ("features" in objects["matrix"]) {
            let fobjects = objects["matrix"]["features"];
            if ("id" in fobjects && fobjects["id"] === "string dataset") {
                cache.genes = { id: scran.loadHDF5Dataset(tmppath, "matrix/features/id").contents };
                if ("name" in fobjects && fobjects["name"] === "string dataset") {
                    cache.genes.names = scran.loadHDF5Dataset(tmppath, "matrix/features/name").contents;
                }
            }
        }

        // TODO: pull out sample IDs from the HDF5 file, if they exist.
        cache.annotations = null;

    } finally {
        scran.removeFile(tmppath);
    }

    if (cache.genes === null) {
        cache.genes = dummyGenes(cache.matrix.numberOfRows());
    }
    scran.permuteFeatures(cache.matrix, cache.genes);

    return;
}

function loadH5ADRaw(files, name) {
    utils.freeCache(cache.matrix);

    // In theory, we could support multiple HDF5 buffers.
    var first_file = files[0];
    var tmppath = first_file.name;
    scran.writeFile(tmppath, new Uint8Array(first_file.buffer));

    try {
        cache.matrix = scran.initializeSparseMatrixFromHDF5(tmppath, "X");
        let objects = scran.extractHDF5ObjectNames(tmppath);

        // Trying to guess the gene names.
        cache.genes = null;
        if ("var" in objects) {
            let vobjects = objects["var"];
            if (utils.isObject(vobjects)) {
                if ("_index" in vobjects && vobjects["_index"] == "string dataset") {
                    cache.genes = { "_index": scran.loadHDF5Dataset(tmppath, "var/_index").contents };
                    for (const [key, val] of Object.entries(vobjects)) {
                        if (val === "string dataset" && (key.match(/name/i) || key.match(/symb/i))) {
                            cache.genes[key] = scran.loadHDF5Dataset(tmppath, `var/${key}`).contents;
                        }
                    }
                }
            }
        }

        // Adding the annotations.
        cache.annotations = null;
        if ("obs" in objects) {
            let bobjects = objects["obs"];
            cache.annotations = {};

            if (utils.isObject(bobjects)) {
                // Maybe it has names, maybe not, who knows; let's just add what's there.
                if ("_index" in bobjects && bobjects["_index"] == "string dataset") {
                    cache.annotations["_index"] = scran.loadHDF5Dataset(tmppath, "obs/_index").contents;
                }

                for (const [key, val] of Object.entries(bobjects)) {
                    if (val === "string dataset" || val === "integer dataset" || val === "float dataset") {
                        let bobj_factors = scran.loadHDF5Dataset(tmppath, `obs/${key}`).contents;

                        if ("__categories" in bobjects && bobjects["__categories"][key] == "string dataset") {
                            let bobj_index = scran.loadHDF5Dataset(tmppath, `obs/__categories/${key}`).contents;
                            cache.annotations[key] = {
                                "type": "factor",
                                "index": bobj_index,
                                "factor": bobj_factors
                            }
                        } else {
                            cache.annotations[key] = bobj_factors;
                        }
                    }
                }
            }
        }

    } finally {
        scran.removeFile(tmppath);
    }

    if (cache.genes === null) {
        cache.genes = dummyGenes(cache.matrix.numberOfRows());
    }
    scran.permuteFeatures(cache.matrix, cache.genes);

    return;
}

function loadHDF5(args, format) {
    var reader = new FileReaderSync();

    // First pass computes an abbreviated version to quickly check for changes.
    // Second pass does the actual readArrayBuffer.
    for (var it = 0; it < 2; it++) {
        var formatted = { "type": format, "files": [] };

        var bufferFun;
        if (it == 0) {
            bufferFun = (f) => f.size;
        } else {
            bufferFun = (f) => reader.readAsArrayBuffer(f);
        }

        for (const f of args.file) {
            formatted.files.push({ "type": "h5", "name": f.name, "buffer": bufferFun(f) });
        }

        if (it == 0) {
            if (!utils.changedParameters(abbreviated, formatted)) {
                changed = false;
                return;
            } else {
                abbreviated = formatted;
                changed = true;
            }
        } else {
            parameters = formatted;
            if (format == "10X") {
                load10XRaw(formatted.files);
            } else {
                loadH5ADRaw(formatted.files);
            }
        }
    }

    return;
}

/******************************
 ****** Standard exports ******
 ******************************/

export function compute(format, files) {
    switch (format) {
        case "mtx":
            loadMatrixMarket(files);
            break;
        case "hdf5":
        case "tenx":
            loadHDF5(files, "10X");
            break;
        case "h5ad":
            loadHDF5(files, "H5AD");
            break;
        case "kana":
            // do nothing, this is handled by unserialize.
            break;
        default:
            throw "unknown matrix file extension: '" + format + "'";
    }
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
        console.log(parameters.type);
        phandle.writeDataSet("format", "String", [], parameters.type);
        let fihandle = phandle.createGroup("files");

        let sofar = 0;
        for (const [index, obj] of parameters.files.entries()) {
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
        let perm = cache.matrix.permutation({ copy: "view" });
        let dims = [
            cache.matrix.numberOfRows(),
            cache.matrix.numberOfColumns()
        ];

        let rhandle = ghandle.createGroup("results"); 
        rhandle.writeDataSet("dimensions", "Int32", null, dims);
        rhandle.writeDataSet("permutation", "Int32", null, perm);
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
        permuter = (x) => {}; 
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
    let uTypedAray = new Uint8Array(asize);
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
