import WasmBuffer from "./WasmBuffer.js";
import * as scran_utils from "./_utils.js";
import * as scran_utils_viz_child from "_utils_viz_child.js";

var cache = {};
var init_changed = false;
var init_parameters = {};
var run_parameters = {};

function rerun(wasm, animate, iterations) {
  var num_obs = cache.init.num_obs(); 
  var buffer = scran_utils.allocateBuffer(wasm, num_obs * 2, "Float64Array", cache);
  wasm.randomize_tsne_start(num_obs, buffer.ptr, 42);

  var delay = scran_utils_viz_child.chooseDelay(animate);
  var current_status = cache.init.deepcopy();
  try {
    for (; current_status.iterations() < iterations; ) {
      wasm.run_tsne(current_status, delay, iterations, buffer.ptr);
      if (animate) {
        var xy = scran_utils_viz_child.extractXY(buffer);
        postMessage({
          "type": "tsne_iter",
          "x": xy.x,
          "y": xy.y,
          "iteration": current_status.iterations()
        }, [xy.x.buffer, xy.y.buffer]);
      }
    }
  } finally {
    current_status.delete();
  }
}

var loaded;
onmessage = function(msg) {
  var id = msg.data.id;

  if (msg.data.cmd == "INIT") {
    importScripts("./scran.js");
    loaded = loadScran();
    loaded.then(wasm => {
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
    loaded.then(wasm => {
      var new_neighbors;
      if ("neighbors" in msg.data) {
        scran_utils.freeCache(cache.neighbors);
        cache.neighbors = scran_utils_viz_child.recreateNeighbors(wasm, msg.data.neighbors);
        new_neighbors = true;
      } else {
        new_neighbors = false;
      }

      var init_args = { "perplexity": msg.data.params.perplexity };
      if (!new_neighbors && !scran_utils.changedParameters(init_args, init_parameters)) {
        init_changed = false;
      } else {
        scran_utils.freeCache(cache.init);
        cache.init = wasm.initialize_tsne(cache.neighbors, init_args.perplexity);
        init_parameters = init_args;
        init_changed = true;
      }

      // Nothing downstream depends on the run results, so we don't set any changed flag.
      var run_args = { "iterations": msg.data.params.iterations };
      if (init_changed || scran_utils.changedParameters(run_args, run_parameters)) {
        rerun(wasm, msg.data.params.animate, run_args.iterations);
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
    loaded.then(wasm => {
      rerun(wasm, true, run_parameters.iterations);

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
    loaded.then(wasm => {
      var xy = scran_utils_viz_child.extractXY(cache.buffer);
      var info = {
        "x": xy.x,
        "y": xy.y,
        "iterations": run_parameters.iterations
      };

      var transfer = [];
      scran_utils.extractBuffers(info, transfer);
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
