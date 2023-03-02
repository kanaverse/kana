import * as bakana from "bakana";
import * as scran from "scran.js";

import { code } from "../utils/utils.js";

let cluster_indices = {};
let cluster_markers = {};
let cluster_versus_cache = {};
let cluster_uniq_map = {};

let custom_selections = {};
let selection_markers = {};
let selection_versus_cache = {};

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
  annotation
) => {
  let raw_res = null;

  if (!(modality in cluster_markers)) {
    cluster_markers[modality] = {};
    cluster_uniq_map[modality] = {};
    cluster_indices[modality] = {};
  }

  if (
    cluster_markers[modality][annotation] !== null &&
    cluster_markers[modality][annotation] !== undefined
  ) {
    raw_res = cluster_markers[modality][annotation];
  }

  if (raw_res == null) {
    // figure out cluster indices
    let res = vecToFactors(annotation);

    cluster_uniq_map[modality][annotation] = res["map"];
    cluster_indices[modality][annotation] = res["indices"];

    cluster_markers[modality][annotation] = scran.scoreMarkers(
      matrix,
      cluster_indices[modality][annotation]
    );

    raw_res = cluster_markers[modality][annotation];
  }
  let resp = bakana.formatMarkerResults(
    raw_res,
    cluster_uniq_map[modality][annotation],
    rank_type
  );

  return resp;
};
