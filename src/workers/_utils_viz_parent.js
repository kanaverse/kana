import * as scran from "scran.js";
import * as index from "./_neighbor_index.js";
import * as utils from "./_utils.js";

export function computeNeighbors(k) {
    var nn_index = index.fetchIndex();

    var output = { "num_obs": nn_index.index.num_obs() }; // TODO: expose in scran.js.
    var results = null, rbuf = null, ibuf = null, dbuf = null;
    try {
        results = scran.findNearestNeighbors(nn_index, k);

        rbuf = new scran.Int32WasmArray(results.numberOfCells());
        ibuf = new scran.Int32WasmArray(results.size());
        dbuf = new scran.Float64WasmArray(results.size());

        results.serialize({ runs: rbuf, indices: ibuf, distances: dbuf });
        output["size"] = results.size();
        output["runs"] = rbuf.array().slice();
        output["indices"] = ibuf.array().slice();
        output["distances"] = dbuf.array().slice();

    } finally {
        if (results !== null) {
            results.free();
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
    worker.onmessage = function (msg) {
        var type = msg.data.type;
        if (type.endsWith("_iter")) {
            postMessage({
                "type": type,
                "resp": {
                    "x": msg.data.x,
                    "y": msg.data.y,
                    "iteration": msg.data.iteration
                },
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
        utils.extractBuffers(nn_out, transferrable);
    }

    return sendTask(worker, run_msg, cache, transferrable);
}

export function retrieveCoordinates(worker, cache) {
    if ("reloaded" in cache) {
        // Buffers are transferred to the main thread, so we need to make sure we
        // clone it so that we don't lose our master copy.
        var copy = { ...cache.reloaded };
        copy.x = copy.x.slice();
        copy.y = copy.y.slice();
        return new Promise(resolve => resolve(copy));
    } else {
        return cache.run.then(x => sendTask(worker, { "cmd": "FETCH" }, cache));
    }
}
