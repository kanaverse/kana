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
    let scores = {}, fields = {};
    for (const f in dataset.genes) {
        let fscore = scran.guessFeatures(dataset.genes[f]);

        if ((!scores[`${fscore?.type}-${fscore?.species}`]) ||
            fscore?.confidence > scores[`${fscore?.type}-${fscore?.species}`]) {
            scores[`${fscore?.type}-${fscore?.species}`] = fscore?.confidence;
            fields[`${fscore?.type}-${fscore?.species}`] = f;
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

    for (var i = 0; i < keys.length; i++) {
        let fscores = guessBestFeatures(datasets[keys[i]]);
        console.log(fscores);

        for (const i in fscores.fields) {
            fields[i].push(fscores.fields[i]);
        }

        for (const i in fscores.scores) {
            scores[i].push(fscores.scores[i]);
        }
    }

    console.log(fields, scores);

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

    console.log(multiplier, bscore);
    let intersection;
    if (bscore) {
        intersection = datasets[keys[0]].genes?.[fields[bscore][0]];
        for (var i = 1; i < Object.keys(datasets).length; i++) {
            intersection = intersection.filter(function (n) {
                return datasets[keys[i]]?.genes?.[fields[bscore][i]].indexOf(n) > -1;
            });
        }
        num_common_genes =intersection.length;
    }

    return { num_common_genes, intersection, best_fields: bscore ? fields[bscore]: null };
}