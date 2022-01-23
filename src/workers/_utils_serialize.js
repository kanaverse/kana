import * as h5wasm from "h5wasm";
import * as pako from "pako";

// Must be integers!
const FORMAT_EMBEDDED_FILES = 0;
const FORMAT_EXTERNAL_KANADB = 1;
const FORMAT_VERSION = 0;

function normalizeTypedArrays(object) {
    if (Array.isArray(object)) {
        for (var i = 0; i < object.length; i++) {
            object[i] = normalizeTypedArrays(object[i]);
        }
    } else if (ArrayBuffer.isView(object)) {
        object = { 
            "_TypedArray_class": object.constructor.name, 
            "_TypedArray_values": Array.from(object) 
        };
    } else if (object instanceof Object) {
        // This MUST be after the previous clause, as otherwise
        // a TypedArray is an object and is incorrectly handled. 
        for (const [key, element] of Object.entries(object)) {
            object[key] = normalizeTypedArrays(element);
        }
    }
    return object;
}

function recoverTypedArrays(object) {
    if (Array.isArray(object)) {
        for (var i = 0; i < object.length; i++) {
            object[i] = recoverTypedArrays(object[i]);
        }
    } else if (object instanceof Object) {
        if ("_TypedArray_class" in object) {
            var cls = object[["_TypedArray_class"]];
            var vals = object[["_TypedArray_values"]];
            switch (cls) {
                case "Uint8Array":
                    object = new Uint8Array(vals.length);
                    break;
                case "Int8Array":
                    object = new Int8Array(vals.length);
                    break;
                case "Uint8Array":
                    object = new Uint8Array(vals.length);
                    break;
                case "Uint16Array":
                    object = new Uint16Array(vals.length);
                    break;
                case "Int16Array":
                    object = new Int16Array(vals.length);
                    break;
                case "Uint32Array":
                    object = new Uint32Array(vals.length);
                    break;
                case "Int32Array":
                    object = new Int32Array(vals.length);
                    break;
                case "Uint64Array":
                    object = new Uint64Array(vals.length);
                    break;
                case "Int64Array":
                    object = new Int64Array(vals.length);
                    break;
                case "Float32Array":
                    object = new Float32Array(vals.length);
                    break;
                case "Float64Array":
                    object = new Float64Array(vals.length);
                    break;
                default:
                    throw "unrecognized TypedArray class '" + cls;
            }
            object.set(vals);
        } else {
            for (const [key, element] of Object.entries(object)) {
                object[key] = recoverTypedArrays(element);
            }
        }
    } 
    return object;
}

function numberToBuffer(number) {
    // Store as little-endian. Probably safer
    // than trying to cast it from a Uint64Array;
    // not sure that endianness is strictly defined.
    var output = new Uint8Array(8);

    var i = 0;
    while (number > 0) {
        output[i] = number % 256;
        number = Math.floor(number / 256);
        i++;
    }

    return output;
}

function bufferToNumber(buffer) {
    var output = 0;
    var multiplier = 1;
    for (const x of buffer) {
        output += multiplier * x;
        multiplier *= 256;
    }
    return output;
}

export async function save(contents, mode = "full") {
    // Extract out the file buffers.
    var buffered = contents.inputs.parameters.files;
    var all_buffers = [];
    var total_len = 0;
    var format_type;

    if (mode == "full") {
        format_type = FORMAT_EMBEDDED_FILES;
        buffered.forEach((x, i) => {
            var val = x.buffer;
            all_buffers.push(val);
            buffered[i].buffer = { "offset": total_len, "size": val.byteLength };
            total_len += val.byteLength;
        });

    } else if (mode == "KanaDB") {
        // Saving the files to IndexedDB instead. 'all_buffers' now holds a promise
        // indicating whether all of these things were saved properly.
        format_type = FORMAT_EXTERNAL_KANADB;
        for (const x of buffered) {
            var md5 = await hashwasm.md5(new Uint8Array(x.buffer));
            var id = x.type + "_" + x.name + "_" + x.buffer.byteLength + "_" + md5;
            var ok = await kana_db.saveFile(id, x.buffer);
            if (!ok) {
                throw "failed to save file '" + id + "' to KanaDB";
            }
            x.buffer = id;
            all_buffers.push(id);
        }

    } else {
        throw "unsupported mode " + mode;
    }

    // Converting all other TypedArrays to normal arrays.
    contents = normalizeTypedArrays(contents);

    // Converting the JSON to a string and gzipping it into a Uint8Array.
    var json_str = JSON.stringify(contents);
    const json_view = pako.gzip(json_str);

    // Allocating a huge arrayBuffer.
    var combined = new ArrayBuffer(24 + json_view.length + total_len);
    var combined_arr = new Uint8Array(combined);
    var offset = 0;

    let format = numberToBuffer(format_type);
    combined_arr.set(format, offset); 
    offset += format.length;

    let version = numberToBuffer(FORMAT_VERSION);
    combined_arr.set(version, offset); 
    offset += version.length;

    let json_len = numberToBuffer(json_view.length);
    combined_arr.set(json_len, offset); 
    offset += json_len.length;

    if (offset != 24) {
        throw "oops - accounting error in the serialization code!";
    }

    combined_arr.set(json_view, offset);
    offset += json_view.length;

    if (mode == "full") {
        for (const buf of all_buffers) {
            const tmp = new Uint8Array(buf);
            combined_arr.set(tmp, offset);
            offset += tmp.length;
        }
        return combined;

    } else if (mode == "KanaDB") {
        return { "file_ids": all_buffers, "state": combined };

    } else {
        throw "unsupported mode " + mode;
    }
}

export async function load(buffer) {
    var offset = 0;
    var format = bufferToNumber(new Uint8Array(buffer, offset, 8));
    offset += 8;

    var version = bufferToNumber(new Uint8Array(buffer, offset, 8));
    offset += 8;

    var json_len = bufferToNumber(new Uint8Array(buffer, offset, 8));
    offset += 8;

    var contents = pako.ungzip(new Uint8Array(buffer, offset, json_len), { "to": "string" });
    contents = JSON.parse(contents);
    contents = recoverTypedArrays(contents);
    offset += json_len;

    var buffered = contents.inputs.parameters.files;
    if (format == FORMAT_EMBEDDED_FILES) {
        buffered.forEach((x, i) => {
            var details = x.buffer;
            var target = new Uint8Array(buffer, offset + details.offset, details.size);
            var tmp = new ArrayBuffer(details.size);
            (new Uint8Array(tmp)).set(target);
            buffered[i].buffer = tmp;
        });

    } else if (format == FORMAT_EXTERNAL_KANADB) {
        var collected = [];
        buffered.forEach((x, i) => {
            var id = x.buffer;
            collected.push(kana_db.loadFile(id));
        });
  
        var resolved = await Promise.all(collected);
        buffered.forEach((x, i) => {
            if (resolved[i] === null) {
                throw "KanaDB loading failed for file ID '" + x.buffer + "'";
            }
            x.buffer = resolved[i];
        });

    } else {
        throw "unsupported format type";
    }
 
    return contents;
}
