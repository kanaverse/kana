const scran_custom_markers = {};

(function(x) {
  /** Private members **/
  var cache = { "results": {} };
  var parameters = { "selections": {} };

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {

    /* If the QC filter was re-run, all of the selections are invalidated as
     * the identity of the indices may have changed.
     */
    if (scran_qc_filter.changed) {
      parameters.selections = {};
      for (const [key, val] of Object.entries(cache.results)) {
        scran_utils.freeCache(val.raw);                    
      }
      cache.results = {};
    }

    /*
     * Technically we would need to re-run detection on the existing selections
     * if the normalization changed but the QC was the same. In practice, this
     * never happens, so we'll deal with it later.
     */

    x.changed = true;
    return;
  };

  x.results = function(wasm) {
    return {};
  };

  x.serialize = function(wasm) {
    var results = {};

    for (const [key, val] of Object.entries(cache.results)) {
      if ("reloaded" in val) {
        results[key] = val.reloaded;
      } else {
        results[key] = scran_utils_markers.serializeGroupStats(val.raw, 1);
      }
    }

    return {
      "parameters": parameters,
      "contents": { "results": results }
    };
  };

  x.unserialize = function(wasm, saved) {
    parameters = saved.parameters;

    for (const [key, val] of Object.entries(saved.contents)) {
      cache.results[key] = { "reloaded": val };
    }
    return;
  };

  /** Public functions (custom) **/
  x.addSelection = function(wasm, id, selection) {
    var mat = scran_normalization.fetchNormalizedMatrix(wasm);

    var buffer = scran_utils.allocateBuffer(wasm, mat.ncol(), "Int32Array", cache, "buffer");
    buffer.fill(0);
    var tmp = buffer.array();
    selection.forEach(element => { tmp[element] = 1; });

    var res;
    try {
      res = wasm.score_markers(mat, buffer.ptr, false, 0); // assumes that we have at least one cell in and outside the selection!
    } catch (e) {
      throw wasm.get_error_message(e);
    }

    // Removing previous results, if there were any.
    if (id in cache.results) {
      scran_utils.freeCache(cache.results[id].raw);
      delete cache.results[id];
    }

    cache.results[id] = { "raw": res };
    parameters.selections[id] = selection;
  };

  x.removeSelection = function(wasm, id) {
    scran_utils.freeCache(cache.results[id].raw);
    delete cache.results[id];
    delete parameters.selections[id];
  };

  x.fetchResults = function(wasm, id, rank_type) {
    var current = cache.results[id];
    return scran_utils_markers.fetchGroupResults(wasm, current.raw, current.reloaded, rank_type, 1); 
  };
})(scran_custom_markers);