import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as d3 from "d3-dsv";
import * as pako from "pako";
import * as inputs from "./_inputs.js";

/***********************************
 ****** Matrix Market loaders ******
 ***********************************/

function getMtxGeneAnnots(files) {

    let annots = {};

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

        annots.genes = { "id": ids, "symbol": symb };
    } else {
        annots.genes = dummyGenes(cache.matrix.numberOfRows());
    }

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

        annots.annotations = {}
        headers.forEach((x, i) => {
            annots.annotations[x] = parsed.map(y => y[i]);
        });

    } else {
        annots.annotations = null;
    }

    return annots;
}

function loadMatrixMarket(args) {
    var reader = new FileReaderSync();

    let annotation;
    for (var it = 0; it < 1; it++) {
        var formatted = { "format": "MatrixMarket", "files": [] };

        var bufferFun = (f) => reader.readAsArrayBuffer(f);

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

        annotation = getMtxGeneAnnots(formatted.files, cobj);
    }

    return annotation;
}

/**************************
 ****** HDF5 loaders ******
 **************************/

function load10XRaw(files) {
    let annotation = {};
    // In theory, we could support multiple HDF5 buffers.
    var first_file = files[0];
    var tmppath = first_file.name;
    scran.writeFile(tmppath, new Uint8Array(first_file.buffer));

    try {
        // Fetching the gene IDs and names.
        annotation.genes = null;
        let objects = scran.extractHDF5ObjectNames(tmppath);
        if ("features" in objects["matrix"]) {
            let fobjects = objects["matrix"]["features"];
            if ("id" in fobjects && fobjects["id"] === "string dataset") {
                annotation.genes = { id: scran.loadHDF5Dataset(tmppath, "matrix/features/id").contents };
                if ("name" in fobjects && fobjects["name"] === "string dataset") {
                    annotation.genes.names = scran.loadHDF5Dataset(tmppath, "matrix/features/name").contents;
                }
            }
        }

        // TODO: pull out sample IDs from the HDF5 file, if they exist.
        annotation.annotations = null;

    } finally {
        scran.removeFile(tmppath);
    }

    return annotation;
}

function loadH5ADRaw(files) {
    let annotation = {};
    // In theory, we could support multiple HDF5 buffers.
    var first_file = files[0];
    var tmppath = first_file.name;
    scran.writeFile(tmppath, new Uint8Array(first_file.buffer));

    try {
        let objects = scran.extractHDF5ObjectNames(tmppath);

        // Trying to guess the gene names.
        annotation.genes = null;
        if ("var" in objects) {
            let vobjects = objects["var"];
            if (utils.isObject(vobjects)) {
                if ("_index" in vobjects && vobjects["_index"] == "string dataset") {
                    annotation.genes = { "_index": scran.loadHDF5Dataset(tmppath, "var/_index").contents };
                    for (const [key, val] of Object.entries(vobjects)) {
                        if (val === "string dataset" && (key.match(/name/i) || key.match(/symb/i))) {
                            annotation.genes[key] = scran.loadHDF5Dataset(tmppath, `var/${key}`).contents;
                        }
                    }
                }
            }
        }

        // Adding the annotations.
        annotation.annotations = null;
        if ("obs" in objects) {
            let bobjects = objects["obs"];
            annotation.annotations = {};

            if (utils.isObject(bobjects)) {
                // Maybe it has names, maybe not, who knows; let's just add what's there.
                if ("_index" in bobjects && bobjects["_index"] == "string dataset") {
                    annotation.annotations["_index"] = scran.loadHDF5Dataset(tmppath, "obs/_index").contents;
                }

                for (const [key, val] of Object.entries(bobjects)) {
                    if (val === "string dataset" || val === "integer dataset" || val === "float dataset") {
                        let bobj_factors = scran.loadHDF5Dataset(tmppath, `obs/${key}`).contents;

                        if ("__categories" in bobjects && bobjects["__categories"][key] == "string dataset") {
                            let bobj_index = scran.loadHDF5Dataset(tmppath, `obs/__categories/${key}`).contents;
                            annotation.annotations[key] = {
                                "type": "factor",
                                "index": bobj_index,
                                "factor": bobj_factors
                            }
                        } else {
                            annotation.annotations[key] = bobj_factors;
                        }
                    }
                }
            }
        }

    } finally {
        scran.removeFile(tmppath);
    }

    return annotation;
}

function loadHDF5(args, format) {
    let annotation;
    var reader = new FileReaderSync();

    // First pass computes an abbreviated version to quickly check for changes.
    // Second pass does the actual readArrayBuffer.
    for (var it = 0; it < 1; it++) {
        var formatted = { "format": format, "files": [] };

        var bufferFun = (f) => reader.readAsArrayBuffer(f);

        for (const f of args.file) {
            formatted.files.push({ "type": "h5", "name": f.name, "buffer": bufferFun(f) });
        }

        if (format == "10X") {
            annotation = load10XRaw(formatted.files);
        } else {
            annotation = loadH5ADRaw(formatted.files);
        }
    }

    return annotation;
}

function validate_files(datasets) {
    console.log(datasets);

    // possible check if genes is empty in atleast one of them
    let all_valid = true;
    let common_genes = 0;
    for (const f in datasets) {
        if (!datasets[f].genes) {
            all_valid = false;
        }
    }

    if (all_valid) {
        // now perform intersection
        // TODO: choose ids for intersection ?
        let intersection = datasets[Object.keys(datasets)[0]].genes?.id;
        for (const f in datasets) {
            intersection = intersection.filter(function(n) {
                return datasets[f].genes.id.indexOf(n) > -1;
              });
        }

        common_genes = intersection.length;
    }

    if(common_genes <= 0) {
        all_valid = false;
    }

    return {
        "valid": all_valid,
        "common_genes": common_genes
    }
}

/******************************
 ****** Standard exports ******
 ******************************/

export function compute(files) {
    console.log(files);
    let datasets = {}
    for (const f in files) {
        switch (files[f].format) {
            case "mtx":
                datasets[f] = loadMatrixMarket(files[f], fetchGeneTypes);
                break;
            case "hdf5":
            case "tenx":
                datasets[f] = loadHDF5(files[f], "10X");
                break;
            case "h5ad":
                datasets[f] = loadHDF5(files[f], "H5AD");
                break;
            case "kana":
                // do nothing, this is handled by unserialize.
                break;
            default:
                throw "unknown matrix file extension: '" + format + "'";
        }
    }

    return validate_files(datasets);
}