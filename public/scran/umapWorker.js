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
      scran_utils.postSuccess(wasm, scran_viz_neighbors, "neighbor_reconstruction", "Neighbor results reconstructed");

      var params = msg.data.params;
      scran_umap_init.compute(wasm, { "min_dist": params.min_dist, "num_epochs": params.num_epochs });
      scran_utils.postSuccess(wasm, scran_umap_init, "umap_init", "UMAP initialized");

      scran_umap_run.compute(wasm, {});
      scran_utils.postSuccess(wasm, scran_umap_run, "umap_run", "UMAP run completed");
    })
    .catch(error => {
      postMessage({ 
        "type": "error",
        "object": error
      });
    })
  }
}
