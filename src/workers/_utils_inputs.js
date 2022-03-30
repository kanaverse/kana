import * as scran from "scran.js";
import * as TENxReader from "./_reader_10x.js";
import * as H5ADReader from "./_reader_h5ad.js";
import * as MtxReader from "./_reader_mtx.js";

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
    let scores = {}, fields = {};
    for (const f in dataset.genes) {
        let fscore = scran.guessFeatures(dataset.genes[f]);

        if ((!scores[`${fscore.type}-${fscore.species}`]) ||
            fscore.confidence > scores[`${fscore.type}-${fscore.species}`]) {
            scores[`${fscore.type}-${fscore.species}`] = fscore.confidence;
            fields[`${fscore.type}-${fscore.species}`] = f;
        }
    }

    return { scores, fields };
}

export function getCommonGenes(datasets) {
    // now perform intersection
    let num_common_genes = 0;
    let keys = Object.keys(datasets);

    let scores = {
        "symbol-mouse": [],
        "symbol-human": [],
        "ensembl-mouse": [],
        "ensembl-human": [],
    };

    let fields = JSON.parse(JSON.stringify(scores));

    for (let j = 0; j < keys.length; j++) {
        let fscores = guessBestFeatures(datasets[keys[j]]);

        for (const i in fscores.fields) {
            fields[i].push(fscores.fields[i]);
        }

        for (const i in fscores.scores) {
            scores[i].push(fscores.scores[i]);
        }
    }

    let multiplier = -1000;
    let bscore;

    for (const i in scores) {
        if (scores[i].length == keys.length) {
            let nscore = scores[i].reduce((a, b) => a * b);
            if (nscore > multiplier) {
                multiplier = nscore;
                bscore = i;
            }
        }
    }

    let intersection;
    if (bscore) {
        intersection = datasets[keys[0]].genes[fields[bscore][0]];
        for (var i = 1; i < Object.keys(datasets).length; i++) {
            let dset = new Set(datasets[keys[i]].genes[fields[bscore][i]]);
            intersection = intersection.filter((n) => {
                return dset.has(n);
            });
        }
        num_common_genes = intersection.length;
    }

    return {
        "num_common_genes": num_common_genes,
        "intersection": intersection,
        "best_fields": bscore ? fields[bscore] : null
    };
}

export function chooseNamespace(format) {
    let namespace;
    switch (format) {
        case "mtx":
        case "MatrixMarket":
            namespace = MtxReader;
            break;
        case "tenx":
        case "hdf5":
        case "10X":
            namespace = TENxReader;
            break;
        case "h5ad":
        case "H5AD":
            namespace = H5ADReader;
            break;
        default:
            throw "unknown matrix file extension: '" + format + "'";
    }
    return namespace;
}
