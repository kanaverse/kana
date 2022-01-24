import * as scran from "scran.js";

export function chooseDelay(animate) {
    if (animate) {
        // TODO: using 75 for now
        // in the future the user can choose a bar for speed on the UI
        // options would be 1x, 2x, 3x
        return 75;
    } else {
        return 1000000; // effectively no delay.
    }
};

export function recreateNeighbors(neighbors) {
    var output = null;
    var rbuf = null;
    var ibuf = null;
    var dbuf = null;
  
    try {
        var num_obs = neighbors.num_obs;
        var size = neighbors.size;

        rbuf = new scran.Int32WasmArray(num_obs);
        rbuf.set(neighbors.runs);
        ibuf = new scran.Int32WasmArray(size);
        ibuf.set(neighbors.indices);
        dbuf = new scran.Float64WasmArray(size);
        dbuf.set(neighbors.distances);

        output = scran.NeighborSearchResults.unserialize(rbuf, ibuf, dbuf);

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

// need this to transfer new typed arrays rather than the existing one's
// since a typed array can only be transferred once
export function cloneXY(buffer) {
    var x = new Float64Array(buffer.x.length);
    var y = new Float64Array(buffer.y.length);

    x.set(buffer.x);
    y.set(buffer.y);
    return { "x": x, "y": y };
  }