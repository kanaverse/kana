importScripts("./WasmBuffer.js");
importScripts("./utils.js");
importScripts("./vizutils.js");

function initializeUmap(wasm, args) {
  var step = "init_umap";
  return utils.runStep(step, args, ["neighbor_results"], () => {
    var init_cache = utils.initCache(step);
    utils.freeCache(init_cache["raw"]);

    var nn_umap = utils.cached.neighbor_results.raw;
    var umap_buffer = utils.allocateBuffer(wasm, nn_umap.num_obs() * 2, "Float64Array", init_cache);
    init_cache.raw = wasm.initialize_umap(nn_umap, args.num_epochs, args.min_dist, umap_buffer.ptr);

    return {};
  });
}

function runUmap(wasm, args) {
  var step = "run_umap";
  return utils.runStep(step, args, ["init_umap"], () => {
    var buffer = utils.cached.init_umap.buffer;

    var total;
    var init_umap_copy = utils.cached.init_umap.raw.deepcopy();
    try {
      total = init_umap_copy.num_epochs();
      var delay = 15;
      for (; init_umap_copy.epoch() < total; ) {
        wasm.run_umap(init_umap_copy, delay, buffer.ptr);
      }
    } finally {
      init_umap_copy.delete();
    }

    var xy = vizutils.extractXY(buffer);
    return {
      "x": xy.x,
      "y": xy.y,
      "iterations": total
    };
  });
}

var loaded;
onmessage = function(msg) {
  if (msg.data.cmd == "INIT") {
    importScripts("./scran.js");
    loaded = loadScran();
    loaded.then(wasm => {
        postMessage({ 
            "type": "init_worker",
            "status": "SUCCESS"
        });
    })
    .catch(error => {
        postMessage({ 
            "type": "error",
            "object": error
        });
    });

  } else {
    utils.upstream.clear();

    loaded.then(wasm => {
      utils.upstream.clear();
      if (msg.data.neighbors !== undefined) {
        vizutils.recreateNeighbors(wasm, msg.data.neighbors);
      }

      var params = msg.data.params;
      var init_out = utils.processOutput(initializeUmap, wasm, { "min_dist": params.min_dist, "num_epochs": params.num_epochs });
      if (init_out !== null) {
        postMessage({
            type: `${init_out["$step"]}_DATA`,
            resp: init_out,
            msg: "Success: UMAP initialized"
        });
      }

      var run_out = utils.processOutput(runUmap, wasm, {});
      if (run_out !== null) {
        postMessage({
            type: `${run_out["$step"]}_DATA`,
            resp: run_out,
            msg: "Success: UMAP run completed"
        }, [run_out.x.buffer, run_out.y.buffer]);
      }
    })
    .catch(error => {
      postMessage({ 
          "type": "error",
          "object": error
      });
    })
  }
}
