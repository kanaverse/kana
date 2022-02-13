import * as scran from "scran.js";
import * as inputs from "./_inputs.js";
import * as metrics from "./_qc_metrics.js";
import * as thresholds from "./_qc_thresholds.js";
import * as filter from "./_qc_filter.js";
import * as normalization from "./_normalization.js";
import * as variance from "./_model_gene_var.js";
import * as pca from "./_pca.js";
import * as index from "./_neighbor_index.js";
import * as cluster_choice from "./_choose_clustering.js";
import * as kmeans_cluster from "./_kmeans_cluster.js";
import * as snn_cluster from "./_snn_cluster.js";
import * as snn_graph from "./_snn_graph.js";
import * as snn_neighbors from "./_snn_neighbors.js";
import * as tsne from "./_tsne_monitor.js";
import * as umap from "./_umap_monitor.js";
import * as cluster_markers from "./_score_markers.js";
import * as custom_markers from "./_custom_markers.js";
import * as kana_db from "./KanaDBHandler.js";
import * as utils from "./_utils.js";
import * as serialize_utils from "./_utils_serialize.js";

/***************************************/

function postSuccess_(info, step, message) {
    var transferable = [];
    utils.extractBuffers(info, transferable);
    postMessage({
        type: `${step}_DATA`,
        resp: info,
        msg: "Success: " + message
    }, transferable);
}

function runAllSteps(mode = "run", state = null) {
    var response;
    if (mode === "serialize") {
        response = {};
    } else {
        if (state == null) {
            throw "'state' must be supplied if 'mode' is not 'serialize'";
        }
        if (mode === "unserialize") {
            response = { "params": {} };
        }
    }
  
    // Creating helper functions.
    var postSuccess = function (namespace, step, message) {
        if (namespace.changed || mode == "unserialize") {
            postSuccess_(namespace.results(), step, message);
        }
    }
  
    var postSuccessAsync = function (namespace, step, message) {
        if (namespace.changed || mode == "unserialize") {
            namespace.results()
                .then(res => {
                    postSuccess_(res, step, message);
                });
        }
    }
  
    var addToObject = function (object, property, value) {
        if (property in object) {
            object[property] = { ...object[property], ...value };
        } else {
            object[property] = value;
        }
    }
  
    // Running through all steps.
    {
        let step = "inputs";
        if (mode === "serialize") {
            response[step] = inputs.serialize()
        } else {
            if (mode == "run") {
                inputs.compute({
                    "format": state.files.format,
                    "files": state.files.files
                });
            } else {
                inputs.unserialize(state[step]);
                response["files"] = {
                    "format": "kana",
                    "files": []
                };
            }
            postSuccess(inputs, step, "Count matrix loaded");
        }
    }
  
    {
        let step = "quality_control_metrics";
        if (mode === "serialize") {
            response[step] = metrics.serialize();
        } else {
            if (mode == "run") {
                metrics.compute({
                    "use_mito_default": state.params.qc["qc-usemitodefault"],
                    "mito_prefix": state.params.qc["qc-mito"]
                });
            } else {
                metrics.unserialize(state[step]);
                addToObject(response["params"], "qc", {
                    "qc-usemitodefault": state[step].parameters.use_mito_default,
                    "qc-mito": state[step].parameters.mito_prefix
                });
            }
            postSuccess(metrics, step, "QC metrics computed");
        }
    }
  
    {
        let step = "quality_control_thresholds";
        if (mode === "serialize") {
            response[step] = thresholds.serialize();
        } else {
            if (mode == "run") {
                thresholds.compute({
                    "nmads": state.params.qc["qc-nmads"]
                });
            } else {
                thresholds.unserialize(state[step]);
                addToObject(response["params"], "qc", {
                    "qc-nmads": state[step].parameters.nmads
                });
            }
            postSuccess(thresholds, step, "QC thresholds computed");
        }
    }
  
    {
        let step = "quality_control_filtered";
        if (mode == "serialize") {
            response[step] = filter.serialize();
        } else {
            if (mode == "run") {
                filter.compute({});
            } else {
                filter.unserialize(state[step]);
            }
            postSuccess(filter, step, "QC filtering completed");
        }
    }
  
    {
        let step = "normalization";
        if (mode == "serialize") {
            response[step] = normalization.serialize();
        } else {
            if (mode == "run") {
                normalization.compute({});
            } else {
                normalization.unserialize(state[step]);
            }
            postSuccess(normalization, step, "Log-normalization completed");
        }
    }
  
    {
        let step = "feature_selection";
        if (mode == "serialize") {
            response[step] = variance.serialize();
        } else {
            if (mode == "run") {
                variance.compute({
                    "span": state.params.fSelection["fsel-span"]
                });
            } else {
                variance.unserialize(state[step]);
                addToObject(response["params"], "fSelection", {
                    "fsel-span": state[step].parameters.span
                });
            }
            postSuccess(variance, step, "Variance modelling completed");
        }
    }
  
    {
        let step = "pca";
        if (mode == "serialize") {
            response[step] = pca.serialize();
        } else {
            if (mode == "run") {
                pca.compute({
                    "num_hvgs": state.params.pca["pca-hvg"],
                    "num_pcs": state.params.pca["pca-npc"]
                });
            } else {
                pca.unserialize(state[step]);
                addToObject(response["params"], "pca", {
                    "pca-hvg": state[step].parameters.num_hvgs,
                    "pca-npc": state[step].parameters.num_pcs
                });
            }
            postSuccess(pca, step, "Principal components analysis completed");
        }
    }
  
    {
        let step = "neighbor_index";
        if (mode == "serialize") {
            response[step] = index.serialize();
        } else {
            if (mode == "run") {
                index.compute({
                    "approximate": state.params.cluster["clus-approx"]
                });
            } else {
                index.unserialize(state[step]);
                addToObject(response["params"], "cluster", {
                    "clus-approx": state[step].parameters.approximate
                });
            }
            postSuccess(index, step, "Neighbor search index constructed");
        }
    }

    // Need to handle promises in serialize(), results() output,
    // as these are coming from other workers and are inherently async.
    var tsne_res;
    {
        let step = "tsne";
        if (mode == "serialize") {
            tsne_res = tsne.serialize();
        } else {
            if (mode == "run") {
                tsne.compute({
                    "perplexity": state.params.tsne["tsne-perp"],
                    "iterations": state.params.tsne["tsne-iter"],
                    "animate": state.params.tsne["animate"]
                });
            } else {
                tsne.unserialize(state[step]);
                addToObject(response["params"], "tsne", {
                  "tsne-perp": state[step].parameters.perplexity,
                  "tsne-iter": state[step].parameters.iterations,
                  "animate": state[step].parameters.animate
                });
            }
            postSuccessAsync(tsne, step, "t-SNE completed");
        }
    }

    var umap_res;
    {
        let step = "umap";
        if (mode == "serialize") {
            umap_res = umap.serialize();
        } else {
            if (mode == "run") {
                umap.compute({
                    "num_epochs": state.params.umap["umap-epochs"],
                    "num_neighbors": state.params.umap["umap-nn"],
                    "min_dist": state.params.umap["umap-min_dist"],
                    "animate": state.params.umap["animate"]
                });
            } else {
                umap.unserialize(state[step]);
                addToObject(response["params"], "umap", {
                    "num_epochs": state[step].parameters.num_epochs,
                    "num_neighbors": state[step].parameters.num_neighbors,
                    "min_dist": state[step].parameters.min_dist,
                    "animate": state[step].parameters.animate
                });
            }
            postSuccessAsync(umap, step, "UMAP completed");
        }
    }
  
    // Back to normal programming.
    {
        let step = "kmeans_cluster";
        if (mode == "serialize") {
            response[step] = kmeans_cluster.serialize();
        } else {
            if (mode == "run") {
                // Only reporting the method to decide whether to execute this
                // step; this does not need to be unserialized, as it is 
                // remembered by the choose_clustering step.
                kmeans_cluster.compute({
                    "k": state.params.cluster["kmeans-k"],
                    "cluster_method": state.params.cluster["clus-method"] 
                });
            } else {
                kmeans_cluster.unserialize(state[step]);
                addToObject(response["params"], "cluster", {
                    "kmeans-k": state[step].parameters.k
                });
            }
            postSuccess(kmeans_cluster, step, "K-means clustering completed");
        }
    }

    {
        let step = "snn_find_neighbors";
        if (mode == "serialize") {
            response[step] = snn_neighbors.serialize();
        } else {
            if (mode == "run") {
                // Only reporting the method to decide whether to execute this
                // step; this does not need to be unserialized, as it is 
                // remembered by the choose_clustering step.
                snn_neighbors.compute({
                    "k": state.params.cluster["clus-k"],
                    "cluster_method": state.params.cluster["clus-method"]
                });
            } else {
                snn_neighbors.unserialize(state[step]);
                addToObject(response["params"], "cluster", {
                    "clus-k": state[step].parameters.k
                });
            }
            postSuccess(snn_neighbors, step, "Shared nearest neighbor search completed");
        }
    }
  
    {
        let step = "snn_build_graph";
        if (mode == "serialize") {
            response[step] = snn_graph.serialize();
        } else {
            if (mode == "run") {
                snn_graph.compute({
                    "scheme": state.params.cluster["clus-scheme"]
                });
            } else {
                snn_graph.unserialize(state[step]);
                addToObject(response["params"], "cluster", {
                    "clus-scheme": state[step].parameters.scheme
                });
            }
            postSuccess(snn_graph, step, "Shared nearest neighbor graph constructed");
        }
    }
  
    {
        let step = "snn_cluster_graph";
        if (mode == "serialize") {
            response[step] = snn_cluster.serialize();
        } else {
            if (mode == "run") {
                snn_cluster.compute({
                    "resolution": state.params.cluster["clus-res"]
                });
            } else {
                snn_cluster.unserialize(state[step]);
                addToObject(response["params"], "cluster", {
                    "clus-res": state[step].parameters.resolution
                });
            }
            postSuccess(snn_cluster, step, "Community detection from SNN graph complete");
        }
    }

    {
        let step = "choose_clustering";
        if (mode == "serialize") {
            response[step] = cluster_choice.serialize();
        } else {
            if (mode == "run") {
                cluster_choice.compute({
                    "method": state.params.cluster["clus-method"]
                });
            } else {
                cluster_choice.unserialize(state[step]);
                addToObject(response["params"], "cluster", {
                    "clus-method": state[step].parameters.method
                });
            }
            postSuccess(cluster_choice, step, "Clustering of interest chosen");
        }
    }

    {
        let step = "marker_detection";
        if (mode == "serialize") {
            response[step] = cluster_markers.serialize();
        } else {
            if (mode == "run") {
                cluster_markers.compute({});
            } else {
                cluster_markers.unserialize(state[step]);
            }
            postSuccess(cluster_markers, step, "Marker detection complete");
        }
    }

    {
        let step = "custom_marker_management";
        if (mode == "serialize") {
            response[step] = custom_markers.serialize();
        } else {
            if (mode == "run") {
                custom_markers.compute({});
            } else {
                custom_markers.unserialize(state[step]);
            }
            postSuccess(custom_markers, step, "Pruning of custom markers finished");
        }
    }
  
    if (mode == "serialize") {
        return Promise.all([tsne_res, umap_res])
            .then(done => {
                response.tsne = done[0];
                response.umap = done[1];
                return response;
            });
    } else {
        return response;
    }
}

/***************************************/

var loaded;
onmessage = function (msg) {
    const payload = msg.data;
    if (payload.type == "INIT") {
        let nthreads = Math.round(navigator.hardwareConcurrency * 2 / 3);
        let scran_init = scran.initialize({ numberOfThreads: nthreads });
        scran_init 
            .then(x => {
                postMessage({
                    type: payload.type,
                    msg: `Success: ScranJS/WASM initialized`
                });
            });

        let kana_init = kana_db.initialize();
        kana_init
            .then(result => {
                if (result !== null) {
                    postMessage({
                        type: "KanaDB_store",
                        resp: result,
                        msg: "Success"
                    });
                } else {
                    console.log(error);
                    postMessage({
                        type: "KanaDB_ERROR",
                        msg: `Fail: Cannot initialize DB`
                    });
                }
            });

        let tsne_init = tsne.initialize();
        let umap_init = umap.initialize();

        loaded = Promise.all([
            scran_init,
            kana_init,
            tsne_init,
            umap_init
        ]);

    } else if (payload.type == "RUN") {
        loaded
            .then(x => {
                runAllSteps("run", payload.payload)
            })
            .catch(error => {
                console.log(error);
                postMessage({
                    type: "run_ERROR",
                    msg: error.toString()
                });
            });

    /**************** LOADING EXISTING ANALYSES *******************/
    } else if (payload.type == "LOAD") {
        if (payload.payload.files.format == "kana") {
            const reader = new FileReaderSync();
            var f = payload.payload.files.files.file[0];
            loaded
                .then(async (x) => {
                    var contents = await serialize_utils.load(reader.readAsArrayBuffer(f));
                    var response = runAllSteps("unserialize", contents);
                    postMessage({
                        type: "loadedParameters",
                        resp: response
                    });
                })
                .catch(error => {
                    console.log(error);
                    postMessage({
                        type: "load_ERROR",
                        msg: error.toString()
                    });
                });

        } else if (payload.payload.files.format == "kanadb") {
            var id = payload.payload.files.files.file;
            kana_db.loadAnalysis(id)
                .then(async (res) => {
                    if (res == null) {
                        postMessage({
                            type: "KanaDB_ERROR",
                            msg: `Fail: cannot load analysis ID '${id}'`
                        });
                    } else {
                        var contents = await serialize_utils.load(res);
                        var response = await runAllSteps("unserialize", contents);
                        postMessage({
                            type: "loadedParameters",
                            resp: response
                        });
                    }
                })
                .catch(error => {
                    console.log(error);
                    postMessage({
                        type: "load_ERROR",
                        msg: error.toString()
                    });
                });
        }
  
    } else if (payload.type == "EXPORT") { // exporting an analysis
        loaded
            .then(async (x) => {
                var state = await runAllSteps("serialize");
                var output = await serialize_utils.save(state, "full");
                postMessage({
                    type: "exportState",
                    resp: output,
                    msg: "Success: application state exported"
                }, [output]);
            })
            .catch(error => {
                console.log(error);
                postMessage({
                    type: "export_ERROR",
                    msg: error.toString()
                });
            });
  
    } else if (payload.type == "SAVEKDB") { // save analysis to inbrowser indexedDB 
        var title = payload.payload.title;
        loaded
            .then(async (x) => {
                var state = await runAllSteps("serialize");
                var output = await serialize_utils.save(state, "KanaDB");
                var id = await kana_db.saveAnalysis(null, output.state, output.file_ids, title);
                if (id !== null) {
                    let recs = await kana_db.getRecords();
                    postMessage({
                        type: "KanaDB_store",
                        resp: recs,
                        msg: `Success: Saved analysis to cache (${id})`
                    });
                } else {
                    console.log(error);
                    postMessage({
                        type: "KanaDB_ERROR",
                        msg: `Fail: Cannot save analysis to cache (${id})`
                    });
                }
            })
            .catch(error => {
                console.log(error);
                postMessage({
                    type: "export_ERROR",
                    msg: error.toString()
                });
            });
  
    } else if (payload.type == "REMOVEKDB") { // remove a saved analysis
        var id = payload.payload.id;
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
                    console.log(error);
                    postMessage({
                        type: "KanaDB_ERROR",
                        msg: `fail: cannot remove file from cache (${id})`
                    });
                }
            });
  
    /**************** OTHER EVENTS FROM UI *******************/
    } else if (payload.type == "getMarkersForCluster") {
        loaded.then(x => {
            let cluster = payload.payload.cluster;
            let rank_type = payload.payload.rank_type;
            var resp = cluster_markers.fetchGroupResults(rank_type, cluster);
      
            var transferrable = [];
            utils.extractBuffers(resp, transferrable);
            postMessage({
                type: "setMarkersForCluster",
                resp: resp,
                msg: "Success: GET_MARKER_GENE done"
            }, transferrable);
        });
  
    } else if (payload.type == "getGeneExpression") {
        loaded.then(x => {
            let row_idx = payload.payload.gene;
            var vec = normalization.fetchExpression(row_idx);
            postMessage({
                type: "setGeneExpression",
                resp: {
                    gene: row_idx,
                    expr: vec
                },
                msg: "Success: GET_GENE_EXPRESSION done"
            }, [vec.buffer]);
        });
  
    } else if (payload.type == "computeCustomMarkers") {
        loaded.then(x => {
            custom_markers.addSelection(payload.payload.id, payload.payload.selection);
            postMessage({
                type: "computeCustomMarkers",
                msg: "Success: COMPUTE_CUSTOM_MARKERS done"
            });
        });
  
    } else if (payload.type == "getMarkersForSelection") {
        loaded.then(x => {
            var resp = custom_markers.fetchResults(payload.payload.cluster, payload.payload.rank_type);
            var transferrable = [];
            utils.extractBuffers(resp, transferrable);
            postMessage({
                type: "setMarkersForCustomSelection",
                resp: resp,
                msg: "Success: GET_MARKER_GENE done"
            }, transferrable);
        });
  
    } else if (payload.type == "removeCustomMarkers") {
        loaded.then(x => {
            custom_markers.removeSelection(payload.payload.id);
        });
  
    } else if (payload.type == "animateTSNE") {
        loaded.then(async (x) => {
            await tsne.animate();
            var res = await tsne.results();
            postSuccess_(res, "tsne", "Resending t-SNE coordinates");
        });
  
    } else if (payload.type == "animateUMAP") {
        loaded.then(async (x) => {
            await umap.animate();
            var res = await umap.results();
            postSuccess_(res, "umap", "Resending UMAP coordinates");
        });

    } else if (payload.type == "getAnnotation") {
        loaded.then(x => {
            let annot = payload.payload.annotation;
            var vec = inputs.fetchAnnotations(annot);
            postMessage({
                type: "setAnnotation",
                resp: {
                    annotation: annot,
                    values: {
                        "index": vec.index,
                        "factor": vec.factor
                    }
                },
                msg: "Success: GET_ANNOTATION done"
            }, [vec.factor.buffer]);
        });
  
    } else {
        console.log("MIM:::msg type incorrect")
    }
}
