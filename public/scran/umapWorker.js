importScripts("./WasmBuffer.js");
importScripts("./_utils.js");
importScripts("./_utils_viz_child.js");

importScripts("./_viz_neighbors.js");
importScripts("./_umap_init.js");
importScripts("./_umap_run.js");

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
      scran_umap_init.compute(wasm, { "min_dist": params.min_dist, "num_epochs": params.num_epochs });
      if (scran_umap_init.changed) {
        scran_utils.postSuccess(scran_umap_init.results(wasm), "umap_init", "UMAP initialized");
      }

      scran_umap_run.compute(wasm, {});
      if (scran_umap_run.changed) {
        scran_utils.postSuccess(scran_umap_run.results(wasm), "umap_run", "UMAP run completed");
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
