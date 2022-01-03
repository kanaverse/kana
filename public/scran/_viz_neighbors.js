const scran_viz_neighbors = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if ("neighbors" in args) {
      scran_utils.freeCache(cache.raw);
      cache.raw = scran_utils_viz_child.recreateNeighbors(wasm, msg.data.neighbors);

      // Don't set parameters = args here, there's no point.
      x.changed = true;
    } else {
      x.changed = false;
    }
    return;
  };

  x.results = function(wasm) {
    return {};
  };

  /** Public functions (custom) **/
  x.fetchResults = function(wasm) {
    return cache.raw;
  };
})(scran_viz_neighbors);
