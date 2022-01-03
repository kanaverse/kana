/* 
 * Copyright 2021 Aaron Lun and Jayaram Kancherla
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/* This file defines a utility class to:
 * 
 * - Create a buffer allocation in the Wasm heap upon construction.
 * - Spawn a TypedArray view to fill it with content on the JS side.
 * - Pass the pointer offset to Wasm to do various calculations.
 * - Optionally respawn the TypedArray view to get the output.
 * - Free the allocation by calling delete().
 *
 * It seems safest to (re)construct the TypedArray view immediately before use,
 * and certainly after any allocations have occurred on the Wasm heap. This is
 * because any allocations may cause the heap to move, thus invalidating all
 * existing TypedArray views bound to previous memory locations.
 */

class WasmBuffer {
    static mapping =  {
        Float64Array: {
            size: 8,
            wasm: "HEAPF64",
        },
        Float32Array: {
            size: 4,
            wasm: "HEAPF32",
        },
        Uint8Array: {
            size: 1,
            wasm: "HEAPU8",
        },
        Int32Array: {
            size: 4,
            wasm: "HEAP32",
        },
        Uint32Array: {
            size: 4,
            wasm: "HEAPU32",
        }
    };

    constructor(wasm, size, type) {
        const curtype = WasmBuffer.mapping[type];
        this.ptr = wasm._malloc(size * curtype.size);
        this.size = size;
        this.type = type;
        this.wasm = wasm;
    }

    static toArray(wasm, ptr, size, type) {
        const curtype = WasmBuffer.mapping[type];
        const buffer = wasm[curtype["wasm"]].buffer;

        let arr;
        if (type == "Float64Array") {
            arr = new Float64Array(buffer, ptr, size);
        } else if (type == "Float32Array") {
            arr = new Float32Array(buffer, ptr, size);
        } else if (type == "Uint8Array") {
            arr = new Uint8Array(buffer, ptr, size);
        } else if (type == "Int32Array") {
            arr = new Int32Array(buffer, ptr, size);
        } else if (type == "Uint32Array") {
            arr = new Uint32Array(buffer, ptr, size);
        }

        return arr;
    }

    array() {
        const ptr = this.ptr;
        if (ptr === null) {
            throw "cannot create TypedArray from a null pointer";
        }
        return WasmBuffer.toArray(this.wasm, ptr, this.size, this.type);
    }

    fill(x) {
        this.array().fill(x);
        return;
    }

    set(x) {
        this.array().set(x);
        return;
    }

    clone() {
        return this.array().slice();
    }

    free() {
        this.wasm._free(this.ptr);
        this.ptr = null;
    }
}
