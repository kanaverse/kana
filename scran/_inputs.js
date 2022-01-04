const scran_inputs = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Private functions **/
  function mockFiles(files) {
    var mock = [];
    for (const f of files) {
      mock.push({ "name": f.name, "size": f.size });
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

  function loadMatrixMarket(wasm, input) {
    var mtx_files = input[0];
    var barcode_file = input[1];
    var genes_file = input[2];

    var mock_args = { 
      "matrix": mockFiles(mtx_files),
      "barcodes": mockFiles(barcode_file),
      "genes": mockFiles(genes_file)
    }

    if (!scran_utils.changedParameters(mock_args, parameters)) {
        x.changed = false;
        return;
    }

    scran_utils.freeCache(cache.matrix);
    var reader = new FileReaderSync();
    var file_size = mtx_files[0].size;
    var contents = reader.readAsArrayBuffer(mtx_files[0]);
    var contents = new Uint8Array(contents);

    var buffer = new WasmBuffer(wasm, file_size, "Uint8Array");
    try {
      buffer.set(contents);
      var ext = mtx_files[0].name.split('.').pop();
      var is_compressed = (ext == "gz");
      cache.matrix = wasm.read_matrix_market(buffer.ptr, mtx_files[0].size, is_compressed);
    } finally {
      buffer.free();
    }

    /** TODO: support Gzipped TSV files here. **/
    const tsv = d3.dsvFormat("\t");

    if (barcode_file.length > 0) {
      var reader = new FileReaderSync();
      var file_size = barcode_file[0].size;
      var buffer = reader.readAsText(barcode_file[0]);
      cache.barcodes = tsv.parse(buffer);
    }

    if (genes_file.length > 0) {
      var reader = new FileReaderSync();
      var file_size = genes_file[0].size;
      var buffer = reader.readAsText(genes_file[0]);
      cache.gene_names = tsv.parse(buffer); 
    } else {
      cache.gene_names = dummyGenes(cache.matrix.nrow());
    }

    parameters = mock_args;
    delete cache.reloaded; 
    x.changed = true;
    return;
  }

  function loadHDF5(wasm, input) {
    var h5_files = input[0];
    var mock_args = { 
      "matrix": mockFiles(h5_files),
    }

    if (!scran_utils.changedParameters(mock_args, parameters)) {
        x.changed = false;
        return;
    }

    scran_utils.freeCache(cache.matrix);
    var reader = new FileReaderSync();
    var contents = reader.readAsArrayBuffer(h5_files[0]);
    cache.matrix = readMatrixFromHDF5(wasm, contents); 

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

    parameters = mock_args;
    delete cache.reloaded; 
    x.changed = true;
    return;
  }

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    var first_name = args.files[0][0].name;

    if (first_name.match(/\.mtx/)) {
      loadMatrixMarket(wasm, args.files);
    } else if (first_name.match(/\.h5/) || first_name.match(/\.hdf5/)) {
      loadHDF5(wasm, args.files);
    } else {
      throw "unknown matrix file extension for '" + first_name + "'";
    }
   
    cache.gene_names = permuteGenes(wasm, cache.gene_names);
    return;
  };

  x.results = function(wasm) {
    return { "gene_names": x.fetchGeneNames(wasm) };
  };

  /* TODO: figure out whether/how to serialize entire files,
   * or just their paths, or... Note that serialization needs
   * to capture the arguments as well.
   */
  x.serialize = function(wasm) {
    var contents = {};

    if ("reloaded" in cache) {
      contents = contents.reloaded;
    } else {
      contents.gene_names = cache.gene_names;
      contents.num_cells = cache.matrix.ncol();
    }

    return {
      "parameters": parameters,
      "contents": x.results(wasm)        
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
      /** TODO: something to reconstitute the matrix! **/
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
