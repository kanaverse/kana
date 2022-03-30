import * as d3 from "d3-dsv";
import * as pako from "pako";
import * as scran from "scran.js";
import * as utils from "./_utils.js";

export function formatFiles(args, bufferFun) {
    var formatted = { "format": "MatrixMarket", "files": [] };

    if (args.mtx.length != 1) {
        throw new Error("expected exactly one 'mtx' file");
    }
    var mtx_file = args.mtx[0];
    formatted.files.push({ "type": "mtx", "name": mtx_file.name, "buffer": bufferFun(mtx_file) });

    if ("gene" in args) {
        if (args.gene.length !== 1) {
            throw "expected no more than one gene file";
        }
        var genes_file = args.gene[0];
        formatted.files.push({ "type": "genes", "name": genes_file.name, "buffer": bufferFun(genes_file) });
    }

    if ("barcode" in args) {
        if (args.barcode.length !== 1) {
            throw "expected no more than one cell annotation file";
        }
        var annotations_file = args.barcode[0];
        formatted.files.push({ "type": "annotations", "name": annotations_file.name, "buffer": bufferFun(annotations_file) });
    }

    return formatted;
}

export function extractFeatures(files, { numberOfRows = null } = {}) {
    let genes = null;
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

function extractAnnotations(files, { numberOfColumns = null, namesOnly = false } = {}) {
    let annotations = null;
    const annotations_file = files.filter(x => x.type == "annotations");

    if (annotations_file.length == 1) {
        const annotation_file = annotations_file[0]
        const content = new Uint8Array(annotation_file.buffer);
        let parsed = rutils.readDSVFromBuffer(content, annotation_file);

        // Check if a header is present or not
        let headerFlag = true;
        if (numberOfColumns !== null) {
            let diff = numberOfColumns - parsed.length;
            if (diff === 0) {
                headerFlag = false;
            } else if (diff !== -1) {
                throw "number of annotations rows is not equal to the number of cells in '" + annotation_file.name + "'";
            }
        }

        if (namesOnly) {
            return parsed[0];
        }

        let headers = [];
        if (headerFlag) {
            headers = parsed.shift();
        } else {
            parsed[0].forEach((x, i) => {
                headers.push(`Column_${i + 1}`);
            })
        }

        annotations = {}
        headers.forEach((x, i) => {
            annotations[x] = parsed.map(y => y[i]);
        });
    }

    return annotations;
}

export function loadPreflight(input) {
    return {
        genes: extractFeatures(input.files),
        annotations: extractAnnotationNames(input.files, { namesOnly: true })
    };
}

export function loadData(input) {
    var mtx_files = input.files.filter(x => x.type == "mtx");

    var first_mtx = mtx_files[0];
    var contents = new Uint8Array(first_mtx.buffer);
    var ext = first_mtx.name.split('.').pop();
    var is_compressed = (ext == "gz");

    let output = {};
    try {
        output.matrix = scran.initializeSparseMatrixFromMatrixMarketBuffer(contents, { "compressed": is_compressed });
        output.genes = extractFeatures(input.files, { numberOfRows: output.matrix.numberOfRows() });
        output.annotations = extractAnnotations(input.files, { numberOfColumns: output.matrix.numberOfColumns() });
    } catch (e) {
        utils.freeCache(output.matrix);
        throw e;
    }

    return output;
}
