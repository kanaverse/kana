importScripts("./WasmBuffer.js");
importScripts("./utils.js");

var wasm = null;
var cached = {};
var parameters = {};
var upstream = new Set();
var initCache = createInitCache(cached);
var runStep = createRunStep(parameters, upstream);

function initializeTsne(args, nn_index_ptr) {
  var step = "init_tsne";
  return runStep(step, args, ["neighbor_index"], () => {
    var init_cache = initCache(step);
    freeCache(init_cache, "raw");

    var index = wasm.NeighborIndex.rebind(nn_index_ptr);
    try {
      var num_obs = index.num_obs(); 
      var buffer = allocateBuffer(wasm, num_obs * 2, "Float64Array", init_cache);
      init_cache.raw = wasm.initialize_tsne_from_index(index, args.perplexity, buffer.ptr);
    } finally {
      index.delete();
    }
    return {};
  });
}

function runTsne(args) {
  var step = "run_tsne";
  return runStep(step, args, ["init_tsne"], () => {
    var buffer = cached.init_tsne.buffer;
    var init_tsne_copy = cached.init_tsne.raw.deepcopy();
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

onmessage = function(msg) {
  if (msg.data.cmd == "INIT") {
    var Module = {};
    Module["wasmMemory"] = msg.data.wasmMemory;
    Module["buffer"] = Module["wasmMemory"].buffer;

    importScripts("./scran.js");
    loadScran(Module)
    .then(instance => {
        wasm = instance;
        postMessage({ 
            "type": "init_worker",
            "status": "SUCCESS"
        });
    })
    .catch(error => {
        postMessage({ 
            "type": "error",
            "reason": error.toString() 
        });
    });
  } else {
    upstream.clear();
    if (msg.data.upstream) {
      upstream.add("neighbor_index");
    }

    var params = msg.data.params;
    var nn_index_ptr = msg.data.nn_index_ptr;
    try {
      var init_out = processOutput(args => initializeTsne(args, nn_index_ptr), params.init);
      if (init_out !== null) {
        postMessage({
            type: `${init_out["$step"]}_DATA`,
            resp: init_out,
            msg: "Success: t-SNE initialized"
        });
      }

      var run_out = processOutput(runTsne, params.run);
      if (run_out !== null) {
        postMessage({
            type: `${run_out["$step"]}_DATA`,
            resp: run_out,
            msg: "Success: t-SNE run completed"
        });
      }
    } catch(error) {
      postMessage({ 
          "type": "error",
          "reason": error.toString()
      });
    }
  }
}
