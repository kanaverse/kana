importScripts("./WasmBuffer.js");

const scran_utils = {};

/* Free a cached Wasm-constructed object. */
scran_utils.freeCache = function(object) {
  if (object !== undefined && object !== null) {
    object.delete();
  }
  return;
};

/* Compare two parameter sets. */
scran_utils.compareParameters = function(x, y) {
    return JSON.stringify(x) == JSON.stringify(y);
};

/* Calculate range of an array */
scran_utils.computeRange = (arr) => {
  var max = -Infinity, min = Infinity;
  arr.forEach(function (x) {
    if (max < x) {
      max = x;
    }
    if (min > x) {
      min = x;
    }
  });
  return [min, max];
}

/* Allocate a cached buffer on the Wasm heap.
 *
 * Creates a `WasmBuffer` in the cache if one does not already exist with the
 * desired size and type. This avoids unnecessary reallocations if an
 * appropriate buffer was already created from a previous run.
 */
scran_utils.allocateBuffer = function(wasm, size, type, cache, name = "buffer") {
  var reallocate = true;
  if (name in cache) {
    var candidate = cache[name];
    if (candidate.size != size || candidate.type != type) {
      candidate.free();
    } else {
      reallocate = false;
    }
  }

  if (reallocate) {
    cache[name] = new WasmBuffer(wasm, size, type);
  }
  return cache[name];
};


