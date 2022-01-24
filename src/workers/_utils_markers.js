export function serializeGroupStats(obj, group) {
    return {
        "means": obj.means(group),
        "detected": obj.detected(group),
        "lfc": {
            "min": obj.lfc(group, { summary: 0 }),
            "mean": obj.lfc(group, { summary: 1 }),
            "min-rank": obj.lfc(group, { summary: 4 })
        },
        "delta_detected": {
            "min": obj.deltaDetected(group, { summary: 0 }),
            "mean": obj.deltaDetected(group, { summary: 1 }),
            "min-rank": obj.deltaDetected(group, { summary: 4 })
        },
        "cohen": {
            "min": obj.cohen(group, { summary: 0 }),
            "mean": obj.cohen(group, { summary: 1 }),
            "min-rank": obj.cohen(group, { summary: 4 })
        },
        "auc": {
            "min": obj.auc(group, { summary: 0 }),
            "mean": obj.auc(group, { summary: 1 }),
            "min-rank": obj.auc(group, { summary: 4 })
        }
    };
}

/*
 * Helper function to retrieve marker statistics for plotting.
 * This is used both for cluster-specific markers as well as the
 * DE genes that are computed for a custom selection vs the rest.
 */
export function fetchGroupResults(results, reloaded, rank_type, group) {
    if (!rank_type || rank_type === undefined) {
        rank_type = "cohen-min-rank";
    }
    var use_reloaded = (reloaded !== undefined);

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
                effect = "delta_detected";
            } else {
                throw "unknown rank type '" + rank_type + "'";
            }
      
            ranking = reloaded[group][effect][summary];
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
        var current = reloaded[group];
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
