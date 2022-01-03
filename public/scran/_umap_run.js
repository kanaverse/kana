const scran_umap_run = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_umap_neighbors.changed && !scran_utils.changedParameters(args, parameters)) {
      x.changed = false;
    } else {
      var init = scran_umap_init.cloneInit(wasm);
      var buffer = scran_umap_init.cloneBuffer(wasm, cache);

      try {
        cache.total = init.num_epochs();
        var delay = 15;
        for (; init.epoch() < total; ) {
          wasm.run_umap(init, delay, buffer.ptr);
        }
      } finally {
        init.delete();
      }

      parameters = args;
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
    var xy = scran_utils_viz_child.extractXY(cache.buffer);
    return {
      "x": xy.x,
      "y": xy.y,
      "iterations": cache.total
    };
  };
})(scran_umap_run);
