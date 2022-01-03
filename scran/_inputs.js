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

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    // Skipping if we don't see a change in the relevant files.
    var mock_args = { 
      "matrix": mockFiles(args.files[0]),
      "barcodes": mockFiles(args.files[1]),
      "genes": mockFiles(args.files[2])
    }

    if (!scran_utils.changedParameters(mock_args, parameters)) {
        x.changed = false;
        return;
    }

    // Going through the loading process.
    var input = args.files;
    var mtx_files = input[0];
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

    const tsv = d3.dsvFormat("\t");

    var barcode_file = input[1];
    if (barcode_file.length > 0) {
      var reader = new FileReaderSync();
      var file_size = barcode_file[0].size;
      var buffer = reader.readAsText(barcode_file[0]);
      cache.barcodes = tsv.parse(buffer);
    }

    var genes_file = input[2];
    if (genes_file.length > 0) {
      var reader = new FileReaderSync();
      var file_size = genes_file[0].size;
      var buffer = reader.readAsText(genes_file[0]);
      cache.gene_names = permuteGenes(wasm, tsv.parse(buffer)); /** TODO: pretty sure this'll break. **/
    } else {
      let genes = []
      for (let i = 0; i < cache.matrix.nrow(); i++) {
        genes.push(`Gene ${i + 1}`);
      }
      cache.gene_names = permuteGenes(wasm, genes);
    }

    x.changed = true;
    return;
  };

  x.results = function(wasm) {
    return {};
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
})(scran_inputs);
