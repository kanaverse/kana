import * as scran from "scran.js";

export const summaries2int = { "min": 0, "mean": 1, "min_rank": 4 };
export const int2summaries = { 0: "min", 1: "mean", 4: "min_rank" };

export function serializeGroupStats(handle, obj, group, { no_summaries = false } = {}) {
    let ihandle = handle.createGroup(String(group));

    for (const x of [ "means", "detected" ]) {
        let y= obj[x](group, { copy: "view" });
        ihandle.writeDataSet(x, "Float64", null, y);
    }

    for (const i of [ "lfc", "delta_detected", "auc", "cohen" ]) {
        let i0 = i;
        if (i == "delta_detected") {
            i0 = "deltaDetected";
        }

        let extractor = (index) => obj[i0](group, { summary: index, copy: "view" });
        if (no_summaries) {
            let y = extractor(summaries2int["mean"]);
            ihandle.writeDataSet(i, "Float64", null, y);
        } else {
            let curhandle = ihandle.createGroup(i);
            for (const [j, k] of Object.entries(summaries2int)) {
                let y = extractor(k);
                curhandle.writeDataSet(j, "Float64", null, y);
            }
        }
    }
}

export function unserializeGroupStats(handle, permuter, { no_summaries = false } = {}) {
    let output = {};
    for (const x of [ "means", "detected" ]) {
        output[x] = handle.open(x, { load: true }).values;
        permuter(output[x]);
    }

    for (const i of [ "lfc", "delta_detected", "auc", "cohen" ]) {
        if (no_summaries) {
            output[i] = handle.open(i, { load: true }).values;
        } else {
            let rhandle = handle.open(i);
            let current = {};
            for (const j of Object.keys(summaries2int)) {
                current[j] = rhandle.open(j, { load: true }).values;
                permuter(current[j]);
            }
            output[i] = current;
        }
    }

    return output;
}

/*
 * Helper function to retrieve marker statistics for plotting.
 * This is used both for cluster-specific markers as well as the
 * DE genes that are computed for a custom selection vs the rest.
 */
export function fetchGroupResults(results, rank_type, group) {
    if (!rank_type || rank_type === undefined) {
        rank_type = "cohen-min-rank";
    }

    var ordering;
    {
        // Choosing the ranking statistic. Do NOT do any Wasm allocations
        // until 'ranking' is fully consumed!
        let ranking;
        let increasing = false;
      
        let index = 1;
        if (rank_type.match(/-min$/)) {
            index = 0;
        } else if (rank_type.match(/-min-rank$/)) {
            increasing = true;
            index = 4;
        }

        if (rank_type.match(/^cohen-/)) {
            ranking = results.cohen(group, { summary: index, copy: false });
        } else if (rank_type.match(/^auc-/)) {
            ranking = results.auc(group, { summary: index, copy: false });
        } else if (rank_type.match(/^lfc-/)) {
            ranking = results.lfc(group, { summary: index, copy: false });
        } else if (rank_type.match(/^delta-d-/)) {
            ranking = results.deltaDetected(group, { summary: index, copy: false });
        } else {
            throw "unknown rank type '" + rank_type + "'";
        }
  
        // Computing the ordering based on the ranking statistic.
        ordering = new Int32Array(ranking.length);
        for (var i = 0; i < ordering.length; i++) {
            ordering[i] = i;
        }
        if (increasing) {
            ordering.sort((f, s) => (ranking[f] - ranking[s]));
        } else {
            ordering.sort((f, s) => (ranking[s] - ranking[f]));
        }
    }
  
    // Apply that ordering to each statistic of interest.
    var reorder = function(stats) {
        var thing = new Float64Array(stats.length);
        for (var i = 0; i < ordering.length; i++) {
            thing[i] = stats[ordering[i]];
        }
        return thing;
    };
  
    var stat_detected = reorder(results.detected(group, { copy: false }));
    var stat_mean = reorder(results.means(group, { copy: false }));
    var stat_lfc = reorder(results.lfc(group, { summary: 1, copy: false }));
    var stat_delta_d = reorder(results.deltaDetected(group, { summary: 1, copy: false }));

    return {
        "ordering": ordering,
        "means": stat_mean,
        "detected": stat_detected,
        "lfc": stat_lfc,
        "delta_detected": stat_delta_d
    };
}

