import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as rutils from "./_reader_utils.js";


export class MtxReader {
    constructor(files) {
        this.files = files;

        this.cache = {};
        this.parameters = {};
        this.abbreviated = {};

        this.changed = false;

        // this.loadFile(files);
    }

    getDataset() {
        return this.cache;
    }

    extractFeatures(files) {
        let genes;
        const genes_file = files.filter(x => x.type == "genes");
        if (genes_file.length == 1) {
            const gene_file = genes_file[0]
            const content = new Uint8Array(gene_file.buffer);

            let parsed = rutils.readDSVFromBuffer(content, gene_file);

            if (parsed.length != this.cache.matrix.numberOfRows()) {
                throw "number of matrix rows is not equal to the number of genes in '" + gene_file.name + "'";
            }

            var ids = [], symb = [];
            parsed.forEach(x => {
                ids.push(x[0]);
                symb.push(x[1]);
            });

            genes = { "id": ids, "symbol": symb };
        }

        return genes;
    }

    extractAnnotations(files) {
        let annotations;
        const annotations_file = files.filter(x => x.type == "annotations");
        if (annotations_file.length == 1) {
            const annotation_file = annotations_file[0]
            const content = new Uint8Array(annotation_file.buffer);

            let parsed = rutils.readDSVFromBuffer(content, annotation_file);

            let diff = this.cache.matrix.numberOfColumns() - parsed.length;
            // check if a header is present or not
            let headerFlag = false;
            if (diff === 0) {
                headerFlag = false;
            } else if (diff === -1) {
                headerFlag = true;
            } else {
                throw "number of annotations rows is not equal to the number of cells in '" + annotation_file.name + "'";
            }

            let headers = [];
            if (headerFlag) {
                headers = parsed.shift();
            } else {
                parsed[0].forEach((x, i) => {
                    headers.push(`Column_${i + 1}`);
                })
            }

            this.cache.annotations = {}
            headers.forEach((x, i) => {
                cache.annotations[x] = parsed.map(y => y[i]);
            });

        }

        return annotations;

    }

    loadRaw(files, read_matrix = true) {
        utils.freeCache(this.cache.matrix);

        // In theory, this section may support multiple files (e.g., for multiple samples).
        var mtx_files = files.filter(x => x.type == "mtx");
        var first_mtx = mtx_files[0];
        var contents = new Uint8Array(first_mtx.buffer);
        var ext = first_mtx.name.split('.').pop();
        var is_compressed = (ext == "gz");
        if (read_matrix) this.cache.matrix = scran.initializeSparseMatrixFromMatrixMarketBuffer(contents, { "compressed": is_compressed });


        // extract features
        this.cache.genes = this.extractFeatures(files);

        if (read_matrix) {
            if (!this.cache.genes) {
                this.cache.genes = rutils.dummyGenes(this.cache.matrix.numberOfRows());
            }

            scran.permuteFeatures(this.cache.matrix, this.cache.genes);
        }

        // extract annotations
        this.cache.annotations = this.extractAnnotations(files);

        return;
    }

    formatFiles(bufferFun) {
        if (!bufferFun) {
            var reader = new FileReaderSync();
            bufferFun = (f) => reader.readAsArrayBuffer(f);
        }

        var formatted = { "format": "MatrixMarket", "files": [] };

        for (const f of this.files.mtx) {
            formatted.files.push({ "type": "mtx", "name": f.name, "buffer": bufferFun(f) });
        }

        if (this.files.gene && Array.isArray(this.files.gene)) {
            if (this.files.gene.length !== 1) {
                throw "expected no more than one gene file";
            }
            var genes_file = this.files.gene[0];
            formatted.files.push({ "type": "genes", "name": genes_file.name, "buffer": bufferFun(genes_file) });
        }

        if (this.files.barcode && Array.isArray(this.files.barcode)) {
            if (this.files.barcode.length !== 1) {
                throw "expected no more than one cell annotation file";
            }
            var annotations_file = this.files.barcode[0];
            formatted.files.push({ "type": "annotations", "name": annotations_file.name, "buffer": bufferFun(annotations_file) });
        }

        return formatted;
    }

    loadFile() {
        var reader = new FileReaderSync();

        // First pass computes an abbreviated version to quickly check for changes.
        // Second pass does the actual readArrayBuffer.
        for (var it = 0; it < 2; it++) {

            var bufferFun;
            if (it == 0) {
                bufferFun = (f) => f.size;
            } else {
                bufferFun = (f) => reader.readAsArrayBuffer(f);
            }

            let formatted = this.formatFiles(bufferFun);

            if (it == 0) {
                if (!utils.changedParameters(this.abbreviated, formatted)) {
                    this.changed = false;
                    return;
                } else {
                    this.abbreviated = formatted;
                    this.changed = true;
                }
            } else {
                this.parameters = formatted;
                this.loadRaw(formatted.files);
            }
        }

        return;
    }
}