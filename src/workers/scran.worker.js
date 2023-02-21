import * as bakana from "bakana";
import * as kana_db from "./KanaDBHandler.js";
import * as downloads from "./DownloadsDBHandler.js";
import * as hashwasm from "hash-wasm";
import * as translate from "./translate.js";
import {
  extractBuffers,
  postAttempt,
  postSuccess,
  postError,
  fetchStepSummary,
} from "./helpers.js";
import * as remotes from "bakana-remotes";
import { code } from "../utils/utils.js";
/***************************************/

let superstate = null;
let preflights = {};
let preflights_summary = {};

// Evade CORS problems and enable caching.
const proxy = "https://cors-proxy.aaron-lun.workers.dev";
async function proxyAndCache(url) {
  let buffer = await downloads.get(proxy + "/" + encodeURIComponent(url));
  return new Uint8Array(buffer);
}
bakana.setCellLabellingDownload(proxyAndCache);
remotes.ExperimentHubDataset.setDownloadFun(proxyAndCache);
bakana.availableReaders["ExperimentHub"] = remotes.ExperimentHubDataset;

function createDataset(args) {
  if (args.format == "10X") {
    return new bakana.TenxHdf5Dataset(args.h5);
  } else if (args.format == "MatrixMarket") {
    return new bakana.TenxMatrixMarketDataset(
      args.mtx,
      args.genes || null,
      args.annotations || null
    );
  } else if (args.format == "H5AD") {
    return new bakana.H5adDataset(args.h5);
  } else if (args.format == "SummarizedExperiment") {
    return new bakana.SummarizedExperimentDataset(args.rds);
  } else if (args.format == "ExperimentHub") {
    return new remotes.ExperimentHubDataset(args.id);
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

  tmp_meta["modality_features"] = {};
  for (const [k, v] of Object.entries(summary.modality_features)) {
    let tmod_summary = {};
    for (const k of v.columnNames()) {
      tmod_summary[k] = bakana.summarizeArray(v.column(k));
    }
    tmp_meta["modality_features"][k] = {
      columns: tmod_summary,
      numberOfFeatures: v.numberOfRows(),
    };
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
      throw "failed to save file '" + id + "' to KanaDB";
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

    if (output) {
      postSuccess(step, output);
    }
  } catch (err) {
    postError(step, err, true);
  }
}

/***************************************/

var loaded;
onmessage = function (msg) {
  const { type, payload } = msg.data;

  console.log("WORKER::RCV::", type, payload);

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
    } catch {
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
  } else if (type == "RUN") {
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
  } else if (type == "LOAD") {
    fatal = true;
    let fs = payload.inputs.files;

    if (fs[Object.keys(fs)[0]].format == "kana") {
      let f = fs[Object.keys(fs)[0]].file;
      loaded
        .then(async (x) => {
          const reader = new FileReaderSync(); // eslint-disable-line
          let res = reader.readAsArrayBuffer(f);
          let params = await unserializeAllSteps(res);

          var transferrable = [];
          extractBuffers(params.other, transferrable);
          postMessage(
            {
              type: "loadedParameters",
              resp: params,
            },
            transferrable
          );
        })
        .catch((err) => {
          console.error(err);
          postError(type, err, fatal);
        });
    } else if (fs[Object.keys(fs)[0]].format == "kanadb") {
      var id = fs[Object.keys(fs)[0]].file;
      kana_db
        .loadAnalysis(id)
        .then(async (res) => {
          if (res == null) {
            postMessage({
              type: "KanaDB_ERROR",
              msg: `Fail: cannot load analysis ID '${id}'`,
            });
          } else {
            let params = await unserializeAllSteps(res);

            var transferrable = [];
            extractBuffers(params.other, transferrable);
            postMessage(
              {
                type: "loadedParameters",
                resp: params,
              },
              transferrable
            );
          }
        })
        .catch((err) => {
          console.error(err);
          postError(type, err, fatal);
        });
    }
    /**************** SAVING EXISTING ANALYSES *******************/
  } else if (type == "EXPORT") {
    loaded
      .then(async (x) => {
        const h5path = "serialized_in.h5";
        try {
          let collected = await bakana.saveAnalysis(superstate, h5path, {
            embedded: true,
          });
          let arr = bakana.createKanaFile(h5path, collected.collected);
          let contents = arr.buffer;
          postMessage(
            {
              type: "exportState",
              resp: contents,
              msg: "Success: application state exported",
            },
            [contents]
          );
        } finally {
          bakana.callScran((scran) => scran.removeFile(h5path));
        }
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "SAVEKDB") {
    // save analysis to inbrowser indexedDB
    var title = payload.title;
    loaded
      .then(async (x) => {
        let collected = [];
        let old = bakana.setCreateLink(linkKanaDb(collected));

        const h5path = "serialized_in.h5";
        let id = null;
        try {
          await bakana.saveAnalysis(superstate, h5path, {
            embedded: false,
          });
          let state = bakana.createKanaFile(h5path, null);
          id = await kana_db.saveAnalysis(null, state, collected, title);
        } finally {
          bakana.callScran((scran) => scran.removeFile(h5path));
          bakana.setCreateLink(old);
        }

        if (id !== null) {
          let recs = await kana_db.getRecords();
          postMessage({
            type: "KanaDB_store",
            resp: recs,
            msg: `Success: Saved analysis to cache (${id})`,
          });
        } else {
          postMessage({
            type: "KanaDB_ERROR",
            msg: `Fail: Cannot save analysis to cache`,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });

    /**************** KANADB EVENTS *******************/
  } else if (type == "REMOVEKDB") {
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
              summary[k] = summarizeDataset(preflights_summary[v.uid], v);
            } else {
              let tmp_dataset = createDataset(v);
              current[k] = tmp_dataset;
              summary[k] = summarizeDataset(current[k], v);
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
  } else if (type == "computeVersusClusters") {
    loaded
      .then((x) => {
        let rank_type = payload.rank_type.replace(/-.*/, ""); // summary type doesn't matter for pairwise comparisons.
        let res = superstate.marker_detection.computeVersus(
          payload.left,
          payload.right,
          rank_type,
          payload.modality
        );
        postMessage({
          type: "computeVersusClusters",
          resp: res,
          msg: "Success: COMPUTE_VERSUS_CLUSTERS done",
        });
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "computeVersusSelections") {
    loaded
      .then((x) => {
        let rank_type = payload.rank_type.replace(/-.*/, ""); // summary type doesn't matter for pairwise comparisons.
        let res = superstate.custom_selections.computeVersus(
          payload.left,
          payload.right,
          rank_type,
          payload.modality
        );
        postMessage({
          type: "computeVersusSelections",
          resp: res,
          msg: "Success: COMPUTE_VERSUS_SELECTIONS done",
        });
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });

    /**************** OTHER EVENTS FROM UI *******************/
  } else if (type == "getMarkersForCluster") {
    loaded
      .then((x) => {
        let cluster = payload.cluster;
        let rank_type = payload.rank_type;
        let modality = payload.modality;
        var raw_res = superstate.marker_detection.fetchResults()[modality];
        let resp = bakana.formatMarkerResults(raw_res, cluster, rank_type);

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
  } else if (type == "computeCustomMarkers") {
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
  } else if (type == "getMarkersForSelection") {
    loaded
      .then((x) => {
        let rank_type = payload.rank_type.replace(/-.*/, ""); // summary type doesn't matter for pairwise comparisons.

        let raw_res = superstate.custom_selections.fetchResults(
          payload.cluster
        )[payload.modality];
        let resp = bakana.formatMarkerResults(raw_res, 1, rank_type);

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
        superstate.custom_selections.removeSelection(payload.id);
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "animateTSNE") {
    loaded
      .then(async (x) => {
        await superstate.tsne.animate();
        postSuccess("tsne", await superstate.tsne.summary());
      })
      .catch((err) => {
        console.error(err);
        postError(type, err, fatal);
      });
  } else if (type == "animateUMAP") {
    loaded
      .then(async (x) => {
        await superstate.umap.animate();
        postSuccess("umap", await superstate.umap.summary());
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

        if (annot.startsWith(`${code}::QC::`)) {
          let splits = annot.replace(`${code}::QC::`, "");
          vec = superstate.cell_filtering.fetchFilteredQualityMetric(
            splits.substring(4),
            splits.substring(0, 3)
          );
          // Filter to match QC unless requested otherwise.
        } else if (payload.unfiltered !== false) {
          vec = superstate.cell_filtering.fetchFilteredAnnotations(annot);
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
