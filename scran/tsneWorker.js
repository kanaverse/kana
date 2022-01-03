importScripts("./WasmBuffer.js");
importScripts("./utils.js");
importScripts("./vizutils.js");

function initializeTsne(wasm, args) {
  var step = "init_tsne";
  return utils.runStep(step, args, ["neighbor_results"], () => {
    var init_cache = utils.initCache(step);
    utils.freeCache(init_cache["raw"]);
    init_cache.raw = wasm.initialize_tsne(utils.cached.neighbor_results.raw, args.perplexity);
    return {};
  });
}

function runTsne(wasm, args) {
  var step = "run_tsne";
  return utils.runStep(step, args, ["init_tsne"], () => {
    var run_cache = utils.initCache(step);
    var init = utils.cached.init_tsne.raw;

    var num_obs = init.num_obs(); 
    var buffer = utils.allocateBuffer(wasm, num_obs * 2, "Float64Array", run_cache);
    wasm.randomize_tsne_start(num_obs, buffer.ptr, 42);

    var init_tsne_copy = init.deepcopy();
    try {
      var delay = 15;
      for (; init_tsne_copy.iterations() < args.iterations; ) {
          wasm.run_tsne(init_tsne_copy, delay, args.iterations, buffer.ptr);
      }
    } finally {
      init_tsne_copy.delete();
    }

    var xy = vizutils.extractXY(buffer);
    return {
      "x": xy.x,
      "y": xy.y,
      "iterations": args.iterations
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
    loaded.then(wasm => {
      utils.upstream.clear();
      if (msg.data.neighbors !== undefined) {
        vizutils.recreateNeighbors(wasm, msg.data.neighbors);
      }

      var params = msg.data.params;
      var init_out = utils.processOutput(initializeTsne, wasm, { "perplexity": params.perplexity });
      if (init_out !== null) {
        postMessage({
            type: `${init_out["$step"]}_DATA`,
            resp: init_out,
            msg: "Success: t-SNE initialized"
        });
      }

      var run_out = utils.processOutput(runTsne, wasm, { "iterations": params.iterations });
      if (run_out !== null) {
        postMessage({
            type: `${run_out["$step"]}_DATA`,
            resp: run_out,
            msg: "Success: t-SNE run completed"
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
