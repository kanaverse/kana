import * as scran from "scran.js";
import * as utils from "./_utils.js";
import { H5Reader } from "./_reader_h5.js";
import { H5ADReader } from "./_reader_h5ad.js";
import { MtxReader } from "./_reader_mtx.js";

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
            intersection = intersection.filter(function (n) {
                return datasets[f].genes.id.indexOf(n) > -1;
            });
        }

        common_genes = intersection.length;
    }

    if (common_genes <= 0) {
        all_valid = false;
    }

    if (Object.keys(datasets).length == 1) {
        all_valid = true;
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
        datasets[f] = {};
        let obj, formatted;
        switch (files[f].format) {
            case "mtx":
                obj = new MtxReader(files[f]);
                formatted = obj.formatFiles();
                // datasets[f].genes = mobj.extractFeatures(formatted);
                // datasets[f].annotations = mobj.extractAnnotations(formatted);
                obj.loadRaw(formatted.files);
                utils.freeCache(obj.cache.matrix);
                datasets[f] = obj.cache;
                break;
            case "hdf5":
            case "tenx":
                obj = new H5Reader(files[f]);
                formatted = obj.formatFiles();
                obj.loadRaw(formatted.files);
                utils.freeCache(obj.cache.matrix);
                datasets[f] = obj.cache;
                // datasets[f].genes = obj.extractFeatures(formatted);
                // datasets[f].annotations = obj.extractAnnotations(formatted);
                break;
            case "h5ad":
                obj = new H5ADReader(files[f]);
                formatted = obj.formatFiles();
                obj.loadRaw(formatted.files);
                utils.freeCache(obj.cache.matrix);
                datasets[f] = obj.cache;
                // datasets[f].genes = obj.extractFeatures(formatted);
                // datasets[f].annotations = obj.extractAnnotations(formatted);
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