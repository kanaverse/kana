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
    var disc_offset = scran_qc_thresholds.fetchDiscardsHeapOffset(wasm);

    cache.matrix = wasm.filter_cells(mat, disc_offset, false);
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
    return {
      "parameters": parameters,
      "contents": x.results(wasm)
    };
  };

  x.unserialize = function(wasm, saved) {
    reloaded = true;
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
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
