import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as rutils from "./_reader_utils.js";
import { H5Reader } from "./_reader_h5.js";

export class H5ADReader extends H5Reader{
    constructor(files) {
        super(files);
    }

    extractFeatures(objects, path) {
        let genes;
        if ("var" in objects) {
            let vobjects = objects["var"];
            if (utils.isObject(vobjects)) {
                if ("_index" in vobjects && vobjects["_index"] == "string dataset") {
                    genes = { "_index": scran.loadHDF5Dataset(path, "var/_index").contents };
                    for (const [key, val] of Object.entries(vobjects)) {
                        if (val === "string dataset" && (key.match(/name/i) || key.match(/symb/i))) {
                            genes[key] = scran.loadHDF5Dataset(path, `var/${key}`).contents;
                        }
                    }
                }
            }
        }

        return genes;
    }

    extractAnnotations(objects, path) {
        let annotations;
        if ("obs" in objects) {
            let bobjects = objects["obs"];
            annotations = {};

            if (utils.isObject(bobjects)) {
                // Maybe it has names, maybe not, who knows; let's just add what's there.
                if ("_index" in bobjects && bobjects["_index"] == "string dataset") {
                    annotations["_index"] = scran.loadHDF5Dataset(path, "obs/_index").contents;
                }

                for (const [key, val] of Object.entries(bobjects)) {
                    if (val === "string dataset" || val === "integer dataset" || val === "float dataset") {
                        let bobj_factors = scran.loadHDF5Dataset(path, `obs/${key}`).contents;

                        if ("__categories" in bobjects && bobjects["__categories"][key] == "string dataset") {
                            let bobj_index = scran.loadHDF5Dataset(path, `obs/__categories/${key}`).contents;
                            annotations[key] = {
                                "type": "factor",
                                "index": bobj_index,
                                "factor": bobj_factors
                            }
                        } else {
                            annotations[key] = bobj_factors;
                        }
                    }
                }
            }
        }

        return annotations;
    }

    formatFiles(bufferFun) {
        if (!bufferFun) {
            var reader = new FileReaderSync();
            bufferFun = (f) => reader.readAsArrayBuffer(f);
        }

        var formatted = { "format": "H5AD", "files": [] };

        for (const f of this.files.file) {
            formatted.files.push({ "type": "h5", "name": f.name, "buffer": bufferFun(f) });
        }

        return formatted;
    }

    loadRaw(files, read_matrix=true) {
        utils.freeCache(this.cache.matrix);

        // In theory, we could support multiple HDF5 buffers.
        var first_file = files[0];
        var tmppath = first_file.name;
        scran.writeFile(tmppath, new Uint8Array(first_file.buffer));

        try {
            if (read_matrix) this.cache.matrix = scran.initializeSparseMatrixFromHDF5(tmppath, "X");
            let objects = scran.extractHDF5ObjectNames(tmppath);

            // Trying to guess the gene names.
            this.cache.genes = this.extractFeatures(objects, tmppath);

            // Adding the annotations.
            this.cache.annotations = this.extractAnnotations(objects, tmppath);

        } finally {
            scran.removeFile(tmppath);
        }

        if (this.cache.genes === null) {
            this.cache.genes = rutils.dummyGenes(this.cache.matrix.numberOfRows());
        }
        
        if (read_matrix) scran.permuteFeatures(this.cache.matrix, this.cache.genes);

        return this.cache;
    }
}