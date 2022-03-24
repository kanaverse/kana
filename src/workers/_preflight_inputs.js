import * as utils from "./_utils.js";
import { H5Reader } from "./_reader_h5.js";
import { H5ADReader } from "./_reader_h5ad.js";
import { MtxReader } from "./_reader_mtx.js";
import * as rutils from "./_reader_utils.js";

function validate_files(datasets) {
    // possible check if genes is empty in atleast one of them
    let all_valid = true;
    let common_genes = 0;
    let fkeys = Object.keys(datasets);
    let annotation_names = [];
    let error_messages = []

    // do all datasets contain genes ?
    for (const f in datasets) {
        if (!datasets[f].genes) {
            all_valid = false;
            if (fkeys.length > 1) {
                error_messages.push("all imported datasets must contain genes for integration/batch correction");
                break;
            }
        }

        if (datasets[f].annotations) {
            annotation_names.push(Object.keys(datasets[f].annotations));
        } else {
            annotation_names.push(null);
        }
    }

    // if all files contain genes, run checks to see if they have common genes;
    // we don't do this if the earlier step already failed
    let result;
    if (all_valid) {
        result = rutils.getCommonGenes(datasets);
        common_genes = result?.num_common_genes;

        // if there are no common genes
        if (common_genes == 0) {
            all_valid = false;
            error_messages.push("no common genes across datasets");
        }

        if (fkeys.length !== 1) {
            // also check if the assumptions in guessing the best column to use for genes 
            // is consistent across datasets
            // e.g. dataset1 is human and dataset2 cannot be mouse
            // TODO: not sure if this is useful anymore 
            // I guess the common genes would've failed in this case
            if (!result?.best_fields) {
                all_valid = false;
                error_messages.push("we cannot guess the best set of feature columns to use for integrating datasets");
            }
        }
    }

    // if there's only a single dataset; none of the above holds
    // the ui takes care of batch column selection
    if (fkeys.length == 1) {
        all_valid = true;
    }

    return {
        "valid": all_valid,
        "common_genes": common_genes,
        "annotations": annotation_names,
        "errors": error_messages,
        "best_genes": result.best_fields
    }
}

/******************************
 ****** Standard exports ******
 ******************************/

export function compute(files) {
    let datasets = {}
    for (const f in files) {
        datasets[f] = {};
        let obj, formatted;
        switch (files[f].format) {
            case "mtx":
                obj = new MtxReader(files[f]);
                break;
            case "hdf5":
            case "tenx":
                obj = new H5Reader(files[f]);
                break;
            case "h5ad":
                obj = new H5ADReader(files[f]);
                break;
            case "kana":
                // do nothing, this is handled by unserialize.
                break;
            default:
                throw "unknown matrix file extension: '" + format + "'";
        }

        formatted = obj.formatFiles();
        obj.loadRaw(formatted.files, false);
        // just in case remove matrix at this step
        utils.freeCache(obj.cache.matrix);
        datasets[f] = obj.getDataset();
    }

    return validate_files(datasets);
}