/*****************************************************
 * This file is intended to be vendored into kanapi,
 * so you shouldn't add too many dependencies here.
 * The canonical version of the file is expected to
 * live at src/workers/translate.js in the kana repo.
 *****************************************************/

import * as bakana from "bakana";

const mappings = {
  quality_control: {
    use_mito_default: ["qc", "qc-usemitodefault"],
    mito_prefix: ["qc", "qc-mito"],
    nmads: ["qc", "qc-nmads"],
    skip: ["qc", "skip"],
  },
  adt_quality_control: {
    nmads: ["adt_qualitycontrol", "nmads"],
    min_detected_drop: ["adt_qualitycontrol", "min_detected_drop"],
    igg_prefix: ["adt_qualitycontrol", "igg_prefix"],
    skip: ["adt_qualitycontrol", "skip"],
  },
  adt_normalization: {
    num_pcs: ["adt_normalization", "num_pcs"],
    num_clusters: ["adt_normalization", "num_clusters"],
  },
  feature_selection: {
    span: ["fSelection", "fsel-span"],
  },
  pca: {
    num_hvgs: ["pca", "pca-hvg"],
    num_pcs: ["pca", "pca-npc"],
  },
  adt_pca: {
    num_pcs: ["adt_pca", "num_pcs"],
  },
  combine_embeddings: {
    weights: ["combine_embeddings", "weights"],
  },
  cell_labelling: {
    references: null,
    automatic: true,
    species: [],
    gene_id_column: null,
    gene_id_type: "ENSEMBL",
  },
  batch_correction: {
    // method is handled by configureBatchCorrection.
    num_neighbors: ["batch_correction", "num_neighbors"],
  },
  choose_clustering: {
    method: ["cluster", "clus-method"],
  },
  // Neighbor indexing is handled by configureApproximateNeighbors.
  tsne: {
    perplexity: ["tsne", "tsne-perp"],
    iterations: ["tsne", "tsne-iter"],
    animate: ["tsne", "animate"],
  },
  umap: {
    num_neighbors: ["umap", "umap-nn"],
    num_epochs: ["umap", "umap-epochs"],
    min_dist: ["umap", "umap-min_dist"],
    animate: ["umap", "animate"],
  },
  kmeans_cluster: {
    k: ["cluster", "kmeans-k"],
  },
  snn_graph_cluster: {
    k: ["cluster", "clus-k"],
    scheme: ["cluster", "clus-scheme"],
    resolution: ["cluster", "clus-res"],
  },
  // cell_labelling: {
  //   human_references: ["annotateCells", "annotateCells-human_references"],
  //   mouse_references: ["annotateCells", "annotateCells-mouse_references"],
  // },
};

export function fromUI(inputs, params) {
  let formatted = params;

  // Replacing all 1:1 mappings.
  let safeReplace = (step, par, value) => {
    if (typeof value == "undefined") {
      throw new Error(
        "cannot assign undefined parameter to '" + step + "." + par + "'"
      );
    }
    if (!(step in formatted)) {
      throw new Error("unknown analysis step '" + step + "'");
    }
    let target = formatted[step];
    if (!(par in target)) {
      throw new Error(
        "unknown analysis parameter '" + par + "' for step '" + step + "'"
      );
    }
    target[par] = value;
  };

  safeReplace("inputs", "block_factor", inputs.batch);
  safeReplace("inputs", "subset", inputs.subset);

  // Special handling for multi-step parameters.
  bakana.configureBatchCorrection(formatted, params.batch_correction["method"]);
  bakana.configureApproximateNeighbors(
    formatted,
    params.neighbor_index["approximate"]
  );

  // Simplify the combine_embeddings if we see it is all equal.
  if (formatted.combine_embeddings.weights !== null) {
    let uniq_weights = new Set([
      formatted.combine_embeddings.rna_weight,
      formatted.combine_embeddings.adt_weight,
      formatted.combine_embeddings.crispr_weight,
    ]);
    if (uniq_weights.size <= 1) {
      formatted.combine_embeddings.weights = null;
    }
  }

  return formatted;
}

export function toUI(params) {
  // Setting all 1:1 mappings.
  let safeExtract = (step, par) => {
    if (!(step in params)) {
      throw new Error(
        "no available step '" + step + "' in the supplied parameters"
      );
    }

    let curstep = params[step];
    if (!(par in curstep)) {
      throw new Error(
        "no available parameter '" + par + "' in step '" + step + "'"
      );
    }

    return curstep[par];
  };

  let reversed = {
    inputs: {
      batch: safeExtract("inputs", "sample_factor"),
      subset: safeExtract("inputs", "subset"),
    },
  };

  for (const [step, spars] of Object.entries(mappings)) {
    for (const [par, target] of Object.entries(spars)) {
      if (!(target[0] in reversed)) {
        reversed[target[0]] = {};
      }

      let currev = reversed[target[0]];
      if (target[1] in currev) {
        throw new Error(
          "duplicate entry for parameter '" + target[0] + "." + target[1] + "'"
        );
      }
      currev[target[1]] = safeExtract(step, par);
    }
  }

  // Mopping up the rest.
  reversed.batch_correction.method = bakana.guessBatchCorrectionConfig(params);
  reversed.ann = {
    approximate: bakana.guessApproximateNeighborsConfig(params),
  };

  // Converting it into a dictionary for easier consumption by the UI.
  if (reversed.combine_embeddings.weights === null) {
    reversed.combine_embeddings.weights = {};
  }

  return reversed;
}
