import * as utils from "./_utils.js";
import * as iutils from "./_utils_inputs.js";

function validate_files(datasets) {
    // possible check if genes is empty in atleast one of them
    let all_valid = true;
    let common_genes = 0;
    let fkeys = Object.keys(datasets);
    let annotation_names = [];
    let error_messages = []

    // do all datasets contain genes ?
    for (const [key, val] of Object.entries(datasets)) {
        if (!("genes" in val)) {
            all_valid = false;
            if (fkeys.length > 1) {
                error_messages.push("all imported datasets must contain genes for integration/batch correction");
                break;
            }
        }
        annotation_names.push(val.annotations);
    }

    // if all files contain genes, run checks to see if they have common genes;
    // we don't do this if the earlier step already failed
    let result;
    if (all_valid) {
        result = iutils.getCommonGenes(datasets);
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
    let datasets = {};

    for (const [key, val] of Object.entries(files)) {
        let namespace = iutils.chooseNamespace(val.format);
        let formatted = namespace.formatFiles(val, f => (new FileReaderSync()).readAsArrayBuffer(f));
        datasets[key] = namespace.loadPreflight(formatted);
    }

    return validate_files(datasets);
}
