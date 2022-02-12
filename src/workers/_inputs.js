import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as d3 from "d3-dsv";
import * as pako from "pako";

var cache = {};
var parameters = {};
var abbreviated = {};

export var changed = false;

function permuteGenes(genes) {
    var buf = new scran.Int32WasmArray(cache.matrix.numberOfRows());
    try {
        cache.matrix.permutation({ buffer: buf });

        let perm = buf.array();
        for (const [key, val] of Object.entries(genes)) {
            let copy = val.slice();

            for (var i = 0; i < perm.length; i++) {
                copy[perm[i]] = val[i];
            }
            genes[key] = copy;
        }
    } finally {
        buf.free();
    }
}

function dummyGenes(numberOfRowss) {
    let genes = []
    for (let i = 0; i < numberOfRowss; i++) {
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

/** Matrix Market **/
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

    permuteGenes(cache.genes);

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
            delete cache.reloaded;
        }
    }

    return;
}

/** HDF5 **/

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
        console.log(cache.genes);

        // TODO: pull out sample IDs from the HDF5 file, if they exist.
        cache.annotations = null;

    } finally {
        scran.removeFile(tmppath);
    }

    if (cache.genes === null) {
        cache.genes = dummyGenes(cache.matrix.numberOfRows());
    }
    permuteGenes(cache.genes);
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
    permuteGenes(cache.genes);
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
            delete cache.reloaded;
        }
    }

    return;
}

/** Public functions (standard) **/
export function compute(args) {
    switch (args.format) {
        case "mtx":
            loadMatrixMarket(args.files);
            break;
        case "hdf5":
        case "tenx":
            loadHDF5(args.files, "10X");
            break;
        case "h5ad":
            loadHDF5(args.files, "H5AD");
            break;
        case "kana":
            // do nothing, this is handled by unserialize.
            break;
        default:
            throw "unknown matrix file extension: '" + args.format + "'";
    }
    return;
}

export function results() {
    var output = { "dimensions": fetchDimensions() }
    if ("reloaded" in cache) {
        output.genes = { ...cache.reloaded.genes };

        if (cache.annotations) {
            output.annotations = Object.keys(cache.reloaded.annotations);
        }
    } else {
        output.genes = { ...cache.genes };
        if (cache.annotations) {
            output.annotations = Object.keys(cache.annotations);
        }
    }
    return output;
}

export function serialize() {
    var contents = {};
    if ("reloaded" in cache) {
        contents.genes = { ...cache.reloaded.genes };
        contents.num_cells = cache.reloaded.num_cells;
        if (cache.reloaded.annotations) {
            contents.annotations = cache.reloaded.annotations;
        }
    } else {
        contents.genes = { ...cache.genes };
        contents.num_cells = cache.matrix.numberOfColumns();
        if (cache.annotations) {
            contents.annotations = cache.annotations;
        }
    }

    // Making a deep-ish clone of the parameters so that any fiddling with
    // buffers during serialization does not compromise internal state.
    var parameters2 = { ...parameters };
    parameters2.files = parameters.files.map(x => { return { ...x }; });

    return {
        "parameters": parameters2,
        "contents": contents
    };
}

export function unserialize(saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
}

/** Public functions (custom) **/
export function fetchCountMatrix() {
    if ("reloaded" in cache) {
        if (parameters.type == "MatrixMarket") {
            loadMatrixMarketRaw(parameters.files);

        } else if (parameters.type == "H5AD") {
            loadH5ADRaw(parameters.files);

        } else if (parameters.type == "10X") {
            load10XRaw(parameters.files);

        } else if (parameters.type == "HDF5") {
            // legacy support: trying to guess what it is based on its extension.
            if (parameters.files[0].name.match(/h5ad$/i)) {
                loadH5ADRaw(parameters.files);
            } else {
                load10XRaw(parameters.files);
            }

        } else {
            throw `unrecognized count matrix format, ${parameters.type}`;
        }
    }
    return cache.matrix;
}

export function fetchDimensions() {
    if ("reloaded" in cache) {
        return {
            // This should contain at least one element,
            // and all of them should have the same length,
            // so indexing by the first element is safe.
            "num_genes": Object.values(cache.reloaded.genes)[0].length,
            "num_cells": cache.reloaded.num_cells
        };
    } else {
        return {
            "num_genes": cache.matrix.numberOfRows(),
            "num_cells": cache.matrix.numberOfColumns()
        };
    }
}

export function fetchGenes() {
    if ("reloaded" in cache) {
        return cache.reloaded.genes;
    } else {
        return cache.genes;
    }
}

export function fetchAnnotations(col) {
    let annots, asize;
    if ("reloaded" in cache) {
        annots = cache.reloaded.annotations;
        asize = cache.reloaded.matrix.numberOfColumns();
    } else {
        annots = cache.annotations;
        asize = cache.matrix.numberOfColumns();
    }

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
