import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as rutils from "./_reader_utils.js";


export class H5Reader {
    constructor(files) {
        this.files = files;
        this.cache = {};

        // this.loadFile(files, files.format);
    }

    getDataset() {
        return this.cache;
    }

    formatFiles(bufferFun) {
        if (!bufferFun) {
            var reader = new FileReaderSync();
            bufferFun = (f) => reader.readAsArrayBuffer(f);
        }

        var formatted = { "format": "10X", "files": [] };

        for (const f of this.files.file) {
            formatted.files.push({ "type": "h5", "name": f.name, "buffer": bufferFun(f) });
        }

        return formatted;
    }

    loadFile() {
        var reader = new FileReaderSync();

        var bufferFun = (f) => reader.readAsArrayBuffer(f);

        let formatted = this.formatFiles(bufferFun);

        this.parameters = formatted;
        return this.loadRaw(formatted.files);
    }

    extractFeatures(path) {
        let genes;
        let objects = scran.extractHDF5ObjectNames(path);
        if ("features" in objects["matrix"]) {
            let fobjects = objects["matrix"]["features"];
            if ("id" in fobjects && fobjects["id"] === "string dataset") {
                genes = { id: scran.loadHDF5Dataset(path, "matrix/features/id").contents };
                if ("name" in fobjects && fobjects["name"] === "string dataset") {
                    genes.names = scran.loadHDF5Dataset(path, "matrix/features/name").contents;
                }
            }
        }

        return genes;
    }

    extractAnnotations(path) {
        // TODO: pull out sample IDs from the HDF5 file, if they exist.
        return null;
    }

    loadRaw(files, read_matrix = true) {
        utils.freeCache(this.cache.matrix);

        // In theory, we could support multiple HDF5 buffers.
        var first_file = files[0];
        var tmppath = first_file.name;
        scran.writeFile(tmppath, new Uint8Array(first_file.buffer));

        try {
            if (read_matrix) this.cache.matrix = scran.initializeSparseMatrixFromHDF5(tmppath, "matrix");

            // Fetching the gene IDs and names.
            this.cache.genes = this.extractFeatures(tmppath);

            this.cache.annotations = this.extractAnnotations(tmppath);

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