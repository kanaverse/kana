const scran_tsne_run = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_tsne_init.changed && !scran_utils.changedParameters(args, parameters)) {
      x.changed = false;
    } else {
      var init = scran_tsne_init.cloneInit(wasm);

      try {
        var num_obs = init.num_obs(); 
        var buffer = scran_utils.allocateBuffer(wasm, num_obs * 2, "Float64Array", cache);
        wasm.randomize_tsne_start(num_obs, buffer.ptr, 42);

        var delay = 15;
        for (; init.iterations() < args.iterations; ) {
          wasm.run_tsne(init, delay, args.iterations, buffer.ptr);
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
      "iterations": parameters.iterations
    };
  };
})(scran_tsne_run);
