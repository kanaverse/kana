import * as scran from "scran.js";
import * as inputs from "./_inputs.js";
import * as qc from "./_quality_control.js";
import * as normalization from "./_normalization.js";
import * as variance from "./_model_gene_var.js";
import * as pca from "./_pca.js";
import * as index from "./_neighbor_index.js";
import * as cluster_choice from "./_choose_clustering.js";
import * as kmeans_cluster from "./_kmeans_cluster.js";
import * as snn_cluster from "./_snn_cluster.js";
import * as tsne from "./_tsne_monitor.js";
import * as umap from "./_umap_monitor.js";
import * as cluster_markers from "./_score_markers.js";
import * as label_cells from "./_label_cells.js";
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

/***************************************/

const step_inputs = "inputs";
const step_qc = "quality_control";
const step_norm = "normalizaton";
const step_feat = "feature_selecton";
const step_pca = "pca";
const step_neighbors = "neighbor_index";
const step_tsne = "tsne";
const step_umap = "umap";
const step_kmeans = "kmeans_cluster";
const step_snn = "snn_cluster_graph";
const step_choice = "choose_clustering";
const step_markers = "marker_detection";
const step_labels = "cell_labelling";
const step_custom = "custom_marker_management";

function runAllSteps(state) {
    var postSuccess = function (namespace, step, message) {
        if (namespace.changed) {
            postSuccess_(namespace.results(), step, message);
        }
    }

    var postSuccessAsync = function (namespace, step, message) {
        if (namespace.changed) {
            namespace.results()
                .then(res => {
                    postSuccess_(res, step, message);
                });
        }
    }

    inputs.compute(state.files.format, state.files.files);
    postSuccess(inputs, step_inputs, "Count matrix loaded");

    qc.compute(
        state.params.qc["qc-usemitodefault"], 
        state.params.qc["qc-mito"], 
        state.params.qc["qc-nmads"]
    );
    postSuccess(qc, step_qc, "Applying quality control filters");
 
    normalization.compute();
    postSuccess(normalization, step_norm, "Log-normalization completed");

    variance.compute(state.params.fSelection["fsel-span"]);
    postSuccess(variance, step_feat, "Variance modelling completed");

    pca.compute(
        state.params.pca["pca-hvg"], 
        state.params.pca["pca-npc"]
    );
    postSuccess(pca, step_pca, "Principal components analysis completed");

    index.compute(state.params.cluster["clus-approx"]);
    postSuccess(index, step_neighbors, "Neighbor search index constructed");

    tsne.compute(
        state.params.tsne["tsne-perp"], 
        state.params.tsne["tsne-iter"], 
        state.params.tsne["animate"]
    );
    postSuccessAsync(tsne, step_tsne, "t-SNE completed");

    umap.compute(
        state.params.umap["umap-nn"], 
        state.params.umap["umap-epochs"], 
        state.params.umap["umap-min_dist"], 
        state.params.umap["animate"]
    );
    postSuccessAsync(umap, step_umap, "UMAP completed");

    let method = state.params.cluster["clus-method"];
    kmeans_cluster.compute(
        method == "kmeans", 
        state.params.cluster["kmeans-k"]
    );
    postSuccess(kmeans_cluster, step_kmeans, "K-means clustering completed");

    snn_cluster.compute(
        method == "snn_graph", 
        state.params.cluster["clus-k"], 
        state.params.cluster["clus-scheme"], 
        state.params.cluster["clus-method"]
    );
    postSuccess(kmeans_cluster, step_snn, "SNN graph clustering completed");
  
    cluster_choice.compute(state.params.cluster["clus-method"]);
    postSuccess(cluster_choice, step_choice, "Clustering of interest chosen");

    cluster_markers.compute();
    postSuccess(cluster_markers, step_markers, "Marker detection complete");

    label_cells.compute(
        state.params.annotateCells["annotateCells-human_references"],
        state.params.annotateCells["annotateCells-mouse_references"]
    );
    postSuccessAsync(label_cells, step_labels, "Cell type labelling complete");

    custom_markers.compute();
    postSuccess(custom_markers, step_custom, "Pruning of custom markers finished");

    return;
}
 
/***************************************/
 
async function serializeAllSteps(saver, embedded) {
    const path = "temp.h5";
    scran.createNewHDF5File(path);
    let output;

    try {
        await inputs.serialize(path, saver, embedded);
        qc.serialize(path);
        normalization.serialize(path);
        variance.serialize(path);
        pca.serialize(path);
        index.serialize(path);
        await tsne.serialize(path);
        await umap.serialize(path);
        kmeans_cluster.serialize(path);
        snn_cluster.serialize(path);
        cluster_choice.serialize(path);
        cluster_markers.serialize(path);
        await label_cells.serialize(path);
        custom_markers.serialize(path);

        output = scran.readFile(path);
    } finally {
        scran.removeFile(path);
    }

    return output;
}

async function unserializeAllSteps(path, loader, embedded) {
    var postSuccess = function (namespace, step, message) {
        postSuccess_(namespace.results(), step, message);
    }

    var postSuccessAsync = function (namespace, step, message) {
        namespace.results()
            .then(res => {
                postSuccess_(res, step, message);
            });
    }

    let response = { "params": {} };

    let permuter = await inputs.unserialize(path, loader, embedded);
    response["files"] = {
        "format": "kana",
        "files": []
    };
    postSuccess(inputs, step_inputs, "Reloaded count matrix");

    {
        let params = qc.unserialize(path);
        postSuccess(qc, step_qc, "Reloaded QC metrics");
        response["qc"] = {
            "qc-usemitodefault": params.use_mito_default,
            "qc-mito": params.mito_prefix,
            "qc-nmads": params.nmads
        };
    }

    normalization.unserialize(path);
    postSuccess(normalization, step_norm, "Reloaded log-normalization");

    {
        let params = variance.unserialize(path, permuter);
        postSuccess(variance, step_feat, "Reloaded variance modelling statistics");
        response["fSelection"] = {
            "fsel-span": params.span
        };
    }

    {
        let params = pca.unserialize(path);
        postSuccess(pca, step_pca, "Reloaded principal components");
        response["pca"] = {
            "pca-hvg": params.num_hvgs,
            "pca-npc": params.num_pcs
        };
    }

    {
        let params = index.unserialize(path);
        postSuccess(index, step_index, "Reloaded neighbor search index");
        response["cluster"] = {
            "clus-approx": params.approximate
        };
    }

    {
        let params = tsne.unserialize(path);
        postSuccessAsync(tsne, step_tsne, "t-SNE reloaded");
        response["tsne"] = {
            "tsne-perp": params.perplexity,
            "tsne-iter": params.iterations,
            "animate": params.animate
        };
    }

    {
        let params = umap.unserialize(path);
        postSuccessAsync(umap, step_umap, "UMAP reloaded");
        response["umap"] = {
            "umap-epochs": params.num_epochs,
            "umap-nn": params.num_neighbors,
            "umap-min_dist": params.min_dist,
            "animate": params.animate
        };
    }

    {
        let params = kmeans.unserialize(path);
        postSuccess(kmeans_cluster, step_kmeans, "K-means clustering reloaded");
        response["cluster"]["kmeans-k"] = params.k; // 'cluster' already added above.
    }

    {
        let params = snn_cluster.unserialize(path);
        postSuccess(snn_cluster, step_snn, "SNN graph clustering reloaded");
        response["cluster"]["clus-k"] = params.k;
        response["cluster"]["clus-scheme"] = params.scheme;
        response["cluster"]["clus-res"] = params.resolution;
    }

    {
        let params = choice.unserialize(path);
        postSuccess(cluster_choice, step, "Clustering of interest chosen");
        response["cluster"]["clus-method"] = params.method;
    }

    cluster_markers.unserialize(path, permuter);
    postSuccess(cluster_markers, step_markers, "Reloaded per-cluster markers");

    {
        let params = label_cells.unserialize(path);    
        postSuccessAsync(label_cells, step_labels, "Reloaded cell type labels");
        response["annotateCells"] = {
            "annotateCells-human_references": params.human_references,
            "annotateCells-mouse_references": params.mouse_references
        };
    }

    {
        let params = custom_markers.unserialize(path, permuter);
        postSuccess(custom_markers, step_custom, "Pruning of custom markers finished");
        response["custom-selections"] = params;
    }

    return;
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
                    console.error(error);
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
                runAllSteps(payload.payload)
            })
            .catch(error => {
                console.error(error);
                postMessage({
                    type: "run_ERROR",
                    msg: error.toString()
                });
            });

    /**************** LOADING EXISTING ANALYSES *******************/
    } else if (payload.type == "LOAD") {
        const path = "temp.h5";

        if (payload.payload.files.format == "kana") {
            let f = payload.payload.files.files.file[0];
            loaded
                .then(async (x) => {
                    const reader = new FileReaderSync();
                    let res = reader.readAsArrayBuffer(f);
                    try {
                        let loaders = await serialize_utils.load(res, path);
                        let response = unserializeAllSteps(path, loaders.loader, loaders.embedded);
                        postMessage({
                            type: "loadedParameters",
                            resp: response
                        });
                    } finally {
                        if (scran.fileExists(path)) {
                            scran.removeFile(path);
                        }
                    }
                })
                .catch(error => {
                    console.error(error);
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
                        try {
                            let loaders = await serialize_utils.load(res, path);
                            let response = unserializeAllSteps(path, loaders.loader, loaders.embedded);
                            postMessage({
                                type: "loadedParameters",
                                resp: response
                            });
                        } finally {
                            if (scran.fileExists(path)) {
                                scran.removeFile(path);
                            }
                        }
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
    } else if (payload.type == "EXPORT") { 
        loaded
            .then(async (x) => {
                var savers = await serialize_utils.createSaver(true);
                var state = await serializeAllSteps(savers.saver, true);
                var output = await serialize_utils.saveEmbedded(state, savers.collected, true);
                postMessage({
                    type: "exportState",
                    resp: output,
                    msg: "Success: application state exported"
                }, [output]);
            })
            .catch(error => {
                console.error(error);
                postMessage({
                    type: "export_ERROR",
                    msg: error.toString()
                });
            });
 
    } else if (payload.type == "SAVEKDB") { // save analysis to inbrowser indexedDB 
        var title = payload.payload.title;
        loaded
            .then(async (x) => {
                var savers = await serialize_utils.createSaver(false);
                var state = await runAllSteps(savers.saver, false);
                var output = await serialize_utils.saveLinked(state, savers.collected, title);
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
                        msg: `Fail: Cannot save analysis to cache (${id})`
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
                    console.error(error);
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
        console.error("MIM:::msg type incorrect")
    }
}
