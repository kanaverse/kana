import * as d3 from "d3-dsv";
import * as pako from "pako";
import * as scran from "scran.js";


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

export function guessBestFeatures(dataset) {
    let score, bestScore = -100000, best;
    for (const f in dataset.genes) {
        console.log(f);
        let fscore = scran.guessFeatures(dataset.genes[f]);
        console.log(fscore);

        if (fscore?.confidence > bestScore) {
            bestScore = fscore?.confidence;
            best = f;
        }

        score = fscore;
    }

    return {best, score};
}

export function getCommonGenes(datasets) {
    // now perform intersection
    let num_common_genes = 0;
    let keys = Object.keys(datasets)
    let d0score = guessBestFeatures(datasets[keys[0]]);
    let intersection = datasets[keys[0]].genes?.[d0score.best];

    let best_assumptions = {};
    best_assumptions[keys[0]] = d0score.score;

    if (intersection) {
        for (var i = 1; i < Object.keys(datasets).length; i++) {
            d0score = guessBestFeatures(datasets[keys[i]]);
            best_assumptions[keys[i]] = d0score.score;
            intersection = intersection.filter(function (n) {
                return datasets[keys[i]]?.genes?.[d0score.best].indexOf(n) > -1;
            });
        }

        num_common_genes = intersection.length;
    }

    return { num_common_genes, intersection, best_assumptions };
}