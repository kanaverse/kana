import * as bakana from "bakana";
import * as scran from "scran.js";
import * as kana_db from "./KanaDBHandler.js";
import * as gesel from "gesel";
import * as hashwasm from "hash-wasm";
import * as remotes from "bakana-remotes";
import * as downloads from "./DownloadsDBHandler.js";
import JSZip from "jszip";

import * as translate from "./translate.js";
import {
  extractBuffers,
  postAttempt,
  postSuccess,
  postError,
  fetchStepSummary,
} from "./helpers.js";
import { code } from "../utils/utils.js";
/***************************************/

const default_cluster = `${code}::CLUSTERS`;
const default_selection = `${code}::SELECTION`;

let superstate = null;
let preflights = {};
let preflights_summary = {};
let cache_matrix = null;
let cache_anno_markers = {};

function createDataset(args) {
  if (args.format === "10X") {
    return new bakana.TenxHdf5Dataset(
      args.h5,
      args.options ? args.options : {}
    );
  } else if (args.format === "MatrixMarket") {
    return new bakana.TenxMatrixMarketDataset(
      args.mtx,
      args.genes || null,
      args.annotations || null,
      args.options ? args.options : {}
    );
  } else if (args.format === "H5AD") {
    return new bakana.H5adDataset(args.h5, args.options ? args.options : {});
  } else if (args.format === "SummarizedExperiment") {
    return new bakana.SummarizedExperimentDataset(
      args.rds,
      args.options ? args.options : {}
    );
  } else if (args.format === "ExperimentHub") {
    return new remotes.ExperimentHubDataset(
      args.id,
      args.options ? args.options : {}
    );
  } else {
    throw new Error("unknown format '" + args.format + "'");
  }
}

function summarizeDataset(summary, args) {
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

  if (args.format === "H5AD") {
    tmp_meta["all_features"] = {};
    let tmod_summary = {};
    for (const k of summary["all_features"].columnNames()) {
      tmod_summary[k] = bakana.summarizeArray(
        summary["all_features"].column(k)
      );
      tmod_summary[k]["_all_"] = summary["all_features"].column(k);
    }
    tmp_meta["all_features"] = {
      columns: tmod_summary,
      numberOfFeatures: summary["all_features"].numberOfRows(),
    };
  } else if (args.format === "SummarizedExperiment") {
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
          tmod_summary[k]["_all_"] = v.column(k);
        }
        tmp_meta["modality_features"][k] = {
          columns: tmod_summary,
          numberOfFeatures: v.numberOfRows(),
        };
      }
    }
  } else {
    tmp_meta["modality_features"] = {};
    if ("modality_features" in summary) {
      for (const [k, v] of Object.entries(summary.modality_features)) {
        let tmod_summary = {};
        for (const k of v.columnNames()) {
          tmod_summary[k] = bakana.summarizeArray(v.column(k));
          tmod_summary[k]["_all_"] = v.column(k);
        }
        tmp_meta["modality_features"][k] = {
          columns: tmod_summary,
          numberOfFeatures: v.numberOfRows(),
        };
      }
    }
  }

  if (args.format === "H5AD") {
    tmp_meta["all_assay_names"] = summary.all_assay_names;
  } else if (args.format === "SummarizedExperiment") {
    tmp_meta["modality_assay_names"] = summary.modality_assay_names;
  }
  return tmp_meta;
}

bakana.setVisualizationAnimate((type, x, y, iter) => {
  postMessage(
    {
      type: type + "_iter",
      x: x,
      y: y,
      iteration: iter,
    },
    [x.buffer, y.buffer]
  );
});

function linkKanaDb(collected) {
  return async (type, file) => {
    let buffer = file.buffer();
    var md5 = await hashwasm.md5(buffer);
    var id = type + "_" + file.name() + "_" + buffer.length + "_" + md5;
    var ok = await kana_db.saveFile(id, buffer);
    if (!ok) {
      throw new Error("failed to save file '" + id + "' to KanaDB");
    }
    collected.push(id);
    return id;
  };
}

bakana.setResolveLink(kana_db.loadFile);

async function unserializeAllSteps(contents) {
  const h5path = "serialized_out.h5";

  let output;
  try {
    let loader = await bakana.parseKanaFile(contents, h5path);
    let loaded_state = await bakana.loadAnalysis(h5path, loader, {
      finishFun: postSuccess,
    });

    if (superstate !== null) {
      await bakana.freeAnalysis(superstate);
    }
    superstate = loaded_state;

    output = {
      parameters: translate.toUI(bakana.retrieveParameters(superstate)),
      other: {
        custom_selections: superstate.custom_selections.fetchSelections(),
      },
    };
  } finally {
    bakana.callScran((scran) => scran.removeFile(h5path));
  }

  return output;
}

async function postStepSummary(step) {
  try {
    let output = await fetchStepSummary(superstate, step);

    postSuccess(step, output);
  } catch (err) {
    console.error(err);
    postError(step, err, true);
  }
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

const getAnnotation = (annotation, unfiltered = false) => {
  let vec;
  if (annotation === "__batch__") {
    vec = superstate.inputs.fetchBlock().slice();
  } else if (annotation.startsWith(`${code}::QC::`)) {
    let metric = annotation.replace(`${code}::QC::`, "");
    let split_metric = metric.split("_");
    let metrics =
      superstate[
        `${split_metric[0].toLowerCase()}_quality_control`
      ].fetchMetrics();

    if (split_metric[1] === "sums") {
      vec = metrics.sums();
    } else if (split_metric[1] === "detected") {
      vec = metrics.detected();
    } else if (split_metric[1] === "proportion") {
      if (split_metric[0].toLowerCase() === "rna") {
        vec = metrics.subsetProportions(0);
      } else if (split_metric[0].toLowerCase() === "adt") {
        vec = metrics.subsetTotals(0);
      } else if (split_metric[0].toLowerCase() === "crispr") {
        vec = metrics.maxProportions(0);
      }
    }
  } else {
    vec = superstate.inputs.fetchCellAnnotations().column(annotation);
  }

  if (!unfiltered) {
    vec = superstate.cell_filtering.applyFilter(vec);
  }

  return vec.slice();
};

const getMatrix = () => {
  if (cache_matrix === null) {
    cache_matrix = new scran.MultiMatrix();
    let mapping = {
      RNA: "rna_normalization",
      ADT: "adt_normalization",
      CRISPR: "crispr_normalization",
    };
    for (const [k, v] of Object.entries(mapping)) {
      let state = superstate[v];
      if (state.valid()) {
        cache_matrix.add(k, state.fetchNormalizedMatrix());
      }
    }
  }
  return cache_matrix;
};

/***************************************/

var loaded;
onmessage = function (msg) {
  const { type, payload } = msg.data;

  // console.log("WORKER::RCV::", type, payload);

  let fatal = false;
  if (type === "INIT") {
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

    let kana_init = kana_db.initialize();
    kana_init
      .then((output) => {
        if (output !== null) {
          postMessage({
            type: "KanaDB_store",
            resp: output,
            msg: "Success: KanaDB initialized",
          });
        }
      })
      .catch((error) => {
        console.error(error);
        postMessage({
          type: "KanaDB_ERROR",
          msg: "Error: Cannot initialize KanaDB",
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

    try {
      let ehub_ids = remotes.ExperimentHubDataset.availableDatasets();
      postMessage({
        type: "ExperimentHub_store",
        resp: ehub_ids,
        msg: "Success: ExperimentHub initialized",
      });
    } catch (err) {
      console.error(err);
      postMessage({
        type: "ExperimentHub_ERROR",
        msg: "Error: Cannot access datasets in ExperimentHub",
      });
    }

    loaded = Promise.all([back_init, kana_init, down_init, state_init]);

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

    /**************** RUNNING AN ANALYSIS *******************/
  } else if (type === "RUN") {
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
              current[k] = preflights[v.uid];
            } else {
              current[k] = createDataset(v);
            }
            current[k].setOptions(v.options);
          }

          // Cleaning out the preflight datasets that weren't used.
          for (const [k, v] of Object.entries(preflights)) {
            v.clear();
            delete preflights[k];
          }

          files = current;
        }

        let formatted = translate.fromUI(inputs, payload.params);
        bakana
          .runAnalysis(superstate, files, formatted, {
            startFun: postAttempt,
            finishFun: postStepSummary,
          })
          .catch((err) => {
            console.error(err);
            postError(type, err, fatal);
          });
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
    /**************** LOADING EXISTING ANALYSES *******************/
  } else if (type === "LOAD") {
    fatal = true;
    let fs = payload.inputs.files;

    if (fs[Object.keys(fs)[0]].format === "kana") {
      let f = fs[Object.keys(fs)[0]].file;
      loaded
        .then(async (x) => {
          const reader = new FileReaderSync(); // eslint-disable-line
          const zipbuffer = reader.readAsArrayBuffer(f);
          const unzipped = await JSZip.loadAsync(zipbuffer);
          let config = JSON.parse(
            await unzipped.file("config.json").async("string")
          );

          let buffers = {};
          for (const x in unzipped.files) {
            if (x.startsWith("datasets/")) {
              let current = await unzipped.files[x].async("uint8array");
              buffers[x.split("/")[1]] = current;
            }
          }

          // This re-runs the entire analysis, so throw startFun/finishFun callbacks here.
          superstate = await bakana.unserializeConfiguration(
            config,
            (id) => buffers[id],
            {
              state: superstate,
              startFun: postAttempt,
              finishFun: postStepSummary,
            }
          );

          const other = {
            custom_selections: superstate.custom_selections.fetchSelections(),
          };

          var transferrable = [];
          extractBuffers(config.parameters, transferrable);
          postMessage(
            {
              type: "loadedParameters",
              resp: {
                parameters: config.parameters,
                other: other,
              },
            },
            transferrable
          );

          let features = {};
          let resp = {};
          const loaded_ds = superstate.inputs.fetchDatasets();
          for (const [k, v] of Object.entries(loaded_ds)) {
            let res = await v.previewPrimaryIds({ cache: true });

            for (const i_mod of ["RNA", "ADT", "CRISPR"]) {
              if (i_mod in res) {
                if (!features[i_mod]) {
                  features[i_mod] = [res[i_mod]];
                } else {
                  features[i_mod].push(res[i_mod]);
                }
              }
            }
          }

          for (const [k, v] of Object.entries(features)) {
            resp[k] = gesel.intersect(v).length;
          }

          postMessage({
            type: "PREFLIGHT_OPTIONS_DATA",
            resp: resp,
            msg: "Success: PREFLIGHT_OPTIONS done",
          });
        })
        .catch((err) => {
          console.error(err);
          postError(type, err, fatal);
        });
    } else if (fs[Object.keys(fs)[0]].format === "kanadb") {
      loaded
        .then(async (x) => {
          var id = fs[Object.keys(fs)[0]].file;

          const jsonbuffer = await kana_db.loadAnalysis(id);
          const dec = new TextDecoder();
          let config = JSON.parse(dec.decode(jsonbuffer));

          superstate = await bakana.unserializeConfiguration(
            config,
            kana_db.loadFile,
            {
              state: superstate,
              startFun: postAttempt,
              finishFun: postStepSummary,
            }
          );
        })
        .catch((err) => {
          console.error(err);
          postError(type, err, fatal);
        });
    }
    /**************** SAVING EXISTING ANALYSES *******************/
  } else if (type === "EXPORT") {
    loaded
      .then(async (x) => {
        let buffers = [];
        let saver = (name, format, file) => {
          let id = String(buffers.length);
          buffers.push(file.buffer());
          return id;
        };

        // Returns a configuration object.
        let collected = await bakana.serializeConfiguration(superstate, saver);

        // Let's zip it all up!
        const zipper = new JSZip();
        zipper.file("config.json", JSON.stringify(collected));
        for (var i = 0; i < buffers.length; i++) {
          zipper.file("datasets/" + String(i), buffers[i]);
        }
        let zipbuffer = await zipper.generateAsync({ type: "uint8array" });
        postMessage(
          {
            type: "exportState",
            resp: zipbuffer,
            msg: "Success: application state exported",
          },
          [zipbuffer.buffer]
        );
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "EXPORT_RDS") {
    loaded
      .then(async (x) => {
        let files = await bakana.saveSingleCellExperiment(
          superstate,
          "results",
          {
            forceBuffer: true,
          }
        );
        let zipbuffer = await bakana.zipFiles(files);

        postMessage(
          {
            type: "exportRDSState",
            resp: zipbuffer,
            msg: "Success: application state exported",
          },
          [zipbuffer.buffer]
        );
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "SAVEKDB") {
    // save analysis to inbrowser indexedDB
    var title = payload.title;
    loaded
      .then(async (x) => {
        let buffers = [];
        let saver = async (name, format, file) => {
          // basically linkKanaDb with an extra arg.
          let buffer = file.buffer();
          var md5 = await hashwasm.md5(buffer);
          var id = type + "_" + file.name() + "_" + buffer.length + "_" + md5;
          var ok = await kana_db.saveFile(id, buffer);
          if (!ok) {
            throw new Error("failed to save file '" + id + "' to KanaDB");
          }
          buffers.push(id);
          return id;
        };

        let collected = await bakana.serializeConfiguration(superstate, saver);
        const enc = new TextEncoder();
        let config = enc.encode(JSON.stringify(collected));
        let id = await kana_db.saveAnalysis(null, config, collected, title);

        if (id !== null) {
          let recs = await kana_db.getRecords();
          postMessage({
            type: "KanaDB_store",
            resp: recs,
            msg: `Success: Saved analysis to browser (${id})`,
          });
        } else {
          postMessage({
            type: "KanaDB_ERROR",
            msg: `Fail: Cannot save analysis to browser`,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });

    /**************** KANADB EVENTS *******************/
  } else if (type === "REMOVEKDB") {
    // remove a saved analysis
    var id = payload.id;
    kana_db
      .removeAnalysis(id)
      .then(async (output) => {
        if (output) {
          let recs = await kana_db.getRecords();
          postMessage({
            type: "KanaDB_store",
            resp: recs,
            msg: `Success: Removed file from cache (${id})`,
          });
        } else {
          postMessage({
            type: "KanaDB_ERROR",
            msg: `fail: cannot remove file from cache (${id})`,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "PREFLIGHT_OPTIONS") {
    loaded.then(async (x) => {
      let resp = {};
      try {
        let counter = 0;
        let features = {};

        for (const [k, v] of Object.entries(payload.inputs.files)) {
          if ("uid" in v) {
            let ds = preflights[v.uid];

            if (
              Array.isArray(payload.options) &&
              payload.options.length > counter
            ) {
              ds.setOptions(payload.options[counter]);

              let res = await ds.previewPrimaryIds({ cache: true });

              for (const i_mod of ["RNA", "ADT", "CRISPR"]) {
                if (i_mod in res) {
                  if (!features[i_mod]) {
                    features[i_mod] = [res[i_mod]];
                  } else {
                    features[i_mod].push(res[i_mod]);
                  }
                }
              }
            }
          }
          counter++;
        }

        for (const [k, v] of Object.entries(features)) {
          if (v.length !== payload.options.length) {
            resp[k] = 0;
          } else {
            resp[k] = gesel.intersect(v).length;
          }
        }
      } catch (e) {
        console.error(e);
        resp.status = "ERROR";
        resp.reason = e.toString();
      }

      postMessage({
        type: "PREFLIGHT_OPTIONS_DATA",
        resp: resp,
        msg: "Success: PREFLIGHT_OPTIONS done",
      });
    });
  } else if (type === "PREFLIGHT_INPUT") {
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
                preflights_summary[v.uid] = await preflights[v.uid].summary({
                  cache: true,
                });
              }
              current[k] = preflights[v.uid];
              summary[k] = summarizeDataset(preflights_summary[v.uid], v);
            } else {
              let tmp_dataset = createDataset(v);
              current[k] = tmp_dataset;
              summary[k] = summarizeDataset(
                await current[k].summary({ cache: true }),
                v
              );
            }
          }

          resp.status = "SUCCESS";
          resp.details = summary;
          // resp.details = await bakana.validateAnnotations(current, { cache: true });
          // i guess iterate through each dataset and call summary
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
  } else if (type === "computeVersusClusters") {
    loaded
      .then((x) => {
        let rank_type = payload.rank_type;
        let modality = payload.modality;
        let annotation = payload.annotation;

        let resp, raw_res;
        if (default_cluster === annotation) {
          raw_res = superstate.marker_detection.computeVersus(
            payload.left,
            payload.right
          );

          resp = bakana.formatMarkerResults(
            raw_res.results[modality],
            raw_res.left,
            rank_type
          );
        } else {
          let annotation_vec = scran.factorize(getAnnotation(annotation));

          let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);
          raw_res = mds.computeVersus(
            annotation_vec.levels.indexOf(payload.left),
            annotation_vec.levels.indexOf(payload.right)
          );
          resp = bakana.formatMarkerResults(
            raw_res.results[modality],
            raw_res.left,
            rank_type
          );
        }

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
  } else if (type === "computeVersusSelections") {
    loaded
      .then((x) => {
        let rank_type = payload.rank_type;
        let res = superstate.custom_selections.computeVersus(
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

    /**************** OTHER EVENTS FROM UI *******************/
  } else if (type === "getMarkersForCluster") {
    loaded
      .then((x) => {
        let cluster = payload.cluster;
        let rank_type = payload.rank_type;
        let modality = payload.modality;
        let annotation = payload.annotation;
        let resp;
        let raw_res;
        if (default_cluster === annotation) {
          raw_res = superstate.marker_detection.fetchResults()[modality];
          resp = bakana.formatMarkerResults(raw_res, cluster, rank_type);
        } else {
          let annotation_vec = scran.factorize(getAnnotation(annotation));
          let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);

          raw_res = mds.fetchResults()[modality];
          // cache_anno_markers[annotation][modality];

          resp = bakana.formatMarkerResults(
            raw_res,
            annotation_vec.levels.indexOf(cluster),
            rank_type
          );
        }

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
  } else if (type === "getGeneExpression") {
    loaded
      .then((x) => {
        let row_idx = payload.gene;
        let modality = payload.modality;

        const matrix = getMatrix(modality);
        let vec;
        if (modality === "RNA") {
          vec = matrix.get(modality).row(row_idx);
        } else if (modality === "ADT") {
          vec = matrix.get(modality).row(row_idx);
        } else if (modality === "CRISPR") {
          vec = matrix.get(modality).row(row_idx);
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
  } else if (type === "computeCustomMarkers") {
    loaded
      .then((x) => {
        superstate.custom_selections.addSelection(
          payload.id,
          payload.selection
        );
        postMessage({
          type: "computeCustomMarkers",
          msg: "Success: COMPUTE_CUSTOM_MARKERS done",
        });
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "getMarkersForSelection") {
    loaded
      .then((x) => {
        let raw_res = superstate.custom_selections.fetchResults(
          payload.cluster
        )[payload.modality];
        let resp = bakana.formatMarkerResults(
          raw_res,
          payload.cluster,
          payload.rank_type
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
  } else if (type === "removeCustomMarkers") {
    loaded
      .then((x) => {
        superstate.custom_selections.removeSelection(payload.id);
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "animateTSNE") {
    loaded
      .then(async (x) => {
        await superstate.tsne.animate();
        postSuccess("tsne", await superstate.tsne.fetchResults());
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "animateUMAP") {
    loaded
      .then(async (x) => {
        await superstate.umap.animate();
        postSuccess("umap", await superstate.umap.fetchResults());
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "getAnnotation") {
    loaded
      .then((x) => {
        let annot = payload.annotation;
        let vec, output;

        vec = getAnnotation(annot, !!payload.unfiltered);

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
  } else if (type === "computeFeaturesetSummary") {
    loaded
      .then(async (x) => {
        let { annotation, rank_type, cluster } = payload;
        let index = rank_type.indexOf("-");
        let resp;
        if (default_cluster === annotation) {
          resp = superstate.feature_set_enrichment.computeEnrichment(
            superstate.marker_detection.fetchResults()["RNA"],
            cluster,
            rank_type.slice(0, index),
            rank_type.slice(index + 1)
          );
          postSuccess("computeFeaturesetSummary", resp);
        } else if (default_selection === annotation) {
          let sel_indices =
            superstate.custom_selections.fetchSelectionIndices(cluster);
          let num_cells = superstate.cell_filtering
            .fetchFilteredMatrix()
            .numberOfColumns();

          let arr_sel_indices = new Uint8Array(num_cells);
          sel_indices.map((x) => arr_sel_indices.set([1], x));
          let annotation_vec = scran.factorize(arr_sel_indices);

          let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);
          let anno_markers = mds.fetchResults()["RNA"];

          resp = superstate.feature_set_enrichment.computeEnrichment(
            anno_markers,
            annotation_vec.levels.indexOf(1),
            rank_type.slice(0, index),
            rank_type.slice(index + 1)
          );
          postSuccess("computeFeaturesetSummary", resp);
        } else {
          let annotation_vec = scran.factorize(getAnnotation(annotation));

          let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);
          let anno_markers = mds.fetchResults()["RNA"];

          resp = superstate.feature_set_enrichment.computeEnrichment(
            anno_markers,
            annotation_vec.levels.indexOf(cluster),
            rank_type.slice(0, index),
            rank_type.slice(index + 1)
          );
          postSuccess("computeFeaturesetSummary", resp);
        }
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "computeFeaturesetVSSummary") {
    loaded
      .then(async (x) => {
        let { annotation, rank_type, left, right } = payload;
        let index = rank_type.indexOf("-");
        let resp;
        if (default_cluster === annotation) {
          let raw_res = superstate.marker_detection.computeVersus(left, right);
          resp = superstate.feature_set_enrichment.computeEnrichment(
            raw_res.results["RNA"],
            raw_res.left,
            rank_type.slice(0, index),
            rank_type.slice(index + 1)
          );
          postSuccess("computeFeaturesetVSSummary", resp);
        } else if (default_selection === annotation) {
          let anno_markers = superstate.custom_selections.computeVersus(
            left,
            right
          );
          resp = superstate.feature_set_enrichment.computeEnrichment(
            anno_markers.results["RNA"],
            0,
            rank_type.slice(0, index),
            rank_type.slice(index + 1)
          );
          postSuccess("computeFeaturesetVSSummary", resp);
        } else {
          let annotation_vec = scran.factorize(getAnnotation(annotation));

          let mds = getMarkerStandAloneForAnnot(annotation, annotation_vec);

          let raw_res = mds.computeVersus(
            annotation_vec.levels.indexOf(payload.left),
            annotation_vec.levels.indexOf(payload.right)
          );

          resp = superstate.feature_set_enrichment.computeEnrichment(
            raw_res.results["RNA"],
            raw_res.left,
            rank_type.slice(0, index),
            rank_type.slice(index + 1)
          );
          postSuccess("computeFeaturesetVSSummary", resp);
        }
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type === "getFeatureScores") {
    loaded
      .then((x) => {
        let { index } = payload;

        let resp =
          superstate.feature_set_enrichment.computePerCellScores(index);
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

        let resp =
          superstate.feature_set_enrichment.fetchFeatureSetIndices(index);

        let raw_res, marker_resp;

        if (default_cluster === annotation) {
          raw_res = superstate.marker_detection.fetchResults()[modality];
          marker_resp = bakana.formatMarkerResults(raw_res, cluster, rank_type);
        } else if (default_selection === annotation) {
          raw_res = superstate.custom_selections.fetchResults(payload.cluster)[
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
  } else {
    console.error(`Type: ${type} not defined`);
    postError(type, `Type: ${type} not defined`, fatal);
  }
};
