importScripts("./_utils.js");
importScripts("./_viz_neighbors.js");

const scran_umap_init = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_viz_neighbors.changed && !scran_utils.changedParameters(args, parameters)) {
      x.changed = false;
    } else {
      scran_utils.freeCache(cache.raw);

      var nn_umap = scran_viz_neighbors.fetchResults(wasm);
      var umap_buffer = scran_utils.allocateBuffer(wasm, nn_umap.num_obs() * 2, "Float64Array", cache);
      cache.raw = wasm.initialize_umap(nn_umap, args.num_epochs, args.min_dist, umap_buffer.ptr);
      
      parameters = args;
      x.changed = true;
    }
    return;
  };
 
  x.results = function(wasm) {
    return {};
  };

  /** Public functions (custom) **/
  x.cloneInit = function(wasm) {
    return cache.raw.deepcopy();
  };

  x.cloneBuffer = function(wasm, cache2) {
    var buffer2 = scran_utils.allocateBuffer(wasm, cache.buffer.size, "Float64Array", cache2);
    buffer2.set(cache.buffer.array());
    return buffer2;
  };
})(scran_umap_init);
