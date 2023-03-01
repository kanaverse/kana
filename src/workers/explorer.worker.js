import * as bakana from "bakana";
import {
  extractBuffers,
  postAttempt,
  postSuccess,
  postError,
  fetchStepSummary,
} from "./helpers.js";
import { code } from "../utils/utils.js";
/***************************************/

let superstate = null;
let preflights = {};
let preflights_summary = {};

function createDataset(args, setOpts = false) {
  if (args.format == "H5AD") {
    return new bakana.H5adResult(args.h5, setOpts ? args.options : {});
  } else if (args.format == "SummarizedExperiment") {
    return new bakana.SummarizedExperimentResult(
      args.rds,
      setOpts ? args.options : {}
    );
  } else {
    throw new Error("unknown format '" + args.format + "'");
  }
}

function summarizeResult(summary, args) {
  let cells_summary = {};
  for (const k of summary.cells.columnNames()) {
    cells_summary[k] = bakana.summarizeArray(summary.cells.column(k));
  }
  let tmp_meta = {
    cells: {
      columns: cells_summary,
      numberOfCells: summary.cells.numberOfRows(),
    },
  };

  tmp_meta["all_features"] = {};
  let tmod_summary = {};
  for (const k of summary["all_features"].columnNames()) {
    tmod_summary[k] = bakana.summarizeArray(summary["all_features"].column(k));
  }
  tmp_meta["all_features"] = {
    columns: tmod_summary,
    numberOfFeatures: summary["all_features"].numberOfRows(),
  };

  tmp_meta["all_assay_names"] = summary["all_assay_names"];
  tmp_meta["reduced_dimension_names"] = summary["reduced_dimension_names"];

  return tmp_meta;
}

/***************************************/

var loaded;
onmessage = function (msg) {
  const { type, payload } = msg.data;

  console.log("EXPLORE WORKER::RCV::", type, payload);

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

    loaded = Promise.all([back_init, state_init]);

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
      .then((x) => {
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
          }

          for (const [k, v] of Object.entries(current)) {
            let payload = v.load();

            console.log(payload);

            let step_inputs = "inputs";
            postAttempt(step_inputs);
            let step_inputs_resp = {
              annotations: payload.cells.columnNames(),
              genes: {},
              num_cells: payload.cells.numberOfRows(),
              num_genes: {},
            };

            for (const [k, v] of Object.entries(payload.features)) {
              step_inputs_resp["genes"][k] = {};
              step_inputs_resp["num_genes"][k] = v.numberOfRows();
              for (const col of v.columnNames()) {
                step_inputs_resp["genes"][k][col] = v.column(col);
              }

              if (v.rowNames()) {
                step_inputs_resp["genes"][k]["rowNames"] = v.rowNames();
              }
            }
            postSuccess(step_inputs, step_inputs_resp);

            let step_embed = "embedding";
            postAttempt(step_embed);
            let step_embed_resp = {};

            for (const [k, v] of Object.entries(payload.reduced_dimensions)) {
              if (k.toLowerCase() !== "pca") {
                step_embed_resp[k] = {
                  x: v[0].slice(),
                  y: v[1].slice(),
                };
              }
            }

            postSuccess(step_embed, step_embed_resp);
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
  // } else if (type == "computeVersusClusters") {
  //   loaded
  //     .then((x) => {
  //       let rank_type = payload.rank_type.replace(/-.*/, ""); // summary type doesn't matter for pairwise comparisons.
  //       let res = superstate.marker_detection.computeVersus(
  //         payload.left,
  //         payload.right,
  //         rank_type,
  //         payload.modality
  //       );
  //       let resp = bakana.formatMarkerResults(
  //         res["results"][payload.modality],
  //         payload.left,
  //         payload.rank_type
  //       );

  //       var transferrable = [];
  //       extractBuffers(resp, transferrable);
  //       postMessage(
  //         {
  //           type: "computeVersusClusters",
  //           resp: resp,
  //           msg: "Success: COMPUTE_VERSUS_CLUSTERS done",
  //         },
  //         transferrable
  //       );
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       postError(type, err, fatal);
  //     });
  // } else if (type == "computeVersusSelections") {
  //   loaded
  //     .then((x) => {
  //       let rank_type = payload.rank_type.replace(/-.*/, ""); // summary type doesn't matter for pairwise comparisons.
  //       let res = superstate.custom_selections.computeVersus(
  //         payload.left,
  //         payload.right,
  //         rank_type,
  //         payload.modality
  //       );
  //       let resp = bakana.formatMarkerResults(
  //         res["results"][payload.modality],
  //         payload.left,
  //         payload.rank_type
  //       );

  //       var transferrable = [];
  //       extractBuffers(resp, transferrable);
  //       postMessage(
  //         {
  //           type: "computeVersusSelections",
  //           resp: resp,
  //           msg: "Success: COMPUTE_VERSUS_SELECTIONS done",
  //         },
  //         transferrable
  //       );
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       postError(type, err, fatal);
  //     });

  //   /**************** OTHER EVENTS FROM UI *******************/
  // } else if (type == "getMarkersForCluster") {
  //   loaded
  //     .then((x) => {
  //       let cluster = payload.cluster;
  //       let rank_type = payload.rank_type;
  //       let modality = payload.modality;
  //       var raw_res = superstate.marker_detection.fetchResults()[modality];
  //       let resp = bakana.formatMarkerResults(raw_res, cluster, rank_type);

  //       var transferrable = [];
  //       extractBuffers(resp, transferrable);
  //       postMessage(
  //         {
  //           type: "setMarkersForCluster",
  //           resp: resp,
  //           msg: "Success: GET_MARKER_GENE done",
  //         },
  //         transferrable
  //       );
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       postError(type, err, fatal);
  //     });
  } else if (type == "getGeneExpression") {
    loaded
      .then((x) => {
        let row_idx = payload.gene;
        let modality = payload.modality.toLowerCase();

        var vec;
        if (modality === "rna") {
          vec = superstate.rna_normalization
            .fetchNormalizedMatrix()
            .row(row_idx);
        } else if (modality === "adt") {
          vec = superstate.adt_normalization.fetchExpression(row_idx);
        } else {
          throw new Error("unknown feature type '" + modality + "'");
        }

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
  // } else if (type == "computeCustomMarkers") {
  //   loaded
  //     .then((x) => {
  //       superstate.custom_selections.addSelection(
  //         payload.id,
  //         payload.selection
  //       );
  //       postMessage({
  //         type: "computeCustomMarkers",
  //         msg: "Success: COMPUTE_CUSTOM_MARKERS done",
  //       });
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       postError(type, err, fatal);
  //     });
  // } else if (type == "getMarkersForSelection") {
  //   loaded
  //     .then((x) => {
  //       let rank_type = payload.rank_type.replace(/-.*/, ""); // summary type doesn't matter for pairwise comparisons.

  //       let raw_res = superstate.custom_selections.fetchResults(
  //         payload.cluster
  //       )[payload.modality];
  //       let resp = bakana.formatMarkerResults(raw_res, 1, rank_type);

  //       var transferrable = [];
  //       extractBuffers(resp, transferrable);
  //       postMessage(
  //         {
  //           type: "setMarkersForCustomSelection",
  //           resp: resp,
  //           msg: "Success: GET_MARKER_GENE done",
  //         },
  //         transferrable
  //       );
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       postError(type, err, fatal);
  //     });
  // } else if (type == "removeCustomMarkers") {
  //   loaded
  //     .then((x) => {
  //       superstate.custom_selections.removeSelection(payload.id);
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //       postError(type, err, fatal);
  //     });
  } else if (type == "getAnnotation") {
    loaded
      .then((x) => {
        let annot = payload.annotation;
        let vec, output;

        if (annot.startsWith(`${code}::QC::`)) {
          let splits = annot.replace(`${code}::QC::`, "");
          vec = superstate.cell_filtering.fetchFilteredQualityMetric(
            splits.substring(4),
            splits.substring(0, 3)
          );
          // Filter to match QC unless requested otherwise.
        } else if (payload.unfiltered !== false) {
          vec = superstate.cell_filtering.applyFilter(
            superstate.inputs.fetchCellAnnotations().column(annot)
          );
        } else {
          vec = superstate.inputs.fetchAnnotations(annot);
        }

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
  } else {
    console.error("MIM:::msg type incorrect");
    postError(type, "Type not defined", fatal);
  }
};
