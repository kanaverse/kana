importScripts("./_utils.js");
importScripts("./_inputs.js");
importScripts("./_qc_thresholds.js");

const scran_qc_filter = {};

(function(x) {
  /** Private members **/
  cache = {};
  parameters = {};
  reloaded = false;

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function rawCompute(wasm) {
    scran_utils.freeCache(cache.matrix);

    var mat = scran_inputs.fetchCountMatrix(wasm);
    var discards = scran_qc_thresholds.fetchDiscards(wasm);

    cache.matrix = wasm.filter_cells(mat, discards.byteOffset, false);
    reloaded = false;
    return;
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_inputs.changed && !scran_qc_thresholds.changed && !scran_utils.compareParameters(parameters, args)) {
      x.changed = false;
    } else {
      rawCompute(wasm);
      x.changed = true;
    }
    return;
  }
   
  x.results = function(wasm) {
    return {};
  };

  x.serialize = function(wasm) {
    return {};
  };

  x.unserialize = function(wasm, saved) {
    reloaded = true;
    return;
  };

  /** Public functions (standard) **/
  x.fetchFilteredMatrix = function(wasm) {
    if (reloaded) {
      rawCompute(wasm);
    }
    return cache.matrix;    
  };

})(scran_qc_filter);
