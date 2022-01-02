importScripts("https://cdn.jsdelivr.net/npm/d3-dsv@3");
importScripts("./_utils.js");

const scran_inputs = {};

(function(x) {
  cache = {};
  parameters = {};

  // To be interrogated by downstream steps to figure out whether the
  // inputs changed.
  x.changed = false;

  // Files are not directly comparable, so we just check their name and size.
  function mockFiles(files) {
    var mock = [];
    for (const f of files) {
      mock.push({ "name": f.name, "size": f.size });
    }
    return mock;
  }

  x.compute = function(wasm, args) {
    // Skipping if we don't see a change in the relevant files.
    var mock_args = { 
      "matrix": mockFiles(args.files[0]),
      "barcodes": mockFiles(args.files[1]),
      "genes": mockFiles(args.files[2])
    }

    if (scran_utils.compareParameters(mock_args, scran_inputs.parameters)) {
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
      cache.genes = tsv.parse(buffer);
    } else {
      let genes = []
      for (let i = 0; i < cache.matrix.nrow(); i++) {
        genes.push(`Gene ${i + 1}`);
      }
      cache.genes = genes;
    }

    x.changed = true;
    return;
  };

  x.results = function() {
    return {};
  };

  /* TODO: figure out whether/how to serialize entire files,
   * or just their paths, or... Note that serialization needs
   * to capture the arguments as well.
   */
  x.serialize = function() {
    return null;
  };

  x.unserialize = function(saved) {
    return;
  };

  x.fetchCountMatrix = function() {
    return cache.matrix;
  };
})(scran_inputs);
