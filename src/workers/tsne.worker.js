import * as scran from "scran.js";
import * as utils from "./_utils.js";
import * as vizutils from "./_utils_viz_child.js";

var cache = {};
var init_changed = false;
var init_parameters = {};
var run_parameters = {};

function rerun(animate, iterations) {
    var num_obs = cache.init.numberOfCells(); 
    var delay = vizutils.chooseDelay(animate);
    var current_status = cache.init.clone();

    try {
        for (; current_status.iterations() < iterations; ) {
            scran.runTSNE(current_status, { runTime: delay, maxIterations: iterations }); 
  
            if (animate) {
                let xy = current_status.extractCoordinates();
                postMessage({
                    "type": "tsne_iter",
                    "x": xy.x,
                    "y": xy.y,
                    "iteration": current_status.iterations()
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

                var init_args = { "perplexity": msg.data.params.perplexity };
                if (!new_neighbors && !utils.changedParameters(init_args, init_parameters)) {
                    init_changed = false;
                } else {
                    utils.freeCache(cache.init);
                    cache.init = scran.initializeTSNE(cache.neighbors, { perplexity: init_args.perplexity });
                    init_parameters = init_args;
                    init_changed = true;
                }

                // Nothing downstream depends on the run results, so we don't set any changed flag.
                var run_args = { "iterations": msg.data.params.iterations };
                if (init_changed || utils.changedParameters(run_args, run_parameters)) {
                    rerun(msg.data.params.animate, run_args.iterations);
                    run_parameters = run_args;
                }
          
                postMessage({
                    "id": id,
                    "type": "tsne_run",
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
                rerun(true, run_parameters.iterations);
                postMessage({
                    "id": id,
                    "type": "tsne_rerun",
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
                let xy = vizutils.cloneXY(cache.final);
                var info = {
                    "x": xy.x,
                    "y": xy.y,
                    "iterations": run_parameters.iterations
                };
  
                var transfer = [];
                utils.extractBuffers(info, transfer);
                postMessage({
                    "id": id,
                    "type": "tsne_fetch",
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
