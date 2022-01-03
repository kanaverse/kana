const scran_utils_markers = {};

/*
 * Helper function to retrieve marker statistics for plotting.
 * This is used both for cluster-specific markers as well as the
 * DE genes that are computed for a custom selection vs the rest.
 */
scran_utils_markers.formatMarkerStats = function(wasm, results, rank_type, cluster) {
  if (!rank_type || rank_type === undefined) {
      rank_type = "cohen-min-rank";
  }

  // Choosing the ranking statistic. Do NOT do any Wasm allocations
  // until 'ranking' is fully consumed!
  var index = 1;
  var increasing = false;
  if (rank_type.match(/-min$/)) {
      index = 0;
  } else if (rank_type.match(/-min-rank$/)) {
      increasing = true;
      index = 4;
  }

  var ranking = null;
  if (rank_type.match(/^cohen-/)) {
      ranking = results.cohen(cluster, index);
  } else if (rank_type.match(/^auc-/)) {
      ranking = results.auc(cluster, index);
  } else if (rank_type.match(/^lfc-/)) {
      ranking = results.lfc(cluster, index);
  } else if (rank_type.match(/^delta-d-/)) {
      ranking = results.delta_detected(cluster, index);
  }

  // Computing the ordering based on the ranking statistic.
  var ordering = new Int32Array(ranking.length);
  for (var i = 0; i < ordering.length; i++) {
      ordering[i] = i;
  }
  if (increasing) {
      ordering.sort((f, s) => (ranking[f] - ranking[s]));
  } else {
      ordering.sort((f, s) => (ranking[s] - ranking[f]));
  }

  // Apply that ordering to each statistic of interest.
  var reorder = function(stats) {
      var thing = new Float64Array(stats.length);
      for (var i = 0; i < ordering.length; i++) {
          thing[i] = stats[ordering[i]];
      }
      return thing;
  };

  var stat_detected = reorder(results.detected(cluster, 0));
  var stat_mean = reorder(results.means(cluster, 0));
  var stat_lfc = reorder(results.lfc(cluster, 1));
  var stat_delta_d = reorder(results.delta_detected(cluster, 1));

  // Getting some names, bruh.
  if (!utils.cached.normalization.genes) {
    var mat = fetchNormalizedMatrix();
    var perm = new WasmBuffer(wasm, mat.nrow(), "Int32Array");
    try {
      mat.permutation(perm.ptr);
      utils.cached.normalization.genes = perm.array().slice();
    } finally {
      perm.free();
    }
  }

  let gene_indices = utils.cached.normalization.genes;
  let genes = [];
  for (let i = 0; i < gene_indices.length; i++) {
    var o = ordering[i];
    genes.push(utils.cached.inputs.genes[gene_indices[o]]);
  }

  return {
    "means": stat_mean,
    "detected": stat_detected,
    "lfc": stat_lfc,
    "delta_d": stat_delta_d,
    "genes": genes
  };
}

/*
 * Free all marker results created from custom selections, so
 * as to avoid memory leaks.
 */

scran_utils_markers.freeCustomMarkers = function() {
  var custom = utils.initCache("custom_selection");
  if ("selection" in custom) {
    for (const [key, val] of custom.selection.entries()) {
      utils.freeCache(val);
    }
    custom.selection = {};
  }
}

