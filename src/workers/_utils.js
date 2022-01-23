import * as scran from "./scran.js";

export function freeCache(object) {
    if (object !== undefined && object !== null) {
        object.free();
    }
    return;
}

export function freeReloaded(cache) {
    if ("reloaded" in cache) {
        for (const [k, v] of Object.entries(cache.reloaded)) {
            if (v instanceof scran.WasmArray) {
                v.free();
            }
        }
        delete cache.reloaded;
    }
}

export function changedParameters(x, y) {
    return JSON.stringify(x) != JSON.stringify(y);
}

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

export function allocateCachedArray(size, type, cache, name = "buffer") {
    var reallocate = true;
    if (name in cache) {
        var candidate = cache[name];
        if (candidate.size != size || candidate.constructor.name != type) {
            candidate.free();
        } else {
            reallocate = false;
        }
    }
  
    if (reallocate) {
        switch (type) {
            case "Uint8Array":
                cache[name] = new scran.Uint8WasmArray(size, type);
                break;
            case "Int32Array":
                cache[name] = new scran.Int32WasmArray(size, type);
                break;
            case "Float64Array":
                cache[name] = new scran.Float64WasmArray(size, type);
                break;
            default:
                // We only ever use one of the three above types in our 
                // internal data stores, so no need to go all-out here.
                throw "allocating '" + type + "' not yet supported";
        }
    }

    return cache[name];
}

function extractBuffers(object, store) {
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
