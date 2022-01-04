const scran_utils_serialize = {};

(function(x) {
  function normalizeTypedArrays(object) {
    if (Array.isArray(object)) {
      for (var i = 0; i < object.length; i++) {
        object[i] = normalizeTypedArrays(object[i]);
      }
    } else if (object.constructor == Object) {
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

  x.save = function(contents) {
    // Extract out the file buffers.
    var buffered = contents.inputs.contents.files.buffered;
    var all_buffers = [];
    var total_len = 0;

    for (const [key, val] of Object.entries(buffered)) {
      if (Array.isArray(val)) {
        for (var i = 0; i < val.length; i++) {
          var count = all_buffers.length;
          all_buffers.push(val[i]);
          total_len += val[i].byteLength;
          val[i] = { "count": count, "size": val[i].byteLength };
        }
      } else {
        var count = all_buffers.length;
        all_buffers.push(val);
        total_len += val.byteLength;
        buffered[key] = { "count": count, "size": val.byteLength };
      }
    }

    // Converting all other TypedArrays to normal arrays.
    contents = normalizeTypedArrays(contents);

    // Converting the JSON to a string and gzipping it into a Uint8Array.
    var str = JSON.stringify(contents);
    const view = pako.gzip(str);

    // Allocating a huge arrayBuffer.
    var combined = new ArrayBuffer(view.length + total_len);
    var combined_arr = new Uint8Array(combined);

    var offset = 0;
    combined_arr.set(view);
    offset += view.length;

    for (const buf of all_buffers) {
      const tmp = new Uint8Array(buf);
      combined_arr.set(tmp, offset);
      offset += tmp.length;
    }
    
    return combined;
  };

})(scran_utils_serialize);
