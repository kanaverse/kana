importScripts("./WasmBuffer.js");
importScripts("./_utils.js");
importScripts("./_utils_viz_child.js");

importScripts("./_viz_neighbors.js");
importScripts("./_tsne_init.js");
importScripts("./_tsne_run.js");

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
      scran_viz_neighbors.compute(wasm, msg.data);
      scran_utils.postSuccess(scran_viz_neighbors.results(wasm), "neighbor_reconstruction", "Neighbor results reconstructed");

      var params = msg.data.params;
      scran_tsne_init.compute(wasm, { "perplexity": params.perplexity });
      if (scran_tsne_init.changed) {
        scran_utils.postSuccess(scran_tsne_init.results(wasm), "tsne_init", "t-SNE initialized");
      }

      scran_tsne_run.compute(wasm, { "iterations": params.iterations });
      if (scran_tsne_run.changed) {
        scran_utils.postSuccess(scran_tsne_run.results(wasm), "tsne_run", "t-SNE run completed");
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
