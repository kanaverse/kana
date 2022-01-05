const scran_utils_serialize = {};

(function(x) {
  /* Private members */

  // Must be integers!
  const FORMAT_WITH_FILES = 0;
  const FORMAT_WITHOUT_FILES = 1;
  const FORMAT_VERSION = 0;

  /* Private functions */
  function normalizeTypedArrays(object) {
    if (Array.isArray(object)) {
      for (var i = 0; i < object.length; i++) {
        object[i] = normalizeTypedArrays(object[i]);
      }
    } else if (object instanceof Object) {
      for (const [key, element] of Object.entries(object)) {
        object[key] = normalizeTypedArrays(element);
      }
    } else if (ArrayBuffer.isView(object)) {
      object = { 
        "_TypedArray_class": object.constructor.name, 
        "_TypedArray_values": Array.from(object) 
      };
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

  /* Public functions */
  x.save = function(contents) {
    // Extract out the file buffers.
    var buffered = contents.inputs.parameters.files;
    var all_buffers = [];
    var total_len = 0;

    buffered.forEach((x, i) => {
      var val = buffered[i].buffer;
      all_buffers.push(val);
      buffered[i].buffer = { "offset": total_len, "size": val.byteLength };
      total_len += val.byteLength;
    });

    // Converting all other TypedArrays to normal arrays.
    contents = normalizeTypedArrays(contents);

    // Converting the JSON to a string and gzipping it into a Uint8Array.
    var json_str = JSON.stringify(contents);
    const json_view = pako.gzip(json_str);

    // Allocating a huge arrayBuffer.
    var combined = new ArrayBuffer(24 + json_view.length + total_len);
    var combined_arr = new Uint8Array(combined);
    var offset = 0;

    let format = numberToBuffer(FORMAT_WITH_FILES);
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

    for (const buf of all_buffers) {
      const tmp = new Uint8Array(buf);
      combined_arr.set(tmp, offset);
      offset += tmp.length;
    }
    
    return combined;
  };

})(scran_utils_serialize);
