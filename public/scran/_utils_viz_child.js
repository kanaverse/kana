const scran_utils_viz_child = {};

scran_utils_viz_child.recreateNeighbors = function(wasm, neighbors) {
  var output = null;
  var rbuf = null;
  var ibuf = null;
  var dbuf = null;

  try {
    var num_obs = neighbors.num_obs;
    var size = neighbors.size;

    rbuf = new WasmBuffer(wasm, num_obs, "Int32Array");
    rbuf.set(neighbors.runs);
    ibuf = new WasmBuffer(wasm, size, "Int32Array");
    ibuf.set(neighbors.indices);
    dbuf = new WasmBuffer(wasm, size, "Float64Array");
    dbuf.set(neighbors.distances);

    output = new wasm.NeighborResults(neighbors.num_obs, rbuf.ptr, ibuf.ptr, dbuf.ptr);
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

  return output;
};

scran_utils_viz_child.extractXY = function(buffer) {
  var nobs = buffer.size / 2;
  var x = new Float64Array(nobs);
  var y = new Float64Array(nobs);
  var buf = buffer.array();

  for (var i = 0; i < nobs; i++) {
    x[i] = buf[2*i];
    y[i] = buf[2*i + 1];
  }

  return { "x": x, "y": y };
}
