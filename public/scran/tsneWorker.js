importScripts("./WasmBuffer.js");
importScripts("./utils.js");

var wasm = null;
var cached = {};
var parameters = {};
var initCache = createInitCache(cached);
var checkParams = createCheckParams(parameters);

function initializeTsne(args, upstream, nn_index_ptr) {
  var step = "init_tsne";
  return checkParams(step, args, upstream, () => {
    var init_cache = initCache(step);
    freeCache(init_cache, "raw");

    var num_obs = args.num_obs; // TODO: query this from the status object instead. 
    var buffer = allocateBuffer(wasm, num_obs * 2, "Float64Array", init_cache);
      
    var index = wasm.NeighborIndex.rebind(nn_index_ptr);
    try {
      init_cache.raw = wasm.initialize_tsne_from_index(index, args.perplexity, buffer.ptr);
    } finally {
      index.delete();
    }
    return {};
  });
}

function runTsne(args, upstream) {
  var step = "run_tsne";
  return checkParams(step, args, upstream, () => {
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
    loadScran(Module).then(function(instance) {
        wasm = instance;
        postMessage({ "status": "SUCCESS" });
    });
  } else {
    console.log(msg);
    var params = msg.data.params;
    var upstream = msg.data.upstream;
    var nn_index_ptr = msg.data.nn_index_ptr;

    var init_out = processStep((args, upstream) => initializeTsne(args, upstream, nn_index_ptr), params.init, upstream);
    if (init_out !== null) {
      postMessage({
          type: `${init_out["$step"]}_DATA`,
          resp: init_out,
          msg: "Success: t-SNE initialized"
      });
      upstream = true;
    }

    var run_out = processStep(runTsne, params.run, upstream);
    if (run_out !== null) {
      postMessage({
          type: `${run_out["$step"]}_DATA`,
          resp: run_out,
          msg: "Success: t-SNE run completed"
      });
      upstream = true;
    }
  }
}
