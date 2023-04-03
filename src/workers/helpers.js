import * as bioc from "bioconductor";

export function extractBuffers(object, store) {
  if (!object) {
    return;
  }

  if (Array.isArray(object)) {
    for (const element of object) {
      extractBuffers(element, store);
    }
  } else if (object.constructor == Object) {
    for (const [key, element] of Object.entries(object)) {
      extractBuffers(element, store);
    }
  } else if (ArrayBuffer.isView(object)) {
    if (!(object.buffer instanceof ArrayBuffer)) {
      throw "only ArrayBuffers should be in the message payload";
    }
    store.push(object.buffer);
  }
}

export function postAttempt(step) {
  postMessage({
    type: `${step}_START`,
  });
}

export function postSuccess(step, info) {
  if (typeof info == "undefined") {
    postMessage({
      type: `${step}_CACHE`,
    });
  } else {
    var transferable = [];
    extractBuffers(info, transferable);
    postMessage(
      {
        type: `${step}_DATA`,
        resp: info,
      },
      transferable
    );
  }
}

export function postError(type, err, fatal) {
  postMessage({
    type: `${type}_ERROR`,
    resp: {
      reason: err.toString(),
      fatal: fatal,
    },
  });
}

export function splitMetricsByBlock(metrics, blockLevels, blockIds) {
  var output = {};
  var blocks = blockIds.array();
  for (var b = 0; b < blockLevels.length; b++) {
    let current = {};
    for (const [key, val] of Object.entries(metrics)) {
      current[key] = val.array().filter((x, i) => blocks[i] == b);
    }
    output[blockLevels[b]] = current;
  }
  return output;
}

export function splitThresholdsByBlock(thresholds, blockLevels) {
  var output = {};
  for (const x of blockLevels) {
    output[x] = {};
  }

  for (const [key, val] of Object.entries(thresholds)) {
    for (var b = 0; b < blockLevels.length; b++) {
      output[blockLevels[b]][key] = val[b];
    }
  }

  return output;
}

export async function fetchStepSummary(state, step) {
  // do not send any response to UI if they have not changed
  if (!state[step].changed) {
    return null;
  }

  if (step === "inputs") {
    let output = {};

    let ngenes = {};
    for (const a of state[step].fetchCountMatrix().available()) {
      ngenes[a] = state[step].fetchCountMatrix().get(a).numberOfRows();
    }

    let gene_info = {};
    for (const [k, v] of Object.entries(
      state[step].fetchFeatureAnnotations()
    )) {
      let info = {};
      for (const c of v.columnNames()) {
        let col = v.column(c);
        if (Array.isArray(col)) {
          info[c] = col;
        }
      }
      gene_info[k] = info;
    }

    output = {
      num_cells: state[step].fetchCountMatrix().numberOfColumns(),
      num_genes: ngenes,
      genes: gene_info,
      annotations: state[step].fetchCellAnnotations().columnNames(),
    };

    return output;
  } else if (step === "rna_quality_control") {
    let output = {};
    var blocks = state["inputs"].fetchBlockLevels();
    if (blocks === null) {
      blocks = ["default"];
      output.data = {
        default: {
          sums: state[step].fetchMetrics().sums(),
          detected: state[step].fetchMetrics().detected(),
          proportion: state[step].fetchMetrics().subsetProportions(0),
        },
      };
    } else {
      let metrics = {
        sums: state[step].fetchMetrics().sums(),
        detected: state[step].fetchMetrics().detected(),
        proportion: state[step].fetchMetrics().subsetProportions(0),
      };
      let bids = state["inputs"].fetchBlock();
      output.data = splitMetricsByBlock(metrics, blocks, bids);
    }

    let listed = {
      sums: state[step].fetchFilters().thresholdsSums(),
      detected: state[step].fetchFilters().thresholdsDetected(),
      proportion: state[step].fetchFilters().thresholdsSubsetProportions(0),
    };
    output.thresholds = splitThresholdsByBlock(listed, blocks);

    return output;
  } else if (step === "adt_quality_control") {
    var output = {};

    var blocks = state["inputs"].fetchBlockLevels();
    if (blocks === null) {
      blocks = ["default"];
      output.data = {
        default: {
          sums: state[step].fetchMetrics().sums(),
          detected: state[step].fetchMetrics().detected(),
          proportion: state[step].fetchMetrics().subsetTotals(0),
        },
      };
    } else {
      let metrics = {
        sums: state[step].fetchMetrics().sums(),
        detected: state[step].fetchMetrics().detected(),
        proportion: state[step].fetchMetrics().maxProportions(),
      };
      let bids = state["inputs"].fetchBlock();
      output.data = splitMetricsByBlock(metrics, blocks, bids);
    }

    let listed = {
      detected: state[step].fetchFilters().thresholdsDetected(),
      proportion: state[step].fetchFilters().thresholdsSubsetTotals(0),
    };
    output.thresholds = splitThresholdsByBlock(listed, blocks);

    // We don't use sums for filtering but we do report it in the metrics,
    // so we just add some NaNs to the thresholds for consistency.
    for (const [k, v] of Object.entries(output.thresholds)) {
      v.sums = NaN;
    }

    return output;
  } else if (step === "crispr_quality_control") {
    let output = {};
    var blocks = state["inputs"].fetchBlockLevels();
    if (blocks === null) {
      blocks = ["default"];
      output.data = {
        default: {
          sums: state[step].fetchMetrics().sums(),
          detected: state[step].fetchMetrics().detected(),
          proportion: state[step].fetchMetrics().maxProportions(),
        },
      };
    } else {
      let metrics = {
        sums: state[step].fetchMetrics().sums(),
        detected: state[step].fetchMetrics().detected(),
        proportion: state[step].fetchMetrics().maxProportions(),
      };
      let bids = state["inputs"].fetchBlock();
      output.data = splitMetricsByBlock(metrics, blocks, bids);
    }

    let listed = {
      count: state[step].fetchFilters().thresholdsMaxCount(0),
    };
    output.thresholds = splitThresholdsByBlock(listed, blocks);

    return output;
  } else if (step === "cell_filtering") {
    let remaining = 0,
      discard_vec = null;
    const discardBuff = state[step].fetchDiscards();
    if (discardBuff) {
      discardBuff.forEach((x) => {
        remaining += x == 0;
      });
      discard_vec = discardBuff.slice();
    } else {
      let available = state["inputs"].hasAvailable();
      remaining = state["inputs"]
        .fetchCountMatrix(available[0])
        .numberOfColumns();
    }
    let output = { retained: remaining, discard: discard_vec };
    return output;
  } else if (step === "rna_normalization") {
    return {};
  } else if (step === "adt_normalization") {
    return {};
  } else if (step === "crispr_normalization") {
    return {};
  } else if (step === "feature_selection") {
    let output = {
      means: state[step].fetchResults().means(),
      vars: state[step].fetchResults().variances(),
      fitted: state[step].fetchResults().fitted(),
      resids: state[step].fetchResults().residuals(),
    };
    return output;
  } else if (
    step === "rna_pca" ||
    step === "adt_pca" ||
    step === "crispr_pca"
  ) {
    let pcs = state[step].fetchPCs();
    var var_exp = pcs.varianceExplained();
    var total_var = pcs.totalVariance();
    var_exp.forEach((x, i) => {
      var_exp[i] = x / total_var;
    });
    return {
      var_exp: var_exp,
    };
  } else if (step === "combine_embeddings") {
    return {};
  } else if (step === "batch_correction") {
    return {};
  } else if (step === "neighbor_index") {
    return {};
  } else if (step === "tsne" || step === "umap") {
    return await state[step].fetchResults();
  } else if (step === "kmeans_cluster") {
    return {};
  } else if (step === "snn_graph_cluster") {
    return {};
  } else if (step === "choose_clustering") {
    var clusters = state[step].fetchClusters();
    return { clusters: clusters.slice() };
  } else if (step === "marker_detection") {
    return {};
  } else if (step === "cell_labelling") {
    return await state[step].fetchResults();
  } else if (step === "custom_selections") {
    return {};
  } else if (step === "feature_set_enrichment") {
    let collections = state.feature_set_enrichment.fetchCollectionDetails();
    let sets = state.feature_set_enrichment.fetchSetDetails();
    return { 
        collections: collections,
        sets: {
            names: sets.names,
            descriptions: sets.descriptions,
            sizes: sets.sizes.slice(),
            collections: sets.collections.slice()
        }
    }
  }
}
