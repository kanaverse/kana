var vizutils = {};

vizutils.recreateNeighbors = function(wasm, neighbors) {
  var step = "neighbor_results";
  var nn_cached = utils.initCache(step);
  utils.freeCache(nn_cached["raw"]);

  var rbuf = null, ibuf = null, dbuf = null;
  try {
    rbuf = new WasmBuffer(wasm, results.num_obs(), "Int32Array");
    rbuf.array().set(neighbors.runs);
    ibuf = new WasmBuffer(wasm, results.size(), "Int32Array");
    ibuf.array().set(neighbors.indices);
    dbuf = new WasmBuffer(wasm, results.size(), "Float64Array");
    dbuf.array().set(neighbors.distances);

    nn_cached["raw"] = new wasm.NeighborResults(neighbors.num_obs, rbuf.ptr, ibuf.ptr, dbuf.ptr);
  } finally {
    if (rbuf !== null) {
      rbuf.free();
    }
    if (ibuf !== null) {
      ibuf.free();
    }
    if (dbuf !== null) {
      dbuf.free();
    }
  }

  utils.upstream.add(step);
  return;
};


