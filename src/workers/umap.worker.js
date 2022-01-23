import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as vizutils from "./_utils_viz_child.js";

var cache = {};
var init_changed = false;
var init_parameters = {};
var run_parameters = {};

function rerun(animate) {
    var delay = vizutils.chooseDelay(animate);
    var current_status = cache.init.clone();

    try {
        cache.total = current_status.totalEpochs();
        for (; current_status.currentEpoch() < cache.total; ) {
            scran.runUMAP(current_status, { runTime: delay });

            if (animate) {
                var xy = current_status.extractCoordinates();
                postMessage({
                    "type": "umap_iter",
                    "x": xy.x,
                    "y": xy.y,
                    "iteration": current_status.currentEpoch()
                }, [xy.x.buffer, xy.y.buffer]);
            }
        }
        cache.final = current_status.extractCoordinates();
    } finally {
        current_status.free();
    }
}

var loaded;
onmessage = function(msg) {
    var id = msg.data.id;

    if (msg.data.cmd == "INIT") {
        loaded = scran.initialize({ numberOfThreads: 1 });
        loaded
            .then(x => {
                postMessage({
                    "id": id,
                    "type": "init_worker",
                    "data": { "status": "SUCCESS" }
                });
            })
            .catch(error => {
                postMessage({ 
                    "id": id,
                    "type": "error",
                    "error": error
                });
            });

    } else if (msg.data.cmd == "RUN") {
        loaded
            .then(x => {
                var new_neighbors;
                if ("neighbors" in msg.data) {
                    utils.freeCache(cache.neighbors);
                    cache.neighbors = vizutils.recreateNeighbors(msg.data.neighbors);
                    new_neighbors = true;
                } else {
                    new_neighbors = false;
                }
        
                var init_args = { "min_dist": msg.data.params.min_dist, "num_epochs": msg.data.params.num_epochs };
                if (!new_neighbors && !utils.changedParameters(init_args, init_parameters)) {
                    init_changed = false;
                } else {
                    utils.freeCache(cache.init);
                    cache.init = scran.initializeUMAP(cache.neighbors, { epochs: init_args.num_epochs, minDist: init_args.min_dist });
                    init_parameters = init_args;
                    init_changed = true;
                }
        
                // Nothing downstream depends on the run results, so we don't set any changed flag.
                var run_args = {};
                if (init_changed || utils.changedParameters(run_args, run_parameters)) {
                    rerun(msg.data.params.animate);
                    run_parameters = run_args;
                }
        
                postMessage({
                    "id": id,
                    "type": "umap_run",
                    "data": { "status": "SUCCESS" }
                });
            })
            .catch(error => {
                postMessage({ 
                    "id": id,
                    "type": "error",
                    "error": error
                });
            });
    
    } else if (msg.data.cmd == "RERUN") {
        loaded
            .then(x => {
                rerun(true);
                postMessage({
                    "id": id,
                    "type": "umap_rerun",
                    "data": { "status": "SUCCESS" }
                });
            })
            .catch(error => {
                postMessage({
                    "id": id,
                    "type": "error",
                    "error": error
                });
            });
          
    } else if (msg.data.cmd == "FETCH") {
        loaded
            .then(x => {
                var xy = cache.final;
                var info = {
                    "x": xy.x,
                    "y": xy.y,
                    "iterations": cache.total
                };
                
                var transfer = [];
                utils.extractBuffers(info, transfer);
                postMessage({
                    "id": id,
                    "type": "umap_fetch",
                    "data": info
                }, transfer);
            })
            .catch(error => {
                postMessage({ 
                    "id": id,
                    "type": "error",
                    "error": error
                });
            });
    }
}
