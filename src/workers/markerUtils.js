import * as bakana from "bakana";
import * as scran from "scran.js";

import { code } from "../utils/utils.js";

var cluster_indices = {};
var cluster_markers = {};
var cluster_versus_cache = {};

var custom_selections = {};
var selection_markers = {};
var selection_versus_cache = {};
var current_params = {};
var cluster_uniq_map = {};

function release_versus_cache(x) {
  for (const [k, v] of Object.entries(x)) {
    if (v.constructor.name === "Object") {
      release_versus_cache(v);
    } else {
      scran.free(v);
    }
  }
}

function delete_custom_selection(id) {
  if (custom_selections[id]) {
    for (const obj of Object.values(custom_selections[id])) {
      scran.free(obj);
    }
  }
  delete custom_selections[id];
  delete selection_markers[id];
}

const getClusterIndices = (annotation, vec) => {
  if (!(annotation in cluster_indices)) {
    let res = vecToFactors(vec);

    cluster_uniq_map[annotation] = res["map"];
    cluster_indices[annotation] = res["indices"];
  }

  return {
    indices: cluster_indices[annotation],
    map: cluster_uniq_map[annotation],
  };
};

const vecToFactors = (vec) => {
  let uniq_vals = [];
  let uniq_map = {};
  // scran.free(cluster_indices);
  let indices = new Int32Array(vec.length);
  vec.forEach((x, i) => {
    if (!(x in uniq_map)) {
      uniq_map[x] = uniq_vals.length;
      uniq_vals.push(x);
    }
    indices[i] = uniq_map[x];
  });

  return { indices: indices, map: uniq_map };
};

export const getMarkersForCluster = (
  matrix,
  cluster,
  rank_type,
  modality,
  vec
) => {
  let raw_res = null;

  // figure out cluster indices
  let res = getClusterIndices(cluster, vec);

  // is it the same params? may be a different cluster/group?
  if (current_params !== {}) {
    if (
      current_params["modality"] !== modality ||
      current_params["annotation"] == cluster
    ) {
      for (const obj of Object.values(cluster_markers)) {
        obj.free();
      }
      cluster_markers = {};

      for (const a of matrix.available()) {
        cluster_markers[a] = scran.scoreMarkers(matrix.get(a), res.indices);
      }
    }

    if (!(modality in cluster_markers)) {
      throw new Error("unknown feature type '" + modality + "'");
    }

    raw_res = cluster_markers[modality];
  }

  let resp = bakana.formatMarkerResults(raw_res, res.map[cluster], rank_type);

  return resp;
};

export const computeCustomMarkers = (matrix, id, selection) => {
  if (id in custom_selections) {
    delete_custom_selection(id);
  }

  // Assumes that we have at least one cell in and outside the selection!
  var buffer = scran.createInt32WasmArray(matrix.numberOfColumns());
  try {
    buffer.fill(0);
    var tmp = buffer.array();
    selection.forEach((element) => {
      tmp[element] = 1;
    });

    let res = {};
    for (const k of matrix.available()) {
      let mat = matrix.get(k);
      res[k] = scran.scoreMarkers(mat, buffer);
    }

    selection_markers[id] = res;
    custom_selections[id] = selection;
  } finally {
    buffer.free();
  }
};

export const getMarkersForSelection = (id, modality, rank_type) => {
  if (!(id in custom_selections)) {
    throw new Error("unknown custom selection '" + id + "'");
  }

  let results = selection_markers[id];
  if (!(modality in results)) {
    throw new Error("unknown modality '" + modality + "'");
  }

  let trank_type = rank_type.replace(/-.*/, ""); // summary type doesn't matter for pairwise comparisons.
  var resp = bakana.formatMarkerResults(
    results[modality],
    1,
    trank_type + "-mean"
  );

  return resp;
};

export const removeCustomMarkers = (id) => {
  delete_custom_selection(id);
};

export const computeVersusSelections = (
  matrix,
  rank_type,
  left,
  right,
  modality
) => {
  let markers = bakana.CustomSelectionsState.computeVersusCustom(
    left,
    right,
    matrix,
    custom_selections,
    {
      cache: selection_versus_cache,
    }
  );

  let resp = bakana.formatMarkerResults(
    markers["results"][modality],
    1,
    rank_type
  );

  return resp;
};

export const computeVersusClusters = (
  matrix,
  rank_type,
  left,
  right,
  modality,
  annotation,
  vec
) => {
  // figure out cluster indices
  let res = getClusterIndices(annotation, vec);

  let markers = bakana.MarkerDetectionState.computeVersusCustom(
    left,
    right,
    matrix,
    res.indices,
    {
      cache: cluster_versus_cache,
    }
  );

  let resp = bakana.formatMarkerResults(
    markers["results"][modality],
    1,
    rank_type
  );

  return resp;
};
