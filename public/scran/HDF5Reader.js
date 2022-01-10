import WasmBuffer from "./WasmBuffer.js";
import * as hdf5 from "https://cdn.jsdelivr.net/npm/h5wasm@latest/dist/hdf5_hl.js";

export function readMatrixFromHDF5(wasm, buffer, path = null) {
    hdf5.FS.writeFile("tmp.h5", new Uint8Array(ab));
    var f = new hdf5.File("tmp.h5", "r");

    // Let's try to guess the path.
    if (path === null) {
      let file_keys = f.keys();
      if (file_keys.indexOf("X") != -1) {
        path = "X";
      } else if (file_keys.indexOf("matrix") != -1) {
        path = "matrix";
      } else {
        var sparse_opts = [];
        var dense_opts = [];

        // Try to pick out sparse formats.
        var file_vals = f.values();
        for (var i = 0; i < file_keys.length; i++) {
          var current = file_vals[i];
          var cur_keys = current.keys();
          if (current instanceof hdf5.Group) {
            if (cur_keys.indexOf("data") != -1 && cur_keys.indexOf("indices") && cur_keys.indexOf("indptr")) {
              sparse_opts.push(file_keys[i]);
            }
          } else if (current instanceof hdf5.Dataset && current.shape.length == 2) {
            dense_opts.push(file_keys[i]);
          }
        }

        if (sparse_opts.length) {
          path = sparse_opts[0];
        } else if (dense_opts.length) {
          path = dense_opts[0];
        } else {
          throw "could not automatically find a suitable 'path' inside the HDF5 file";
        }
      }
    }

    let entity = f.get(path);
    var output;
    if (entity instanceof hdf5.Dataset) {
        // i.e., we're dealing with a dense dataset.
        var dims = d.shape;
        var vals = cloneIntoWasmBuffer(wasm, d.value);
        try {
            output = wasm.initialize_sparse_matrix_from_dense_vector(d.shape[1], d.shape[0], vals.ptr, vals.type);
        } finally {
            vals.free();
        }
    } else if (entity instanceof hdf5.Group) {
        var shape_dex = entity.keys.indexOf("shape");
        var dims;
        var csc;

        if (shape_dex != -1) {
            // we're dealing with a 10X-formatted sparse matrix.
            dims = entity.values[shape_dex].value;
            csc = true;

        } else {
            // we're dealing with some H5AD-style sparse matrices.
            dims = entity.attrs["shape"].slice();
            dims.reverse();

            // H5AD defines columns as genes, whereas we define columns as cells.
            // So if something is listed as CSC by H5AD, it's actually CSR from our perspective.
            csc = !(entity.attrs["encoding-type"] === "csc_matrix"); 
        }

        if (dims.length != 2) {
            throw "dimensions for '" + path + "' should be an array of length 2";
        }

        var loader = function(name) {
            var dex = entity.keys.indexOf(name);
            if (dex == -1 || ! (entity.values[dex] instanceof hdf5.Dataset)) {
                throw "missing '" + name + "' dataset inside the '" + path + "' group";
            }
            return cloneIntoWasmBuffer(wasm, entity.values[dex].value);
        };

        var sparse_data = null;
        var sparse_indices = null;
        var sparse_indptr = null;
        try {
            var sparse_data = loader("data");
            var sparse_indices = loader("indices");
            var sparse_indptr = loader("indptr");

            var nonzeros = sparse_data.size;
            if (sparse_indices.size !== nonzeros) {
                throw "'data' and 'indices' arrays should be of the same length";
            }

            if (csc) {
                if (dims[1] + 1 != sparse_indptr.size) {
                    throw "length of 'indptr' array should be equal to the number of columns plus 1";
                }
            } else {
                if (dims[0] + 1 != sparse_indptr.size) {
                    throw "length of 'indptr' array should be equal to the number of rows plus 1";
                }
            }

            output = wasm.initialize_sparse_matrix(
                dims[0], dims[1], nonzeros,
                sparse_data.ptr, sparse_data.type, 
                sparse_indices.ptr, sparse_indices.type,
                sparse_indptr.ptr, sparse_indptr.type,
                csc);

        } finally {
            if (sparse_data !== null) {
                sparse_data.free();
            }
            if (sparse_indices !== null) {
                sparse_indices.free();
            }
            if (sparse_indptr !== null) {
                sparse_indptr.free();
            }
        }
    }

    return output;
}

export function guessGenesFromHDF5(buffer) {
  var f = new hdf5.File(buffer, "HDF5");

  // Does it have a 'var' group?
  var index = f.keys.indexOf("var");
  if (index != -1) {
    var vars = f.values[index];
    if (! (vars instanceof hdf5.Group)) {
      throw "expected 'var' to be a HDF5 group";
    }

    var index2 = vars.keys.indexOf("_index");
    if (index2 == -1 || ! (vars.values[index2] instanceof hdf5.Dataset)) {
      throw "expected 'var' to contain an '_index' dataset";
    }

    var output = {};
    output._index = vars.values[index2].value;

    // Also include anything else that might be a gene symbol.
    for (var i = 0; i < vars.keys.length; i++) {
      if (i == index2) {
        continue;
      }

      var field = vars.keys[i];
      if (field.match(/name/i) || field.match(/symbol/i)) {
        output[field] = vars.values[i].value;            
      }
    }

    return output;
  } 

  // Does it have a 'features' group?
  var index = f.keys.indexOf("features");
  if (index != -1) {
    var feats = f.values[index];
    if (! (feats instanceof hdf5.Group)) {
      throw "expected 'features' to be a HDF5 group";
    }

    var id_index = feats.keys.indexOf("id");
    if (id_index == -1 || ! (feats.values[id_index] instanceof hdf5.Dataset)) {
      throw "expected 'features' to contain a 'id' dataset";
    }

    var name_index = feats.keys.indexOf("name");
    if (name_index == -1 || ! (feats.values[name_index] instanceof hdf5.Dataset)) {
      throw "expected 'features' to contain a 'name' dataset";
    }

    var output = {};
    output.id = feats.values[id_index].value;
    output.name = feats.values[name_index].value;
    return output;
  }

  return null;
}

