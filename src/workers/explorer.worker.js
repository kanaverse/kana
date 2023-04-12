import * as bakana from "bakana";
import * as scran from "scran.js";
import * as gesel from "gesel";
import * as downloads from "./DownloadsDBHandler.js";
import {
  extractBuffers,
  postAttempt,
  postSuccess,
  postError,
  fetchStepSummary,
} from "./helpers.js";
import { code } from "../utils/utils.js";
import * as bioc from "bioconductor";
/***************************************/

// Evade CORS problems and enable caching.
const proxy = "https://cors-proxy.aaron-lun.workers.dev";
async function proxyAndCache(url) {
  let buffer = await downloads.get(proxy + "/" + encodeURIComponent(url));
  return new Uint8Array(buffer);
}

bakana.CellLabellingState.setDownload(proxyAndCache);
gesel.setGeneDownload(proxyAndCache);
bakana.RnaQualityControlState.setDownload(proxyAndCache);

gesel.referenceDownload(async (file, start, end) => {
  let url = gesel.referenceBaseUrl() + "/" + file;
  let full = proxy + "/" + encodeURIComponent(url);
  if (start == null && end == null) {
    let buffer = await downloads.get(full);
    return new Response(buffer);
  } else {
    return fetch(full + "?start=" + String(start) + "&end=" + String(end));
  }
});

gesel.geneDownload(async (file) => {
  let url = gesel.geneBaseUrl() + "/" + file;
  let buffer = await downloads.get(proxy + "/" + encodeURIComponent(url));
  return new Response(buffer);
});

const default_cluster = `${code}::CLUSTERS`;
const default_selection = `${code}::SELECTION`;

let superstate = null;
let preflights = {};
let preflights_summary = {};
let dataset = null;
let cache_anno_markers = {};
let custom_selection_state = null;
let feature_set_enrich_state = null;

function createDataset(args, setOpts = false) {
  if (args.format == "H5AD") {
    return new bakana.H5adResult(args.h5, setOpts ? args.options : {});
  } else if (args.format == "SummarizedExperiment") {
    return new bakana.SummarizedExperimentResult(
      args.rds,
      setOpts ? args.options : {}
    );
  } else if (args.format == "ZippedArtifactdb") {
    return new bakana.ZippedArtifactdbResult(
      args.zipname,
      new bakana.SimpleFile(args.zipfile),
      setOpts ? args.options : {}
    );
  } else {
    throw new Error("unknown format '" + args.format + "'");
  }
}

function summarizeResult(summary, args) {
  let cells_summary = {};
  for (const k of summary.cells.columnNames()) {
    let kcol = summary.cells.column(k);
    if (Array.isArray(kcol) || ArrayBuffer.isView(kcol))
      cells_summary[k] = bakana.summarizeArray(kcol);
  }
  let tmp_meta = {
    cells: {
      columns: cells_summary,
      numberOfCells: summary.cells.numberOfRows(),
    },
  };

  if (
    args.format === "SummarizedExperiment" ||
    args.format === "ZippedArtifactdb"
  ) {
    tmp_meta["modality_features"] = {};
    if ("modality_features" in summary) {
      for (const [k, v] of Object.entries(summary.modality_features)) {
        let tmod_summary = {};
        for (const k of v.columnNames()) {
          // TODO: figure out a way to deal with these later
          if (!Array.isArray(v.column(k))) {
            continue;
          }
          tmod_summary[k] = bakana.summarizeArray(v.column(k));
        }
        tmp_meta["modality_features"][k] = {
          columns: tmod_summary,
          numberOfFeatures: v.numberOfRows(),
        };
      }
    }
  } else {
    tmp_meta["all_features"] = {};
    let tmod_summary = {};
    for (const k of summary["all_features"].columnNames()) {
      tmod_summary[k] = bakana.summarizeArray(
        summary["all_features"].column(k)
      );
    }
    tmp_meta["all_features"] = {
      columns: tmod_summary,
      numberOfFeatures: summary["all_features"].numberOfRows(),
    };
  }

  if (args.format === "H5AD") {
    tmp_meta["all_assay_names"] = summary.all_assay_names;
  } else if (
    args.format === "SummarizedExperiment" ||
    args.format === "ZippedArtifactdb"
  ) {
    tmp_meta["modality_assay_names"] = summary.modality_assay_names;
  }

  tmp_meta.reduced_dimension_names = summary.reduced_dimension_names;
  return tmp_meta;
}

function getMarkerStandAloneForAnnot(annotation, annotation_vec) {
  let mds;
  if (!(annotation in cache_anno_markers)) {
    mds = new bakana.MarkerDetectionStandalone(
      getMatrix(),
      annotation_vec.ids.slice()
    );

    mds.computeAll();
    cache_anno_markers[annotation] = mds;
  }

  return cache_anno_markers[annotation];
}

const getAnnotation = (annotation) => {
  if (annotation.indexOf(":::") !== -1) {
    let splits = annotation.split(":::");
    return dataset.cells.column(splits[0]).column(splits[1]);
  }
  return dataset.cells.column(annotation);
};

const getMatrix = () => {
  return dataset.matrix;
};

/***************************************/

var loaded;
onmessage = function (msg) {
  const { type, payload } = msg.data;

  // console.log("EXPLORE WORKER::RCV::", type, payload);

  let fatal = false;
  if (type == "INIT") {
    fatal = true;
    let nthreads = Math.round((navigator.hardwareConcurrency * 2) / 3);
    let back_init = bakana.initialize({ numberOfThreads: nthreads });

    let state_init = back_init.then(() => {
      return bakana.createAnalysis();
    });

    state_init.then((x) => {
      superstate = x;
      postMessage({
        type: type,
        msg: "Success: analysis state created",
      });
    });

    let down_init = downloads.initialize();
    down_init
      .then((output) => {
        postMessage({
          type: "DownloadsDB_store",
          resp: output,
          msg: "Success: DownloadsDB initialized",
        });
      })
      .catch((error) => {
        console.error(error);
        postMessage({
          type: "DownloadsDB_ERROR",
          msg: "Error: Cannot initialize DownloadsDB",
        });
      });

    loaded = Promise.all([back_init, state_init, down_init]);

    loaded
      .then(() => {
        postMessage({
          type: type,
          msg: "Success: bakana initialized",
        });
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
    /**************** EXPLORE AN ANALYSIS *******************/
  } else if (type == "EXPLORE") {
    fatal = true;
    loaded
      .then(async (x) => {
        let inputs = payload.inputs;
        let files = inputs.files;

        if (files !== null) {
          // Extracting existing datasets from the preflights.
          let current = {};
          for (const [k, v] of Object.entries(files)) {
            if ("uid" in v && v.uid in preflights) {
              preflights[v.uid].clear();
              delete preflights[k];
            }
            current[k] = createDataset(v, true);
            current[k].setOptions(v.options);
          }

          for (const [k, v] of Object.entries(current)) {
            dataset = await v.load();

            let finput = files[k];

            if (!finput.options.normalized) {
              for (const k of dataset.matrix.available()) {
                let mat = dataset.matrix.get(k);
                let lnorm = scran.logNormCounts(mat, { allowZeros: true });
                dataset.matrix.add(k, lnorm);
              }
            }

            let step_inputs = "inputs";
            postAttempt(step_inputs);

            // extract cell annotations
            let annotation_keys = {};
            for (const k of dataset.cells.columnNames()) {
              let kcol = dataset.cells.column(k);
              if (Array.isArray(kcol) || ArrayBuffer.isView(kcol)) {
                const ksumm = bakana.summarizeArray(kcol);
                if (ksumm.type === "continuous") {
                  annotation_keys[k] = {
                    name: k,
                    truncated: new Set(kcol).size >= 50,
                    type: ksumm.type,
                  };
                } else if (ksumm.type === "categorical") {
                  annotation_keys[k] = {
                    name: k,
                    truncated: ksumm.truncated === true,
                    type: ksumm.type,
                  };
                }
              }
            }

            let step_inputs_resp = {
              annotations: annotation_keys,
              genes: {},
              num_cells: dataset.cells.numberOfRows(),
              num_genes: {},
            };

            for (const [k, v] of Object.entries(dataset.features)) {
              step_inputs_resp["genes"][k] = {};
              step_inputs_resp["num_genes"][k] = v.numberOfRows();
              for (const col of v.columnNames()) {
                let kcol = v.column(col);
                if (Array.isArray(kcol) || ArrayBuffer.isView(kcol)) {
                  step_inputs_resp["genes"][k][col] = kcol;
                }
              }

              if (v.rowNames()) {
                step_inputs_resp["genes"][k]["rowNames"] = v.rowNames();
              }
            }
            postSuccess(step_inputs, step_inputs_resp);

            let step_embed = "embedding";
            postAttempt(step_embed);
            let step_embed_resp = {};

            for (const [k, v] of Object.entries(dataset.reduced_dimensions)) {
              if (k.toLowerCase() !== "pca") {
                step_embed_resp[k] = {
                  x: v[0].slice(),
                  y: v[1].slice(),
                };
              }
            }

            postSuccess(step_embed, step_embed_resp);

            if (custom_selection_state) {
              custom_selection_state.free();
            }

            custom_selection_state = new bakana.CustomSelectionsStandalone(
              dataset.matrix
            );
          }
        }
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
    /**************** LOADING EXISTING ANALYSES *******************/
  } else if (type == "PREFLIGHT_INPUT") {
    loaded
      .then(async (x) => {
        let resp = {};
        try {
          // Registering the UIDs of each new dataset.
          let current = {};
          let summary = {};
          for (const [k, v] of Object.entries(payload.inputs.files)) {
            if ("uid" in v) {
              if (!(v.uid in preflights)) {
                preflights[v.uid] = createDataset(v);
                preflights_summary[v.uid] = await preflights[v.uid].summary();
              }
              current[k] = preflights[v.uid];
              summary[k] = summarizeResult(preflights_summary[v.uid], v);
            } else {
              let tmp_dataset = createDataset(v);
              current[k] = tmp_dataset;
              summary[k] = summarizeResult(current[k], v);
            }
          }

          resp.status = "SUCCESS";
          resp.details = summary;
        } catch (e) {
          console.error(e);
          resp.status = "ERROR";
          resp.reason = e.toString();
        }

        postMessage({
          type: "PREFLIGHT_INPUT_DATA",
          resp: resp,
          msg: "Success: PREFLIGHT_INPUT done",
        });
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });

    /**************** VERSUS MODE *******************/
  } else if (type == "computeVersusClusters") {
    loaded
      .then((x) => {
        let rank_type = payload.rank_type;
        let modality = payload.modality;
        let annotation = payload.annotation;

        let annotation_vec = scran.factorize(getAnnotation(annotation));

        let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);
        let raw_res = mds.computeVersus(
          annotation_vec.levels.indexOf(payload.left),
          annotation_vec.levels.indexOf(payload.right)
        );
        let resp = bakana.formatMarkerResults(
          raw_res.results[modality],
          raw_res.left,
          rank_type
        );

        var transferrable = [];
        extractBuffers(resp, transferrable);
        postMessage(
          {
            type: "computeVersusClusters",
            resp: resp,
            msg: "Success: COMPUTE_VERSUS_CLUSTERS done",
          },
          transferrable
        );
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "computeVersusSelections") {
    loaded
      .then((x) => {
        let rank_type = payload.rank_type;
        let res = custom_selection_state.computeVersus(
          payload.left,
          payload.right
        );
        let resp = bakana.formatMarkerResults(
          res["results"][payload.modality],
          payload.left,
          rank_type
        );

        var transferrable = [];
        extractBuffers(resp, transferrable);
        postMessage(
          {
            type: "computeVersusSelections",
            resp: resp,
            msg: "Success: COMPUTE_VERSUS_SELECTIONS done",
          },
          transferrable
        );
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });

    //   /**************** OTHER EVENTS FROM UI *******************/
  } else if (type == "getMarkersForCluster") {
    loaded
      .then((x) => {
        let cluster = payload.cluster;
        let rank_type = payload.rank_type;
        let modality = payload.modality;
        let annotation = payload.annotation;

        let annotation_vec = scran.factorize(getAnnotation(annotation));
        let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);

        let raw_res = mds.fetchResults()[modality];

        let resp = bakana.formatMarkerResults(
          raw_res,
          annotation_vec.levels.indexOf(cluster),
          rank_type
        );

        var transferrable = [];
        extractBuffers(resp, transferrable);
        postMessage(
          {
            type: "setMarkersForCluster",
            resp: resp,
            msg: "Success: GET_MARKER_GENE done",
          },
          transferrable
        );
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "getGeneExpression") {
    loaded
      .then((x) => {
        let row_idx = payload.gene;
        let modality = payload.modality.toLowerCase();

        var vec = dataset.matrix.get(modality).row(row_idx);

        postMessage(
          {
            type: "setGeneExpression",
            resp: {
              gene: row_idx,
              expr: vec,
            },
            msg: "Success: GET_GENE_EXPRESSION done",
          },
          [vec.buffer]
        );
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "computeCustomMarkers") {
    loaded
      .then((x) => {
        custom_selection_state.addSelection(payload.id, payload.selection);
        postMessage({
          type: "computeCustomMarkers",
          msg: "Success: COMPUTE_CUSTOM_MARKERS done",
        });
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "getMarkersForSelection") {
    loaded
      .then((x) => {
        let rank_type = payload.rank_type.replace(/-.*/, ""); // summary type doesn't matter for pairwise comparisons.

        let raw_res = custom_selection_state.fetchResults(payload.cluster)[
          payload.modality
        ];
        let resp = bakana.formatMarkerResults(
          raw_res,
          payload.cluster,
          rank_type
        );

        var transferrable = [];
        extractBuffers(resp, transferrable);
        postMessage(
          {
            type: "setMarkersForCustomSelection",
            resp: resp,
            msg: "Success: GET_MARKER_GENE done",
          },
          transferrable
        );
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "removeCustomMarkers") {
    loaded
      .then((x) => {
        custom_selection_state.removeSelection(payload.id);
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "getAnnotation") {
    loaded
      .then((x) => {
        let annot = payload.annotation;
        let vec, output;

        vec = getAnnotation(annot);
        // dataset.cells.column(annot);

        if (ArrayBuffer.isView(vec)) {
          output = {
            type: "array",
            values: vec.slice(),
          };
        } else {
          let uniq_vals = [];
          let uniq_map = {};
          let indices = new Int32Array(vec.length);
          vec.map((x, i) => {
            if (!(x in uniq_map)) {
              uniq_map[x] = uniq_vals.length;
              uniq_vals.push(x);
            }
            indices[i] = uniq_map[x];
          });

          output = {
            type: "factor",
            index: indices,
            levels: uniq_vals,
          };
        }

        let extracted = [];
        extractBuffers(output, extracted);
        postMessage(
          {
            type: "setAnnotation",
            resp: {
              annotation: annot,
              values: output,
            },
            msg: "Success: GET_ANNOTATION done",
          },
          extracted
        );
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "computeFeaturesetSummary") {
    loaded
      .then(async (x) => {
        let { annotation, rank_type, cluster, modality } = payload;
        let index = rank_type.indexOf("-");
        let resp;

        if (default_selection === annotation) {
          let sel_indices =
            custom_selection_state.fetchSelectionIndices(cluster);
          let num_cells = dataset.cells.numberOfRows();

          let arr_sel_indices = new Uint8Array(num_cells);
          sel_indices.map((x) => arr_sel_indices.set([1], x));
          let annotation_vec = scran.factorize(arr_sel_indices);

          let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);
          let anno_markers = mds.fetchResults()[modality];

          feature_set_enrich_state.ready().then((x) => {
            resp = feature_set_enrich_state.computeEnrichment(
              anno_markers,
              annotation_vec.levels.indexOf(1),
              rank_type.slice(0, index),
              rank_type.slice(index + 1)
            );
            postSuccess("computeFeaturesetSummary", resp);
          });
        } else {
          let annotation_vec = scran.factorize(getAnnotation(annotation));
          let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);
          let anno_markers = mds.fetchResults()[modality];

          feature_set_enrich_state.ready().then((x) => {
            resp = feature_set_enrich_state.computeEnrichment(
              anno_markers,
              annotation_vec.levels.indexOf(cluster),
              rank_type.slice(0, index),
              rank_type.slice(index + 1)
            );
            postSuccess("computeFeaturesetSummary", resp);
          });
        }
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "computeFeaturesetVSSummary") {
    loaded
      .then(async (x) => {
        let { annotation, rank_type, left, right, modality } = payload;
        let index = rank_type.indexOf("-");
        let resp;
        if (default_selection === annotation) {
          let anno_markers = custom_selection_state.computeVersus(left, right);

          feature_set_enrich_state.ready().then((x) => {
            resp = feature_set_enrich_state.computeEnrichment(
              anno_markers.results[modality],
              0,
              rank_type.slice(0, index),
              rank_type.slice(index + 1)
            );
            postSuccess("computeFeaturesetVSSummary", resp);
          });
        } else {
          let annotation_vec = scran.factorize(getAnnotation(annotation));
          let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);

          let raw_res = mds.computeVersus(
            annotation_vec.levels.indexOf(payload.left),
            annotation_vec.levels.indexOf(payload.right)
          );

          feature_set_enrich_state.ready().then((x) => {
            resp = feature_set_enrich_state.computeEnrichment(
              raw_res.results[modality],
              raw_res.left,
              rank_type.slice(0, index),
              rank_type.slice(index + 1)
            );
            postSuccess("computeFeaturesetVSSummary", resp);
          });
        }
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "getFeatureScores") {
    loaded
      .then((x) => {
        let { collection, index } = payload;

        let resp = feature_set_enrich_state.computePerCellScores(index);
        postSuccess("setFeatureScores", resp);
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "getFeatureGeneIndices") {
    loaded
      .then((x) => {
        let { index, cluster, annotation, modality, rank_type } = payload;

        let resp = feature_set_enrich_state.fetchFeatureSetIndices(index);

        let raw_res, marker_resp;

        if (default_selection === annotation) {
          raw_res = custom_selection_state.fetchResults(payload.cluster)[
            payload.modality
          ];
          marker_resp = bakana.formatMarkerResults(
            raw_res,
            payload.cluster,
            payload.rank_type
          );
        } else {
          let annotation_vec = scran.factorize(getAnnotation(annotation));
          let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);

          raw_res = mds.fetchResults()[modality];
          // cache_anno_markers[annotation][modality];

          marker_resp = bakana.formatMarkerResults(
            raw_res,
            annotation_vec.levels.indexOf(cluster),
            rank_type
          );
        }

        let indices = marker_resp.ordering
          .map((x, i) => (resp.includes(x) ? i : -100))
          .filter((x) => x !== -100);

        let filtered_marker_resp = {};
        for (const [k, v] of Object.entries(marker_resp)) {
          filtered_marker_resp[k] = v
            .map((x, i) => (indices.includes(i) ? x : -100))
            .filter((x) => x !== -100);
        }

        postSuccess("setFeatureGeneIndices", filtered_marker_resp);
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "initFeaturesetEnrich") {
    loaded.then(async (x) => {
      let { modality } = payload;

      if (feature_set_enrich_state) {
        feature_set_enrich_state.free();
      }

      feature_set_enrich_state = new bakana.FeatureSetEnrichmentStandalone(
        dataset.features[modality],
        { normalized: dataset.matrix.get(modality) }
      );

      feature_set_enrich_state.ready().then((x) => {
        let collections = feature_set_enrich_state.fetchCollectionDetails();
        let sets = feature_set_enrich_state.fetchSetDetails();
        let resp = {
          collections: collections,
          sets: {
            names: sets.names,
            descriptions: sets.descriptions,
            sizes: sets.sizes.slice(),
            collections: sets.collections.slice(),
          },
        };
        postSuccess("feature_set_enrichment", resp);
      });
    });
  } else {
    console.error("MIM:::msg type incorrect");
    postError(type, "Type not defined", fatal);
  }
};
