import WasmBuffer from "./WasmBuffer.js";
import * as scran_utils from "./_utils.js";
import * as scran_neighbor_index from "./_neighbor_index.js";

export function computeNeighbors(wasm, k) {
  var nn_index = scran_neighbor_index.fetchIndex(wasm);

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

export function createWorker(script, cache) {
  var worker = new Worker(script);
  worker.onmessage = function (msg) {
    var type = msg.data.type;
    if (type.endsWith("_iter")) {
      postMessage({
        "type": type,
        "resp": {
           "x": msg.data.x,
           "y": msg.data.y,
           "iteration": msg.data.iteration
        }
      }, [msg.data.x.buffer, msg.data.y.buffer]);
      return;
    }

    var id = msg.data.id;
    var fun = cache.promises[id];
    if (type == "error") {
      fun.reject(msg.data.error);
    } else {
      fun.resolve(msg.data.data);
    }
    delete cache.promises[id];
  };
  return worker;
}

export function sendTask(worker, payload, cache, transferrable = []) {
  var i = cache.counter;
  var p = new Promise((resolve, reject) => {
    cache.promises[i] = { "resolve": resolve, "reject": reject };
  });
  cache.counter++;
  payload.id = i;
  worker.postMessage(payload, transferrable);
  return p;
}

export function initializeWorker(worker, cache) {
  return sendTask(worker, { "cmd": "INIT" }, cache);
}

export function runWithNeighbors(worker, args, nn_out, cache) {
  var run_msg = {
    "cmd": "RUN",
    "params": args 
  };

  var transferrable = [];
  if (nn_out !== null) {
    run_msg.neighbors = nn_out;
    extractBuffers(nn_out, transferrable);
  }

  return sendTask(worker, run_msg, cache, transferrable);
}

export function retrieveCoordinates(worker, cache) {
  if ("reloaded" in cache) {
    // Buffers are transferred to the main thread, so we need to make sure we
    // clone it so that we don't lose our master copy.
    var copy = cache.reloaded;
    copy.x = copy.x.slice();
    copy.y = copy.y.slice();
    return new Promise(resolve => resolve(copy));
  } else {
    return cache.run.then(x => sendTask(worker, { "cmd": "FETCH" }, cache));
  }
}
