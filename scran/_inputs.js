const scran_inputs = {};

(function (x) {
  /** Private members **/
  var cache = {};
  var parameters = {};
  var abbreviated = {};

  /** Public members **/
  x.changed = false;

  /** Private functions (misc) **/
  function permuteGenes(wasm, genes) {
    var output = genes.slice();
    var buf = new WasmBuffer(wasm, cache.matrix.nrow(), "Int32Array");
    try {
      cache.matrix.permutation(buf.ptr);

      var perm = buf.array();
      for (var i = 0; i < perm.length; i++) {
        output[perm[i]] = genes[i];
      }
    } finally {
      buf.free();
    }
    return output;
  }

  function dummyGenes(nrows) {
    let genes = []
    for (let i = 0; i < nrows; i++) {
      genes.push(`Gene ${i + 1}`);
    }
    return genes;
  }

  /** Private functions (MatrixMarket) **/
  function loadMatrixMarketRaw(wasm, files) {
    scran_utils.freeCache(cache.matrix);

    // In theory, this section may support multiple files (e.g., for multiple samples).
    var mtx_files = files.filter(x => x.type == "mtx");
    var first_mtx = mtx_files[0];
    var contents = new Uint8Array(first_mtx.buffer);
    var buffer = new WasmBuffer(wasm, contents.length, "Uint8Array");
    try {
      buffer.set(contents);
      var ext = first_mtx.name.split('.').pop();
      var is_compressed = (ext == "gz");
      cache.matrix = wasm.read_matrix_market(buffer.ptr, buffer.size, is_compressed);
    } finally {
      buffer.free();
    }

    var genes_file = files.filter(x => x.type == "genes");
    if (genes_file.length == 1) {
      var genes_file = genes_file[0] 
      var content = new Uint8Array(genes_file.buffer);
      var ext = genes_file.name.split('.').pop();
      if (ext == "gz") {
        content = pako.ungzip(content);
      }

      const dec = new TextDecoder();
      let genes_str = dec.decode(content);
      const tsv = d3.dsvFormat("\t");
      let parsed = tsv.parseRows(genes_str);
      if (parsed.length != cache.matrix.nrow()) {
        throw "number of matrix rows is not equal to the number of genes in '" + args.genes.name + "'";
      }

      var ids = [], symb = [];
      parsed.forEach(x => {
        ids.push(x[0]);
        symb.push(x[1]);
      });

      cache.gene_names = ids;
      files.buffered.genes = genes_buffer;
    } else {
      cache.gene_names = dummyGenes(cache.matrix.nrow());
    }

    cache.gene_names = permuteGenes(wasm, cache.gene_names);
    return;
  }

  function loadMatrixMarket(wasm, args) {
    var reader = new FileReaderSync();

    // First pass computes an abbreviated version to quickly check for changes.
    // Second pass does the actual readArrayBuffer.
    for (var it = 0; it < 2; it++) {
      var formatted = { "type": "MatrixMarket", "files": [] };

      var bufferFun;
      if (it == 0) {
        bufferFun = (f) => f.size;
      } else {
        bufferFun = (f) => reader.readAsArrayBuffer(f);
      }

      for (const f of args.mtx) {
        formatted.files.push({ "type": "mtx", "name": f.name, "buffer": bufferFun(f) });
      }
      var genes_file = args.genes;
      if (genes_file instanceof File) {
        formatted.files.push({ "type": "genes", "name": genes_file.name, "buffer": bufferFun(genes_file) });
      }

      if (it == 0) {
        if (!scran_utils.changedParameters(abbreviated, formatted)) {
          x.changed = false;
          return;
        } else {
          abbreviated = formatted;
          x.changed = true;
        }
      } else {
        parameters = formatted;
        loadMatrixMarketRaw(wasm, formatted.files);
        delete cache.reloaded;
      }
    }

    return;
  }

  /** Private functions (HDF5) **/
  function loadHDF5Raw(wasm, files) {
    scran_utils.freeCache(cache.matrix);

    // In theory, we could support multiple HDF5 buffers.
    var first_file = files[0];
    cache.matrix = readMatrixFromHDF5(wasm, first_file.buffer);

    var genes = guessGenesFromHDF5(first_file.buffer);
    if (genes === null) {
      cache.gene_names = dummyGenes(cache.matrix.nrow());
    } else {
      /** TODO: handle multiple names properly. **/
      for (const [key, val] of Object.entries(genes)) {
        cache.gene_names = val;
        break;
      }
    }
    cache.gene_names = permuteGenes(wasm, cache.gene_names);
    return;
  }

  function loadHDF5(wasm, args) {
    var reader = new FileReaderSync();

    // First pass computes an abbreviated version to quickly check for changes.
    // Second pass does the actual readArrayBuffer.
    for (var it = 0; it < 2; it++) {
      var formatted = { "type": "HDF5", "files": [] };

      var bufferFun;
      if (it == 0) {
        bufferFun = (f) => f.size;
      } else {
        bufferFun = (f) => reader.readAsArrayBuffer(f);
      }

      for (const f of args.file) {
        formatted.files.push({ "type": "h5", "name": f.name, "buffer": bufferFun(f) });
      }

      if (it == 0) {
        if (!scran_utils.changedParameters(abbreviated, formatted)) {
          x.changed = false;
          return;
        } else {
          abbreviated = formatted;
          x.changed = true;
        }
      } else {
        parameters = formatted;
        loadHDF5Raw(wasm, formatted.files);
        delete cache.reloaded;
      }
    }

    return;
  }

  /** Public functions (standard) **/
  x.compute = function (wasm, args) {
    switch (args.format) {
      case "mtx":
        loadMatrixMarket(wasm, args.files);
        break;
      case "hdf5":
      case "tenx":
      case "h5ad":
        loadHDF5(wasm, args.files);
        break;
      case "kana":
        // do nothing, this is handled by unserialize.
        break;
      default:
        throw "unknown matrix file extension: '" + args.format + "'";
    }
    return;
  };

  x.results = function (wasm) {
    return {
      "gene_names": x.fetchGeneNames(wasm),
      "dimensions": x.fetchDimensions(wasm)
    };
  };

  x.serialize = function (wasm) {
    var contents = {};
    if ("reloaded" in cache) {
      contents.gene_names = cache.reloaded.gene_names;
      contents.num_cells = cache.reloaded.num_cells;
    } else {
      contents.gene_names = cache.gene_names;
      contents.num_cells = cache.matrix.ncol();
    }

    // Making a deep-ish clone of the parameters so that any fiddling with
    // buffers during serialization does not compromise internal state.
    var parameters2 = { ...parameters };
    parameters2.files = parameters.files.map(x => { return { ...x } });

    return {
      "parameters": parameters2,
      "contents": contents
    };
  };

  x.unserialize = function (wasm, saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };

  /** Public functions (custom) **/
  x.fetchCountMatrix = function (wasm) {
    if ("reloaded" in cache) {
      if (parameters.type == "MatrixMarket") {
        loadMatrixMarketRaw(wasm, parameters.files); 
      } else {
        loadHDF5Raw(wasm, parameters.files);
      }
    }
    return cache.matrix;
  };

  x.fetchGeneNames = function (wasm) {
    if ("reloaded" in cache) {
      return cache.reloaded.gene_names;
    } else {
      return cache.gene_names;
    }
  }

  x.fetchDimensions = function (wasm) {
    if ("reloaded" in cache) {
      return {
        "num_genes": cache.reloaded.gene_names.length,
        "num_cells": cache.reloaded.num_cells
      };
    } else {
      return {
        "num_genes": cache.matrix.nrow(),
        "num_cells": cache.matrix.ncol()
      };
    }
  }
})(scran_inputs);
