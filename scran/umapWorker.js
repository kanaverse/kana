importScripts("./WasmBuffer.js");
importScripts("./_utils.js");
importScripts("./_utils_viz_child.js");

var cache = {};
var init_changed = false;
var init_parameters = {};
var run_parameters = {};

function rerun(wasm, animate) {
  var current_status = cache.init.deepcopy();
  var current_buffer = scran_utils.allocateBuffer(wasm, cache.buffer_start.size, "Float64Array", cache, "buffer_end");
  current_buffer.set(cache.buffer_start.array());

  var delay = scran_utils_viz_child.chooseDelay(animate);
  try {
    cache.total = current_status.num_epochs();
    for (; current_status.epoch() < cache.total; ) {
      wasm.run_umap(current_status, delay, current_buffer.ptr);
      if (animate) {
        var xy = scran_utils_viz_child.extractXY(current_buffer);
        postMessage({
          "type": "umap_iter",
          "x": xy.x,
          "y": xy.y,
          "iteration": current_status.epoch()
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

      var init_args = { "min_dist": msg.data.params.min_dist, "num_epochs": msg.data.params.num_epochs };
      if (!new_neighbors && !scran_utils.changedParameters(init_args, init_parameters)) {
        init_changed = false;
      } else {
        scran_utils.freeCache(cache.init);
        var buffer = scran_utils.allocateBuffer(wasm, cache.neighbors.num_obs() * 2, "Float64Array", cache, "buffer_start");
        cache.init = wasm.initialize_umap(cache.neighbors, init_args.num_epochs, init_args.min_dist, buffer.ptr);
        init_parameters = init_args;
        init_changed = true;
      }

      // Nothing downstream depends on the run results, so we don't set any changed flag.
      var run_args = {};
      if (init_changed || scran_utils.changedParameters(run_args, run_parameters)) {
        rerun(wasm, msg.data.params.animate);
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
    loaded.then(wasm => {
      rerun(wasm, true);

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
    loaded.then(wasm => {
      var xy = scran_utils_viz_child.extractXY(cache.buffer_end);
      var info = {
        "x": xy.x,
        "y": xy.y,
        "iterations": cache.total
      };

      var transfer = [];
      scran_utils.extractBuffers(info, transfer);
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
