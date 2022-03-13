import * as scran from "scran.js";

const summaries = { "min": 0, "mean": 1, "min-rank": 4 };

export function serializeGroupStats(handle, obj, group) {
    let ihandle = rhandle.createGroup(String(group));
    let not_reloaded = (obj instanceof scran.ScoreMarkersResults);

    for (const x of [ "means", "detected" ]) {
        let y;
        if (not_reloaded) {
            y = obj[x](group, { copy: "view" });
        } else {
            y = obj[group][x];
        }
        let dhandle = ihandle.createDataSet(x, "Float64", [y.length]);
        dhandle.write(y);
    }

    for (const i of [ "lfc", "delta-detected", "auc", "cohen" ]) {
        let rhandle = ihandle.createGroup(i);
        let i0 = i;
        if (i == "delta_detected") {
            i0 = "deltaDetected";
        }

        for (const [j, k] of Object.entries(summaries)) {
            let y;
            if (not_reloaded) {
                y = obj[i0](group, { summary: k });
            } else {
                y = obj[group][i][j];
            }
            let dhandle = rhandle.createDataSet(j, "Float64", [y.length]);
            dhandle.write(y);
        }
    }
}

export function unserializeGroupStats(handle) {
    let output = {};
    for (const x of [ "means", "detected" ]) {
        output[x] = handle.openDataset(x, { load: true }).values;
    }

    for (const i of [ "lfc", "delta-detected", "auc", "cohen" ]) {
        let rhandle = ihandle.openGroup(i);
        let current = {};
        for (const j of Object.keys(summaries)) {
            current[j] = rhandle.openDataSet(j, { load: true }).values;
        }
        output[i] = current;
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
    var use_reloaded = (results instanceof scran.ScoreMarkersResults);

    var ordering;
    {
        // Choosing the ranking statistic. Do NOT do any Wasm allocations
        // until 'ranking' is fully consumed!
        let ranking;
        let increasing = false;
      
        if (use_reloaded) {
            let summary = "mean";
            if (rank_type.match(/-min$/)) {
                summary = "min";
            } else if (rank_type.match(/-min-rank$/)) {
                increasing = true;
                summary = "min-rank";
            }
      
            let effect;
            if (rank_type.match(/^cohen-/)) {
                effect = "cohen";
            } else if (rank_type.match(/^auc-/)) {
                effect = "auc";
            } else if (rank_type.match(/^lfc-/)) {
                effect = "lfc";
            } else if (rank_type.match(/^delta-d-/)) {
                effect = "delta-detected";
            } else {
                throw "unknown rank type '" + rank_type + "'";
            }
      
            ranking = results[group][effect][summary];
        } else {
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
  
    var stat_detected, stat_mean, stat_lfc, stat_delta_d;
    if (use_reloaded) {
        var current = results[group];
        stat_mean = reorder(current.means);
        stat_detected = reorder(current.detected);
        stat_lfc = reorder(current.lfc["mean"]);
        stat_delta_d = reorder(current.delta_detected["mean"]);
    } else {
        stat_detected = reorder(results.detected(group, { copy: false }));
        stat_mean = reorder(results.means(group, { copy: false }));
        stat_lfc = reorder(results.lfc(group, { summary: 1, copy: false }));
        stat_delta_d = reorder(results.deltaDetected(group, { summary: 1, copy: false }));
    }
  
    return {
        "ordering": ordering,
        "means": stat_mean,
        "detected": stat_detected,
        "lfc": stat_lfc,
        "delta_detected": stat_delta_d
    };
}

