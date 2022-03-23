import * as d3 from "d3-dsv";
import * as pako from "pako";


export function dummyGenes(numberOfRows) {
    let genes = []
    for (let i = 0; i < numberOfRows; i++) {
        genes.push(`Gene ${i + 1}`);
    }
    return { "id": genes };
}

export function readDSVFromBuffer(content, fname, delim = "\t") {
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

export function fetchGeneTypes(obj) {
    if (!("gene_types" in obj.cache)) {
        var gene_info_type = {};
        var gene_info = obj.cache.genes;
        for (const [key, val] of Object.entries(gene_info)) {
            gene_info_type[key] = scran.guessFeatures(val);
        }
        cache.gene_types = gene_info_type;
    }
    return cache.gene_types;
}