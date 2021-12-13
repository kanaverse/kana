importScripts("./WasmBuffer.js");
importScripts("./utils.js");

function initializeTsne(wasm, args) {
  var step = "init_tsne";
  return utils.runStep(step, args, ["neighbor_index"], () => {
    var init_cache = utils.initCache(step);
    utils.freeCache(init_cache["raw"]);

    var index = wasm.NeighborIndex.rebind(utils.cached.neighbor_index.ptr);
    try {
      var num_obs = index.num_obs(); 
      var buffer = utils.allocateBuffer(wasm, num_obs * 2, "Float64Array", init_cache);
      init_cache.raw = wasm.initialize_tsne_from_index(index, args.perplexity, buffer.ptr);
    } finally {
      index.delete();
    }
    return {};
  });
}

function runTsne(wasm, args) {
  var step = "run_tsne";
  return utils.runStep(step, args, ["init_tsne"], () => {
    var buffer = utils.cached.init_tsne.buffer;
    var init_tsne_copy = utils.cached.init_tsne.raw.deepcopy();
    try {
      var delay = 15;
      for (; init_tsne_copy.iterations() < args.iterations; ) {
          wasm.run_tsne(init_tsne_copy, delay, args.iterations, buffer.ptr);
      }
    } finally {
      init_tsne_copy.delete();
    }

    return {
      "buffer": {
        "ptr": buffer.ptr,
        "size": buffer.size,
        "type": buffer.type
      },
      "iterations": args.iterations
    };
  });
}

var loaded;
onmessage = function(msg) {
  if (msg.data.cmd == "INIT") {
    var Module = {};
    Module["wasmMemory"] = msg.data.wasmMemory;
    Module["buffer"] = Module["wasmMemory"].buffer;

    importScripts("./scran.js");
    loaded = loadScran(Module);
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
    if (msg.data.upstream) {
      utils.upstream.add("neighbor_index");
      utils.cached["neighbor_index"] = { "ptr": msg.data.nn_index_ptr };
    }

    loaded.then(wasm => {
      var params = msg.data.params;
      var init_out = utils.processOutput(initializeTsne, wasm, params.init);
      if (init_out !== null) {
        postMessage({
            type: `${init_out["$step"]}_DATA`,
            resp: init_out,
            msg: "Success: t-SNE initialized"
        });
      }

      var run_out = utils.processOutput(runTsne, wasm, params.run);
      if (run_out !== null) {
        postMessage({
            type: `${run_out["$step"]}_DATA`,
            resp: run_out,
            msg: "Success: t-SNE run completed"
        });
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
