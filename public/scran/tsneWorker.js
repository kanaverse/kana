importScripts("./WasmBuffer.js");
importScripts("./_utils.js");
importScripts("./_utils_viz_child.js");

importScripts("./_viz_neighbors.js");
importScripts("./_tsne_init.js");
importScripts("./_tsne_run.js");

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
      scran_viz_neighbors.compute(wasm, msg.data);

      var params = msg.data.params;
      scran_tsne_init.compute(wasm, { "perplexity": params.perplexity });

      scran_tsne_run.compute(wasm, { "iterations": params.iterations });
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

  } else if (msg.data.cmd == "FETCH") {
    loaded.then(wasm => {
      var info = scran_tsne_run.fetchResults(wasm) 
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
