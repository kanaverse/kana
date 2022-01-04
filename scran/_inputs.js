const scran_inputs = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions (misc) **/
  function mockFile(f) {
    return { "name": f.name, "size": f.size };
  }

  function mockFiles(files) {
    var mock = [];
    for (const f of files) {
      mock.push(mockFile(f));
    }
    return mock;
  }

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
  function loadMatrixMarketRaw(wasm, args, getMtxBuffers, getGenesBuffer) {
    scran_utils.freeCache(cache.matrix);

    var mtx_buffers = getMtxBuffers();
    var files = { "type": "MatrixMarket", "buffered": { "mtx": mtx_buffers } };

    // In theory, this section may support multiple files (e.g., for multiple samples).
    var contents = new Uint8Array(mtx_buffers[0]);
    var buffer = new WasmBuffer(wasm, contents.length, "Uint8Array");
    try {
      buffer.set(contents);
      var ext = args.mtx[0].name.split('.').pop();
      var is_compressed = (ext == "gz");
      cache.matrix = wasm.read_matrix_market(buffer.ptr, buffer.size, is_compressed);
    } finally {
      buffer.free();
    }

    var genes_buffer = getGenesBuffer();
    if (genes_buffer !== null) {
      var content = new Uint8Array(genes_buffer);
      var ext = args.genes.name.split('.').pop();
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

    cache.files = files;
    delete cache.reloaded; 
    return;
  }

  function loadMatrixMarket(wasm, input) {
    var mtx_files = input[0];
    var mock_args = { "mtx": mockFiles(mtx_files) };

    var genes_file = input[2];
    var has_genes = (genes_file instanceof File);
    if (has_genes) {
      mock_args.genes = mockFile(genes_file);
    }

    if (!scran_utils.changedParameters(mock_args, parameters)) {
        x.changed = false;
        return;
    }

    loadMatrixMarketRaw(wasm,
      mock_args,
      () => {
        var reader = new FileReaderSync();
        var output = [];
        for (var i = 0; i < mtx_files.length; i++) {
          output.push(reader.readAsArrayBuffer(mtx_files[i]));
        }
        return output;
      },
      () => {
        if (has_genes) {
          var reader = new FileReaderSync();
          return reader.readAsArrayBuffer(genes_file);
        } else {
          return null;
        }
      }
    );

    parameters = mock_args;
    x.changed = true;
    return;
  }

  /** Private functions (HDF5) **/
  function loadHDF5Raw(wasm, getHDF5Buffer) {
    scran_utils.freeCache(cache.matrix);

    var h5_buffers = getHDF5Buffers();
    var files = { "type": "HDF5", "buffered": { "h5": h5_buffers } };

    // In theory, we could support multiple HDF5 buffers.
    cache.matrix = readMatrixFromHDF5(wasm, h5_buffers[0]); 

    var genes = guessGenesFromHDF5(contents);
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

    cache.files = files;
    delete cache.reloaded; 
    return;
  }

  function loadHDF5(wasm, input) {
    var h5_files = input[0];
    var mock_args = { "matrix": mockFiles(h5_files) }

    if (!scran_utils.changedParameters(mock_args, parameters)) {
        x.changed = false;
        return;
    }

    loadHDF5Raw(wasm,
      () => {
        var reader = new FileReaderSync();
        var output = [];
        for (var i = 0; i < h5_files.length; i++) {
          output.push(reader.readAsArrayBuffer(h5_files[i]));
        }
        return output;
      }
    );

    parameters = mock_args;
    x.changed = true;
    return;
  }

  // TODO: probably needs more testing but works with matrixmarket
  function clone_inputs(obj) {
    if(Array.isArray(obj)) return obj.slice(0);

    let res= {};
    for (const [key, val] of Object.entries(obj)) {
      if (val instanceof Object) {
        res[key] = clone_inputs(val);
      }

      if (!Array.isArray(val) && !(val instanceof Object)) {
        res[key] = val;
      }
    }

    return res;
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    // TODO: switch to args telling us what the data type is.
    var first_name = args.files[0][0].name;
    if (first_name.match(/\.mtx/)) {
      loadMatrixMarket(wasm, args.files);
    } else if (first_name.match(/\.h5/) || first_name.match(/\.hdf5/)) {
      loadHDF5(wasm, args.files);
    } else {
      throw "unknown matrix file extension for '" + first_name + "'";
    }
    return;
  };

  x.results = function(wasm) {
    return {
      "gene_names": x.fetchGeneNames(wasm),
      "dimensions": x.fetchDimensions(wasm)
    };
  };

  /* TODO: figure out whether/how to serialize entire files,
   * or just their paths, or... Note that serialization needs
   * to capture the arguments as well.
   */
  x.serialize = function(wasm) {
    var contents = {};
    if ("reloaded" in cache) {
      contents.gene_names = cache.reloaded.gene_names;
      contents.num_cells = cache.reloaded.num_cells;
      
      contents.files = clone_inputs(cache.reloaded.files)
    } else {
      contents.gene_names = cache.gene_names;
      contents.num_cells = cache.matrix.ncol();
      
      contents.files = clone_inputs(cache.files)
    }

    return {
      "parameters": parameters,
      "contents": contents
    };
  };

  x.unserialize = function(wasm, saved) {
    parameters = saved.parameters;
    cache.reloaded = saved.contents;
    return;
  };

  /** Public functions (custom) **/
  x.fetchCountMatrix = function(wasm) {
    if ("reloaded" in cache) {
      if (cache.reloaded.files.type == "MatrixMarket") {
        loadMatrixMarketRaw(wasm,
          parameters,
          () => cache.reloaded.files.buffered.mtx,
          () => cache.reloaded.files.buffered.genes 
        );
      } else {
        loadHDF5Raw(wasm, 
          () => cache.reloaded.files.buffered.h5
        );
      }
    }
    return cache.matrix;
  };

  x.fetchGeneNames = function(wasm) {
    if ("reloaded" in cache) {
      return cache.reloaded.gene_names;
    } else {
      return cache.gene_names;
    }
  }

  x.fetchDimensions = function(wasm) {
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
