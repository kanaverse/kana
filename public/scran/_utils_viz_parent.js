const scran_utils_viz_parent = {};

scran_utils_viz_parent.computeNeighbors = function(wasm, k) {
  var nn_index = scran_neighbor_index.fetchNeighborIndex(wasm);

  var output = { "num_obs": nn_index.num_obs() };
  var results = null, rbuf = null, ibuf = null, dbuf = null;
  try {
    results = wasm.find_nearest_neighbors(nn_index, k);

    rbuf = new WasmBuffer(wasm, results.num_obs(), "Int32Array");
    ibuf = new WasmBuffer(wasm, results.size(), "Int32Array");
    dbuf = new WasmBuffer(wasm, results.size(), "Float64Array");

    results.serialize(rbuf.ptr, ibuf.ptr, dbuf.ptr);
    output["size"] = results.size();
    output["runs"] = rbuf.array().slice();
    output["indices"] = ibuf.array().slice();
    output["distances"] = dbuf.array().slice();

  } finally {
    if (results !== null) {
      results.delete();
    }
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

scran_utils_viz_parent.createWorker = function(script, name, long_name) {
  var worker = new Worker("./umapWorker.js");
  worker.postMessage({ "cmd": "INIT" });
  
  worker.onmessage = function (msg) {
    var type = msg.data.type;
    if (type == "run_" + name + "_DATA") {
      var x = msg.data.resp.x;
      var y = msg.data.resp.y;
      postMessage({
        type: name + "_DATA",
        resp: { "x": x, "y": y },
        msg: "Success: " + long_name + " run completed"
      }, [x.buffer, y.buffer]);
    } else if (type == "error") {
      throw msg.data.object;
    }
  };

  return worker;
};

scran_utils_viz_parent.sendNeighbors = function(worker, args, nn_out) {
  var run_msg = {
    "cmd": "RUN",
    "params": args 
  };

  if (nn_out !== null) {
    run_msg.neighbors = nn_out;
    worker.postMessage(run_msg, [nn_out.runs.buffer, nn_out.indices.buffer, nn_out.distances.buffer]);
  } else {
    worker.postMessage(run_msg);
  }
};
