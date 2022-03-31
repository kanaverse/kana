import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as rutils from "./_utils_reader.js";

export function formatFiles(args, bufferFun) {
    var formatted = { "format": "10X", "files": [] };

    if (args.file.length != 1) {
        throw new Error("expected exactly one 'h5' file");
    }

    let h5file = args.file[0];
    formatted.files.push({ "type": "h5", "name": h5file.name, "buffer": bufferFun(h5file) });
    return formatted;
}

function extract_features(handle) {
    let genes = null;

    if (!("matrix" in handle.children) || handle.children["matrix"] != "Group") {
        throw new Error("expected a 'matrix' group at the top level of the file");
    }

    let mhandle = handle.open("matrix");
    if ("features" in mhandle.children && mhandle.children["features"] == "Group") {
        let fhandle = mhandle.open("features");

        let ids = rutils.extractHDF5Strings(fhandle, "id");
        if (ids !== null) {
            genes = { id: ids };
            let names = rutils.extractHDF5Strings(fhandle, "name");
            if (names !== null) {
                genes.name = names;
            }
        }
    }

    return genes;
}

export function loadPreflight(input) {
    let output = {};

    const tmppath = rutils.generateRandomName("10x_", ".h5");
    scran.writeFile(tmppath, new Uint8Array(input.files[0].buffer));
    try {
        let handle = new scran.H5File(tmppath);
        output.genes = extract_features(handle);
        output.annotations = null;
        // TODO: try pull out sample IDs from the 10X file, if they exist?
    } finally {
        scran.removeFile(tmppath);
    }

    return output;
}

export function loadData(input) {
    let output = {};

    const tmppath = rutils.generateRandomName("10x_", ".h5");
    scran.writeFile(tmppath, new Uint8Array(input.files[0].buffer));
    try {
        output.matrix = scran.initializeSparseMatrixFromHDF5(tmppath, "matrix");
        let handle = new scran.H5File(tmppath);
        output.genes = extract_features(handle);
        output.annotations = null;
    } catch (e) {
        utils.freeCache(output.matrix);
        throw e;
    } finally {
        scran.removeFile(tmppath);
    }

    return output;
}
