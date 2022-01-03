const scran_utils = {};

/* Free a cached Wasm-constructed object. */
scran_utils.freeCache = function(object) {
  if (object !== undefined && object !== null) {
    object.delete();
  }
  return;
};

/* Compare two parameter sets. */
scran_utils.changedParameters = function(x, y) {
    return JSON.stringify(x) != JSON.stringify(y);
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

/* Transfers an array's contents into a Wasm buffer. */
scran_utils.wasmifyArray = function(wasm, arr) {
  var tmp = new WasmBuffer(wasm, arr.length, arr.constructor.name);
  tmp.set(arr);
  return tmp;
}

/* Recursively extract buffers from TypedArrays.
 *
 * The idea is to extract buffers from an object containing one or more TypedArrays,
 * to enable transfer of the memory store across workers via postMessage.
 */
scran_utils.extractBuffers = function(object, store) {
  if (Array.isArray(object)) {
    for (const element of object) {
      utils.extractBuffers(element, store);
    }
  } else if (object.constructor == Object) {
    for (const [key, element] of Object.entries(object)) {
      utils.extractBuffers(element, store);
    }
  } else if (ArrayBuffer.isView(object)) {
    if (! (object.buffer instanceof ArrayBuffer)) {
      throw "only ArrayBuffers should be in the message payload";
    }
    store.push(object.buffer);
  }
};

/* Post a response after job success. */
scran_utils.postSuccess = function(wasm, namespace, step, message) {
  if (namespace.changed) {
    var info = namespace.results(wasm);

    var transferable = [];
    utils.extractBuffers(info, transferable);

    postMessage({
      type: `${step}_DATA`,
      resp: info,
      msg: "Success: " + message
    }, transferable);
  }
};
