import WasmBuffer from "./WasmBuffer.js";

/* Free a cached Wasm-constructed object. */
export function freeCache(object) {
  if (object !== undefined && object !== null) {
    object.delete();
  }
  return;
};

/* Compare two parameter sets. */
export function changedParameters(x, y) {
    return JSON.stringify(x) != JSON.stringify(y);
};

/* Calculate range of an array */
export function computeRange(arr) {
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
export function allocateBuffer(wasm, size, type, cache, name = "buffer") {
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
}

/* Transfers an array's contents into a Wasm buffer. */
export function wasmifyArray(wasm, arr) {
  var tmp = new WasmBuffer(wasm, arr.length, arr.constructor.name);
  tmp.set(arr);
  return tmp;
}

/* Recursively extract buffers from TypedArrays.
 *
 * The idea is to extract buffers from an object containing one or more TypedArrays,
 * to enable transfer of the memory store across workers via postMessage.
 */
export function extractBuffers(object, store) {
  if (Array.isArray(object)) {
    for (const element of object) {
      extractBuffers(element, store);
    }
  } else if (object.constructor == Object) {
    for (const [key, element] of Object.entries(object)) {
      extractBuffers(element, store);
    }
  } else if (ArrayBuffer.isView(object)) {
    if (! (object.buffer instanceof ArrayBuffer)) {
      throw "only ArrayBuffers should be in the message payload";
    }
    store.push(object.buffer);
  }
}

/* Post a response after job success. */
export function postSuccess(info, step, message) {
  var transferable = [];
  extractBuffers(info, transferable);
  postMessage({
    type: `${step}_DATA`,
    resp: info,
    msg: "Success: " + message
  }, transferable);
}

/* A deep copy function that may not copy TypedArrays,
 * under the assumption that they are already cloned. */
export function simpleDeepCopy(x, ignoreTypedArrays = true) {
  if (Array.isArray(x)) {
    var y = x.slice();
    for (var i = 0; i < x.length; i++) {
      y[i] = simpleDeepCopy(x[i]);
    }
    return y;
  } else if (ArrayBuffer.isView(x)) {
    if (ignoreTypedArrays) {
      return x;
    } else {
      return x.slice();
    }
  } else if (x instanceof Object) {
    var y = { ...x };
    for (const [key, val] of y) {
      y[key] = simpleDeepCopy(val);
    }
    return y;
  }
  return x;
}
