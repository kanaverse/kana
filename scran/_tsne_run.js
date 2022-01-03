importScripts("./_utils.js");
importScripts("./_vizutils_child.js");
importScripts("./_tsne_init.js");

const scran_tsne_run = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_tsne_neighbors.changed && !scran_utils.changedParameters(args, parameters)) {
      x.changed = false;
    } else {
      var init = scran_tsne_init.cloneInit(wasm);

      try {
        var num_obs = init.num_obs(); 
        var buffer = utils.allocateBuffer(wasm, num_obs * 2, "Float64Array", cache);
        wasm.randomize_tsne_start(num_obs, buffer.ptr, 42);

        var delay = 15;
        for (; init_tsne_copy.iterations() < args.iterations; ) {
          wasm.run_tsne(init_tsne_copy, delay, args.iterations, buffer.ptr);
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
    var xy = scran_vizutils_child.extractXY(cache.buffer);
    return {
      "x": xy.x,
      "y": xy.y,
      "iterations": args.iterations
    };
  };
})(scran_tsne_run);
