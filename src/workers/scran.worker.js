import * as bakana from "bakana";
import * as kana_db from "./KanaDBHandler.js";
import * as downloads from "./DownloadsDBHandler.js";
import * as hashwasm from "hash-wasm";
import * as translate from "./translate.js";
import { extractBuffers, postAttempt, postSuccess, postError } from "./helpers.js";

/***************************************/

let superstate = null;

bakana.setCellLabellingDownload(downloads.get);

bakana.setVisualizationAnimate((type, x, y, iter) => {
    postMessage({
        type: type + "_iter",
        x: x,
        y: y,
        iteration: iter
    }, [x.buffer, y.buffer]);
});

function linkKanaDb(collected) {
    return async (type, name, buffer) => {
        var md5 = await hashwasm.md5(new Uint8Array(buffer));
        var id = type + "_" + name + "_" + buffer.byteLength + "_" + md5;
        var ok = await kana_db.saveFile(id, buffer);
        if (!ok) {
            throw "failed to save file '" + id + "' to KanaDB";
        }
        collected.push(id);
        return id;
    };
}

async function serializeAllSteps(embedded) {
    const h5path = "serialized_in.h5";
    let collected = [];
    let old = bakana.setCreateLink(linkKanaDb(collected));

    let output;
    try {
        let collected = await bakana.saveAnalysis(superstate, h5path, { embedded: embedded });

        if (embedded) {
            output = bakana.createKanaFile(h5path, collected.collected);
        } else {
            output = {
                state: bakana.createKanaFile(h5path, null),
                files: collected
            };
        }
    } finally {
        bakana.removeHDF5File(h5path);
        bakana.setCreateLink(old);
    }

    return output;
}

bakana.setResolveLink(kana_db.loadFile);

async function unserializeAllSteps(contents) {
    const h5path = "serialized_out.h5";

    let output;
    try {
        let loader = await bakana.parseKanaFile(contents, h5path);
        let loaded_state = await bakana.loadAnalysis(h5path, loader, { finishFun: postSuccess });

        if (superstate !== null) {
            await bakana.freeAnalysis(superstate);
        }
        superstate = loaded_state;

        output = {
            "parameters": translate.toUI(bakana.retrieveParameters(superstate)),
            "other": {
                "custom_selections": superstate.custom_selections.fetchSelections()
            }
        };
        console.log(output.other.custom_selections);

    } finally {
        bakana.removeHDF5File(h5path);
    }

    return output;
}

/***************************************/

var loaded;
onmessage = function (msg) {
    const { type, payload } = msg.data;

    let fatal = false;
    if (type == "INIT") {
        fatal = true;
        let nthreads = Math.round(navigator.hardwareConcurrency * 2 / 3);
        let back_init = bakana.initialize({ numberOfThreads: nthreads });

        let state_init = back_init
            .then(() => {
                return bakana.createAnalysis()
            });

        state_init
            .then(x => {
                superstate = x;
                postMessage({
                    type: type,
                    msg: "Success: analysis state created"
                });
            });

        let kana_init = kana_db.initialize();
        kana_init
            .then(result => {
                if (result !== null) {
                    postMessage({
                        type: "KanaDB_store",
                        resp: result,
                        msg: "Success: KanaDB initialized"
                    });
                } else {
                    console.error(error);
                    postMessage({
                        type: "KanaDB_ERROR",
                        msg: "Error: Cannot initialize KanaDB"
                    });
                }
            });

        let down_init = downloads.initialize();
        down_init
            .then(result => {
                postMessage({
                    type: "DownloadsDB_store",
                    resp: result,
                    msg: "Success: DownloadsDB initialized"
                });
            })
            .catch(error => {
                console.error(error);
                postMessage({
                    type: "DownloadsDB_ERROR",
                    msg: "Error: Cannot initialize DownloadsDB"
                });
            });


        loaded = Promise.all([
            back_init,
            kana_init,
            down_init,
            state_init
        ]);

        loaded.then(() => {
            postMessage({
                type: type,
                msg: "Success: bakana initialized"
            });
        }).catch(err => {
            console.error(err);
            postError(type, err, fatal)
        });
        /**************** RUNNING AN ANALYSIS *******************/
    } else if (type == "RUN") {
        fatal = true;
        loaded
            .then(x => {
                let inputs = payload.inputs;
                let formatted = translate.fromUI(inputs, payload.params);
                bakana.runAnalysis(superstate, inputs.files, formatted, { startFun: postAttempt, finishFun: postSuccess })
                    .catch(err => {
                        console.error(err);
                        postError(type, err, fatal)
                    });
            }).catch(err => {
                console.error(err);
                postError(type, err, fatal)
            });
        /**************** LOADING EXISTING ANALYSES *******************/
    } else if (type == "LOAD") {
        fatal = true;
        let fs = payload.inputs.files;

        if (fs[Object.keys(fs)[0]].format == "kana") {
            let f = fs[Object.keys(fs)[0]].file;
            loaded
                .then(async (x) => {
                    const reader = new FileReaderSync();
                    let res = reader.readAsArrayBuffer(f);
                    let params = await unserializeAllSteps(res);

                    var transferrable = [];
                    extractBuffers(params.other, transferrable);
                    postMessage({
                        type: "loadedParameters",
                        resp: params
                    }, transferrable);

                }).catch(err => {
                    console.error(err);
                    postError(type, err, fatal)
                });
        } else if (fs[Object.keys(fs)[0]].format == "kanadb") {
            var id = fs[Object.keys(fs)[0]].file;
            kana_db.loadAnalysis(id)
                .then(async (res) => {
                    if (res == null) {
                        postMessage({
                            type: "KanaDB_ERROR",
                            msg: `Fail: cannot load analysis ID '${id}'`
                        });
                    } else {
                        let params = await unserializeAllSteps(res);

                        var transferrable = [];
                        extractBuffers(params.other, transferrable);
                        postMessage({
                            type: "loadedParameters",
                            resp: params 
                        }, transferrable);
                    }
                }).catch(err => {
                    console.error(err);
                    postError(type, err, fatal)
                });
        }
        /**************** SAVING EXISTING ANALYSES *******************/
    } else if (type == "EXPORT") {
        loaded
            .then(async (x) => {
                var contents = await serializeAllSteps(true);
                postMessage({
                    type: "exportState",
                    resp: contents,
                    msg: "Success: application state exported"
                }, [contents]);
            }).catch(err => {
                console.error(err);
                postError(type, err, fatal)
            });

    } else if (type == "SAVEKDB") { // save analysis to inbrowser indexedDB 
        var title = payload.title;
        loaded
            .then(async (x) => {
                var contents = await serializeAllSteps(false);
                let id = await kana_db.saveAnalysis(null, contents.state, contents.files, title);
                if (id !== null) {
                    let recs = await kana_db.getRecords();
                    postMessage({
                        type: "KanaDB_store",
                        resp: recs,
                        msg: `Success: Saved analysis to cache (${id})`
                    });
                } else {
                    console.error(error);
                    postMessage({
                        type: "KanaDB_ERROR",
                        msg: `Fail: Cannot save analysis to cache`
                    });
                }
            }).catch(err => {
                console.error(err);
                postError(type, err, fatal)
            });

        /**************** KANADB EVENTS *******************/
    } else if (type == "REMOVEKDB") { // remove a saved analysis
        var id = payload.id;
        kana_db.removeAnalysis(id)
            .then(async (result) => {
                if (result) {
                    let recs = await kana_db.getRecords();
                    postMessage({
                        type: "KanaDB_store",
                        resp: recs,
                        msg: `Success: Removed file from cache (${id})`
                    });
                } else {
                    console.error(error);
                    postMessage({
                        type: "KanaDB_ERROR",
                        msg: `fail: cannot remove file from cache (${id})`
                    });
                }
            }).catch(err => {
                console.error(err);
                postError(type, err, fatal)
            });;

    } else if (type == "PREFLIGHT_INPUT") {
        loaded
            .then(async x => {
                let resp = {};
                try {
                    resp.status = "SUCCESS";
                    resp.details = await bakana.validateAnnotations(payload.inputs.files);
                } catch (e) {
                    resp.status = "ERROR";
                    resp.reason = e.toString();
                }

                postMessage({
                    type: "PREFLIGHT_INPUT_DATA",
                    resp: resp,
                    msg: "Success: PREFLIGHT_INPUT done"
                });
            }).catch(err => {
                console.error(err);
                postError(type, err, fatal)
            });

        /**************** OTHER EVENTS FROM UI *******************/
    } else if (type == "getMarkersForCluster") {
        loaded.then(x => {
            let cluster = payload.cluster;
            let rank_type = payload.rank_type;
            let modality = payload.modality;
            var resp = superstate.marker_detection.fetchGroupResults(cluster, rank_type, modality);

            var transferrable = [];
            extractBuffers(resp, transferrable);
            postMessage({
                type: "setMarkersForCluster",
                resp: resp,
                msg: "Success: GET_MARKER_GENE done"
            }, transferrable);
        }).catch(err => {
            console.error(err);
            postError(type, err, fatal)
        });

    } else if (type == "getGeneExpression") {
        loaded.then(x => {
            let row_idx = payload.gene;
            let modality = payload.modality.toLowerCase()

            var vec;
            if (modality === "rna") {
                vec = superstate.normalization.fetchExpression(row_idx);
            } else if (modality === "adt") {
                vec = superstate.adt_normalization.fetchExpression(row_idx);
            } else {
                throw new Error("unknown feature type '" + modality + "'");
            }

            postMessage({
                type: "setGeneExpression",
                resp: {
                    gene: row_idx,
                    expr: vec
                },
                msg: "Success: GET_GENE_EXPRESSION done"
            }, [vec.buffer]);
        }).catch(err => {
            console.error(err);
            postError(type, err, fatal)
        });

    } else if (type == "computeCustomMarkers") {
        loaded.then(x => {
            superstate.custom_selections.addSelection(payload.id, payload.selection);
            postMessage({
                type: "computeCustomMarkers",
                msg: "Success: COMPUTE_CUSTOM_MARKERS done"
            });
        }).catch(err => {
            console.error(err);
            postError(type, err, fatal)
        });

    } else if (type == "getMarkersForSelection") {
        loaded.then(x => {
            let rank_type = payload.rank_type.replace(/-.*/, ""); // summary type doesn't matter for pairwise comparisons.
            var resp = superstate.custom_selections.fetchResults(payload.cluster, rank_type, payload.modality);
            var transferrable = [];
            extractBuffers(resp, transferrable);
            postMessage({
                type: "setMarkersForCustomSelection",
                resp: resp,
                msg: "Success: GET_MARKER_GENE done"
            }, transferrable);
        }).catch(err => {
            console.error(err);
            postError(type, err, fatal)
        });

    } else if (type == "removeCustomMarkers") {
        loaded.then(x => {
            superstate.custom_selections.removeSelection(payload.id);
        }).catch(err => {
            console.error(err);
            postError(type, err, fatal)
        });

    } else if (type == "animateTSNE") {
        loaded.then(async (x) => {
            await superstate.tsne.animate();
            postSuccess("tsne", await superstate.tsne.summary());
        }).catch(err => {
            console.error(err);
            postError(type, err, fatal)
        });

    } else if (type == "animateUMAP") {
        loaded.then(async (x) => {
            await superstate.umap.animate();
            postSuccess("umap", await superstate.umap.summary());
        }).catch(err => {
            console.error(err);
            postError(type, err, fatal)
        });

    } else if (type == "getAnnotation") {
        loaded.then(x => {
            let annot = payload.annotation;
            let vec, result;

            // Filter to match QC unless requested otherwise.
            if (payload.unfiltered !== false) {
                vec = superstate.cell_filtering.fetchFilteredAnnotations(annot);
            } else {
                vec = superstate.inputs.fetchAnnotations(annot);
            }

            if (ArrayBuffer.isView(vec)) {
                result = {
                    "type": "array",
                    "values": vec.slice()
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
        
                result = {
                    "type": "factor",
                    "index": indices,
                    "levels": uniq_vals
                };
            }

            let extracted = [];
            extractBuffers(result, extracted);
            postMessage({
                type: "setAnnotation",
                resp: {
                    annotation: annot,
                    values: result
                },
                msg: "Success: GET_ANNOTATION done"
            }, extracted);
        }).catch(err => {
            console.error(err);
            postError(type, err, fatal)
        });

    } else {
        console.error("MIM:::msg type incorrect")
        postError(type, "Type not defined", fatal)
    }
}
