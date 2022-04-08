import * as scran from "scran.js";
import * as bakana from "bakana";
import * as kana_db from "./KanaDBHandler.js";
import * as downloads from "./DownloadsDBHandler.js";

/***************************************/

function extractBuffers(object, store) {
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
        if (! (object.buffer instanceof ArrayBuffer)) {
            throw "only ArrayBuffers should be in the message payload";
        }
        store.push(object.buffer);
    }
}

function postSuccess(step, info) {
    var transferable = [];
    extractBuffers(info, transferable);
    postMessage({
        type: `${step}_DATA`,
        resp: info
    }, transferable);
}

/***************************************/

let superstate;

bakana.setCellLabellingDownload(downloads.get);

bakana.setVisualizationAnimate((type, x, y, iter) => {
    postMessage({
        type: type + "_iter",
        x: x,
        y: y,
        iteration: iter
    }, [x.buffer, y.buffer]);
});

function runAllSteps(inputs, params) {
    // Assembling the giant parameter list.
    let formatted = {
        inputs: {
            sample_factor: inputs.batch
        },
        quality_control: {
            use_mito_default: params.qc["qc-usemitodefault"], 
            mito_prefix: params.qc["qc-mito"], 
            nmads: params.qc["qc-nmads"]
        },
        normalization: {},
        feature_selection: {
            span: params.fSelection["fsel-span"]
        },
        pca: {
            num_hvgs: params.pca["pca-hvg"], 
            num_pcs: params.pca["pca-npc"],
            block_method: params.pca["pca-correction"]
        },
        neighbor_index: {
            approximate: params.cluster["clus-approx"]
        },
        choose_clustering: {
            method: params.cluster["clus-method"]
        },
        tsne: {
            perplexity: params.tsne["tsne-perp"], 
            iterations: params.tsne["tsne-iter"], 
            animate: params.tsne["animate"]
        },
        umap: {
            num_neighbors: params.umap["umap-nn"], 
            num_epochs: params.umap["umap-epochs"], 
            min_dist: params.umap["umap-min_dist"], 
            animate: params.umap["animate"]
        },
        kmeans_cluster: {
            k: params.cluster["kmeans-k"]
        },
        snn_graph_cluster: {
            k: params.cluster["clus-k"], 
            scheme: params.cluster["clus-scheme"],
            resolution: params.cluster["clus-res"]
        },
        markers: {},
        cell_labelling: {
            human_references: params.annotateCells["annotateCells-human_references"],
            mouse_references: params.annotateCells["annotateCells-mouse_references"]
        },
        custom_markers: {}
    };

    return bakana.runAnalysis(superstate, inputs.files, formatted, { finishFun: postSuccess });
}
 
/***************************************/

async function linkKanaDb(obj) {
    var md5 = await hashwasm.md5(new Uint8Array(obj.buffer));
    var id = obj.type + "_" + obj.name + "_" + obj.buffer.byteLength + "_" + md5;
    var ok = await kana_db.saveFile(id, obj.buffer);
    if (!ok) {
        throw "failed to save file '" + id + "' to KanaDB";
    }
    output.collected.push(id);
    return id;
};

bakana.setCreateLink(linkKanaDb);
bakana.setResolveLink(kana_db.loadFile);

async function serializeAllSteps(embedded) {
    const h5path = "serialized_in.h5";

    let output;
    try {
        let collected = await bakana.saveAnalysis(superstate, h5path, { embedded: embedded });

        if (embedded) {
            output = bakana.createKanaFile(h5path, collected.collected);
        } else {
            output = {
                state: bakana.createKanaFile(h5path, null),
                files: collected.collected
            };
        }
    } finally {
        if (scran.fileExists(h5path)) {
            scran.removeFile(h5path);
        }
    }

    return output;
}
 
async function unserializeAllSteps(contents) {
    const h5path = "serialized_out.h5";

    let output = {};
    try {
        let loader = await bakana.parseKanaFile(contents, h5path);
        let response = await bakana.loadAnalysis(h5path, loader, { finishFun: postSuccess });

        output = {
            qc: {
                "qc-usemitodefault": response.quality_control.use_mito_default,
                "qc-mito": response.quality_control.mito_prefix,
                "qc-nmads": response.quality_control.nmads
            },
            fSelection: {
                "fsel-span": response.feature_selection.span
            },
            pca: {
                "pca-hvg": response.pca.num_hvgs,
                "pca-npc": response.pca.num_pcs,
                "pca-correction": response.pca.block_method
            },
            cluster: {
                "clus-approx": response.neighbor_index.approximate,
                "kmeans-k": response.kmeans_cluster.k,
                "clus-k": response.snn_graph_cluster.k,
                "clus-scheme": response.snn_graph_cluster.scheme,
                "clus-res": response.snn_graph_cluster.resolution,
                "clus-method": response.choose_clustering.method
            },
            tsne: {
                "tsne-perp": response.tsne.perplexity,
                "tsne-iter": response.tsne.iterations,
                "animate": response.tsne.animate
            },
            umap: {
                "umap-epochs": response.umap.num_epochs,
                "umap-nn": response.umap.num_neighbors,
                "umap-min_dist": response.umap.min_dist,
                "animate": response.umap.animate
            },
            annotateCells: {
                "annotateCells-human_references": response.cell_labelling.human_references,
                "annotateCells-mouse_references": response.cell_labelling.mouse_references
            },
            custom_selections: response.custom_selections
        }
    } finally {
        if (scran.fileExists(h5path)) {
            scran.removeFile(h5path);
        }
    }

    return response;
}

/***************************************/

var loaded;
onmessage = function (msg) {
    const { type, payload } = msg.data;
    if (type == "INIT") {
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

        loaded = Promise.all([
            back_init,
            kana_init,
            state_init
        ]);

        loaded.then(() => {
            postMessage({
                type: type,
                msg: "Success: bakana initialized"
            });
        });

    /**************** RUNNING AN ANALYSIS *******************/
    } else if (type == "RUN") {
        loaded
            .then(x => {
                runAllSteps(payload.inputs, payload.params)
            })
            .catch(error => {
                console.error(error);
                postMessage({
                    type: "run_ERROR",
                    msg: error.toString()
                });
            });

    /**************** LOADING EXISTING ANALYSES *******************/
    } else if (type == "LOAD") {
        let fs = payload.inputs.files;

        if (fs[Object.keys(fs)[0]].format == "kana") {
            let f = fs[Object.keys(fs)[0]].file[0];
            loaded
                .then(async (x) => {
                    const reader = new FileReaderSync();
                    let res = reader.readAsArrayBuffer(f);
                    let response = await unserializeAllSteps(res);
                    postMessage({
                        type: "loadedParameters",
                        resp: response
                    });
                })
                .catch(error => {
                    console.error(error);
                    postMessage({
                        type: "load_ERROR",
                        msg: error.toString()
                    });
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
                        let response = await unserializeAllSteps(res);
                        postMessage({
                            type: "loadedParameters",
                            resp: response
                        });
                    }
                })
                .catch(error => {
                    console.error(error);
                    postMessage({
                        type: "load_ERROR",
                        msg: error.toString()
                    });
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
            })
            .catch(error => {
                console.error(error);
                postMessage({
                    type: "export_ERROR",
                    msg: error.toString()
                });
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
            })
            .catch(error => {
                console.error(error);
                postMessage({
                    type: "export_ERROR",
                    msg: error.toString()
                });
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
            });

    } else if (type == "PREFLIGHT_INPUT") {
        loaded
        .then(x => {
            let resp = {};
            try {
                resp.status = "SUCCESS";
                resp.details = bakana.validateAnnotations(payload.inputs.files);
            } catch (e) {
                resp.status = "ERROR";
                resp.reason = e.toString();
            }

            postMessage({
                type: "PREFLIGHT_INPUT_DATA",
                resp: resp,
                msg: "Success: PREFLIGHT_INPUT done"
            });
        })
        .catch(error => {
            console.error(error);
            postMessage({
                type: "run_ERROR",
                msg: error.toString()
            });
        });

    /**************** OTHER EVENTS FROM UI *******************/
    } else if (type == "getMarkersForCluster") {
        loaded.then(x => {
            let cluster = payload.cluster;
            let rank_type = payload.rank_type;
            var resp = superstate.marker_detection.fetchGroupResults(cluster, rank_type);
      
            var transferrable = [];
            extractBuffers(resp, transferrable);
            postMessage({
                type: "setMarkersForCluster",
                resp: resp,
                msg: "Success: GET_MARKER_GENE done"
            }, transferrable);
        });
  
    } else if (type == "getGeneExpression") {
        loaded.then(x => {
            let row_idx = payload.gene;
            var vec = superstate.normalization.fetchExpression(row_idx);
            postMessage({
                type: "setGeneExpression",
                resp: {
                    gene: row_idx,
                    expr: vec
                },
                msg: "Success: GET_GENE_EXPRESSION done"
            }, [vec.buffer]);
        });
  
    } else if (type == "computeCustomMarkers") {
        loaded.then(x => {
            superstate.custom_selection.addSelection(payload.id, payload.selection);
            postMessage({
                type: "computeCustomMarkers",
                msg: "Success: COMPUTE_CUSTOM_MARKERS done"
            });
        });
  
    } else if (type == "getMarkersForSelection") {
        loaded.then(x => {
            var resp = superstate.custom_selection.fetchResults(payload.cluster, payload.rank_type);
            var transferrable = [];
            extractBuffers(resp, transferrable);
            postMessage({
                type: "setMarkersForCustomSelection",
                resp: resp,
                msg: "Success: GET_MARKER_GENE done"
            }, transferrable);
        });
  
    } else if (type == "removeCustomMarkers") {
        loaded.then(x => {
            superstate.custom_selection.removeSelection(payload.id);
        });
  
    } else if (type == "animateTSNE") {
        loaded.then(async (x) => {
            await superstate.tsne.animate();
            postMessage({
                type: "tsne", 
                resp: await superstate.umap.results()
            });
        });
  
    } else if (type == "animateUMAP") {
        loaded.then(async (x) => {
            await superstate.umap.animate();
            postMessage({
                type: "umap",
                resp: await superstate.umap.results()
            });
        });

    } else if (type == "getAnnotation") {
        loaded.then(x => {
            let annot = payload.annotation;
            var vec;

            // Filter to match QC unless requested otherwise.
            if (payload.unfiltered !== false) {
                vec = superstate.quality_control.fetchFilteredAnnotations(annot);
            } else {
                vec = superstate.inputs.fetchAnnotations(annot);
            }

            let extracted;
            extractBuffers(vec, extracted);
            postMessage({
                type: "setAnnotation",
                resp: {
                    annotation: annot,
                    values: vec
                },
                msg: "Success: GET_ANNOTATION done"
            }, extracted);
        });
  
    } else {
        console.error("MIM:::msg type incorrect")
    }
}
