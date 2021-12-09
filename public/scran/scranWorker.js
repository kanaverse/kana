importScripts("./scran.api.js");
// import {scranSTATE, scran} from './scran.js';
// import 'scran_wasm.js';
importScripts("https://cdn.jsdelivr.net/npm/d3-dsv@3");
importScripts("https://cdn.jsdelivr.net/npm/d3-scale@4");

const DATA_PATH = "/data";
var wasmModule = null;
var data = null;
var state = null;

function run_steps(step, state) {
    var self = this;
    const state_list = ["load",
        "qc", "fSelection", "pca",
        "build_neighbor_index",
        "snn_find_neighbors",
        "snn_build_graph",
        "snn_cluster_graph",
        "markerGene"
    ];

    // TODO: need to return error messages, but it stops when there's an error in 
    // a particular step
    switch (step) {
        case 0:
            try {
                var t0 = performance.now();
                data.mountFiles(state.files);
                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });

                postMessage({
                    type: `${state_list[step]}_DIMS`,
                    resp: `${data.matrix.nrow()} X ${data.matrix.ncol()}`,
                    msg: `Success: Data loaded, dimensions: ${data.matrix.nrow()}, ${data.matrix.ncol()}`
                });

                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        case 1:
            try {
                var t0 = performance.now();
                var resp = data.qcMetrics(state.params.qc["qc-nmads"]);
                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });

                postMessage({
                    type: `${state_list[step]}_DIMS`,
                    resp: `${data.filteredMatrix.nrow()} X ${data.filteredMatrix.ncol()}`,
                    msg: `Success: Data filtered, dimensions: ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}`
                });

                postMessage({
                    type: `${state_list[step]}_DATA`,
                    resp: JSON.parse(JSON.stringify(resp)),
                    msg: `Success: QC Complete, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}`
                });

                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        case 2:
            try {
                var t0 = performance.now();
                var resp = data.fSelection(state.params.fSelection["fsel-span"]);

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });

                postMessage({
                    type: `${state_list[step]}_DIMS`,
                    resp: `${data.filteredMatrix.nrow()} X ${data.filteredMatrix.ncol()}`,
                    msg: `Success: Data filtered, dimensions: ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}`
                });

                postMessage({
                    type: `${state_list[step]}_DATA`,
                    resp: JSON.parse(JSON.stringify(resp)),
                    msg: `Success: FSEL done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}`
                });

                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        case 3:
            try {
                var t0 = performance.now();
                var resp = data.runPCA(state.params.pca["pca-npc"]);
                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });

                postMessage({
                    type: `${state_list[step]}_DATA`,
                    resp: JSON.parse(JSON.stringify(resp)),
                    msg: `Success: PCA done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}` + " took " + (t1 - t0) + " milliseconds."
                });
                step++;
            } catch (error) {
                console.error(step);
                console.error(error);
                break;
            }
        case 4:
            try {
                var t0 = performance.now();
                data.buildNeighborIndex(state.params.cluster["clus-approx"]);
                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;

                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });
                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        case 5:
            try {
                var t0 = performance.now();
                data.findSNNeighbors(state.params.cluster["clus-k"]);

                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });

                // postMessage({
                //     type: `${state_list[step]}_DATA`,
                //     resp: JSON.parse(JSON.stringify(resp)),
                //     msg: `Success: CLUS done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}` + " took " + (t1 - t0) + " milliseconds."
                // });
                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        case 6:
            try {
                var t0 = performance.now();

                // scheme is how its weighted
                //  0, 1, 2 (jaccard index)
                data.buildSNNGraph(state.params.cluster["clus-scheme"]);

                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });

                // postMessage({
                //     type: `${state_list[step]}_DATA`,
                //     resp: JSON.parse(JSON.stringify(resp)),
                //     msg: `Success: CLUS done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}` + " took " + (t1 - t0) + " milliseconds."
                // });
                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        case 7:
            try {
                var t0 = performance.now();
                var resp = data.clusterSNNGraph(state.params.cluster["clus-res"]);
                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });

                postMessage({
                    type: `${state_list[step]}_DATA`,
                    resp: JSON.parse(JSON.stringify(resp)),
                    msg: `Success: CLUS done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}` + " took " + (t1 - t0) + " milliseconds."
                });
                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        case 8:
            try {
                var t0 = performance.now();
                var resp = data.markerGenes();
                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });

                postMessage({
                    type: `${state_list[step]}_DATA`,
                    resp: JSON.parse(JSON.stringify(resp)),
                    msg: `Success: MARKER_GENE done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}` + " took " + (t1 - t0) + " milliseconds."
                });
                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        case 9:
            // t-SNE - for now to get things to work
            try {
                var t0 = performance.now();
                data.initializeTsne(state.params.tsne["tsne-perp"])
                var resp = data.runTsne(state.params.tsne["tsne-iter"]);
                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });

                postMessage({
                    type: `${state_list[step]}_DATA`,
                    resp: JSON.parse(JSON.stringify(resp)),
                    msg: `Success: TSNE done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}` + " took " + (t1 - t0) + " milliseconds."
                });
                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        case 10:
            // UMAP - for now to get things to work
            try {
                var t0 = performance.now();
                data.initializeUmapNeighbors(state.params.umap["umap-nn"]);
                data.initializeUmap(state.params.umap["umap-epochs"], state.params.umap["umap-min_dist"])
                var resp = data.runUmap();
                var t1 = performance.now();

                var ftime = (t1 - t0) / 1000;
                postMessage({
                    type: `${state_list[step]}_DONE`,
                    resp: `~${ftime.toFixed(2)} sec`,
                    msg: 'Done'
                });
                console.log(resp);

                postMessage({
                    type: `${state_list[step]}_DATA`,
                    resp: JSON.parse(JSON.stringify(resp)),
                    msg: `Success: UMAP done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}` + " took " + (t1 - t0) + " milliseconds."
                });
                step++;
            } catch (error) {
                console.log(error);
                break;
            }
        default:
            console.log(`${step} invalid`);
            break;
    }
}

onmessage = function (msg) {
    var self = this;
    console.log("in worker");
    console.log(msg.data);

    const payload = msg.data;

    if (payload.type == "INIT") {
        // TODO: parcel2 doesn't load inline importScripts
        importScripts("./scran.js");

        loadScran()
            .then((Module) => {
                // FS.mkdir(DATA_PATH, 0o777);
                data = new scran({}, Module);
                state = new scranSTATE();

                postMessage({
                    type: payload.type,
                    msg: `Success: ScranJS/WASM initialized`
                });
            })

        // Module.onRuntimeInitialized = function load_done_callback() {
        //     FS.mkdir(DATA_PATH, 0o777);
        //     data = new scran({}, Module);
        //     state = new scranSTATE();

        //     postMessage({
        //         type: payload.type,
        //         msg: `Success: ScranJS/WASM initialized`
        //     });
        // }
    } else if (payload.type == "RUN") {
        var diff = 0;

        if (!state.get_state()) {
            state.set_state(payload.payload);
        } else {
            diff = state.diff(payload.payload);
        }
        state.set_state(payload.payload);
        run_steps(diff, state.get_state());
    }
    // custom events from UI
    else if (payload.type == "setQCThresholds") {
        data.thresholds = payload.input;

        postMessage({
            type: "qc_DIMS",
            resp: `${data.filteredMatrix.nrow()} X ${data.filteredMatrix.ncol()}`,
            msg: `Success: QC - Thresholds Sync Complete, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}`
        })
    } else if (payload.type == "getMarkersForCluster") {
        var t0 = performance.now();
        var resp = data.getClusterMarkers(payload.input[0]);
        var t1 = performance.now();

        postMessage({
            type: "setMarkersForCluster",
            resp: JSON.parse(JSON.stringify(resp)),
            msg: `Success: GET_MARKER_GENE done, ${data.filteredMatrix.nrow()}, ${data.filteredMatrix.ncol()}` + " took " + (t1 - t0) + " milliseconds."
        });
    } else {
        console.log("MIM:::msg type incorrect")
    }
}
