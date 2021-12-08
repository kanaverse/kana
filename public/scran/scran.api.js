class scranSTATE {
  constructor() {
    this.state = null;
    this.clusterNN = null;
    this.clusterBuildNN = null;
    this.tsneNN = null;
    this.umapNN = null;
  }

  set_state(options) {
    this.state = options;
  }

  get_state() {
    return this.state;
  }

  // diff(options) {
  //   var self = this;
  //   // could do something smarter later

  //   if (this.state.files != options.files) {
  //     var match = 0;
  //     for (const [idx, m] of this.state.files.entries()) {
  //       if (JSON.stringify(m[0]) != JSON.stringify(options.files[idx][0])) {
  //         match++;
  //         break;
  //       }
  //     }
  //   }

  //   if (match > 0) {
  //     return 0;
  //   }

  //   // in this order
  //   var paramlist = ["qc", "fSelection", "pca", "cluster", "tsne", "umap", "markerGene"];

  //   var step = 1;

  //   for (const [idx, m] of paramlist.entries()) {
  //     if (JSON.stringify(self.state.params[m]) != JSON.stringify(options.params[m])) {
  //       // since iteration is 0-indexing
  //       step = idx + 1;
  //       break;
  //     }
  //   }

  //   return step;
  // }

  diff_param(param, options) {
    return JSON.stringify(self.state.params[param]) != JSON.stringify(options.params[m])
  }

  diff(options) {
    var self = this;
    // could do something smarter later

    if (this.state.files != options.files) {
      var match = 0;
      for (const [idx, m] of this.state.files.entries()) {
        if (JSON.stringify(m[0]) != JSON.stringify(options.files[idx][0])) {
          match++;
          break;
        }
      }
    }

    if (match > 0) {
      return 0;
    }

    var reneighbor = true;
    var linear_ops = [
      "qc",
      "fSelection",
      "pca",
      "build_neighbor_index",
      "snn_find_neighbors",
      "snn_build_graph",
      "snn_cluster_graph",
      "markerGene"
    ];
    var linear_rerun = [];

    for (const [idx, op] of linear_ops.entries()) {
      if (diff_param(op, options)) {
        linear_rerun = linear_ops.slice(idx);
        break;
      } else if (op == "build_neighbor_index") {
        reneighbor = false;
      }
    }

    var tsne_ops = [
      "tsne_init",
      "tsne_run"
    ];
    var tsne_rerun = [];

    if (!reneighbor) {
      for (const [idx, op] of tsne_ops.entries()) {
        if (diff_param(op, options)) {
          tsne_rerun = tsne_ops.slice(idx);
          break;
        }
      }
    }

    var umap_ops = [
      "umap_find_neighbors",
      "umap_init",
      "umap_run"
    ];
    var umap_rerun = [];

    if (!reneighbor) {
      for (const [idx, op] of umap_ops.entries()) {
        if (diff_param(op, options)) {
          umap_rerun = umap_ops.slice(idx);
        }
      }
    }

    return { "linear": linear_rerun, "tsne": tsne_rerun, "umap": umap_rerun };
  }
}


class scran {
  constructor(options, wasm) {
    // wasm module initialized in the browser
    this.wasm = wasm;

    // holds any options
    this.options = options;

    // keep track of data objects
    this._internalMemTracker = {};

    this._heapMap = {
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
      },
    }

    this.genes = null;
    this.barcodes = null;
  }

  mountFiles(input) {
    var self = this;
    self.files = input;

    var files_to_load = [];
    self.files.forEach(m => {
      if (m.length > 0) {
        files_to_load.push(m[0]);
      }
    });

    var mtx_file = input[0];
    const mtx_file_path = `${DATA_PATH}/${mtx_file[0].name}`;


    var reader = new FileReaderSync();
    var file_size = mtx_file[0].size;
    var buffer_ptr = this.wasm._malloc(file_size); // in bytes
    var buffer_vec = new Uint8Array(this.wasm.HEAPU8.buffer, buffer_ptr, file_size);

    var buffer = reader.readAsArrayBuffer(mtx_file[0]);
    var data = new Uint8Array(buffer);
    buffer_vec.set(data);
    // console.log(data)

    var ext = mtx_file_path.split('.').pop();
    self.loadDataFromPath(buffer_ptr, mtx_file[0].size, (ext == "gz"));

    const tsv = d3.dsvFormat("\t");

    var barcode_file = input[1];
    if (barcode_file.length > 0) {
      // const barcode_file_path = `${DATA_PATH}/${barcode_file[0].name}`;
      var reader = new FileReaderSync();
      var file_size = barcode_file[0].size;
      var buffer = reader.readAsText(barcode_file[0]);
      // const barcode_str = FS.readFile(barcode_file_path, { "encoding": "utf8" });
      self.barcodes = tsv.parse(buffer);
    }

    var genes_file = input[2];
    if (genes_file.length > 0) {
      // const genes_file_path = `${DATA_PATH}/${genes_file[0].name}`;
      var reader = new FileReaderSync();
      var file_size = genes_file[0].size;
      var buffer = reader.readAsText(genes_file[0]);
      // const genes_str = FS.readFile(genes_file_path, { "encoding": "utf8" });
      self.genes = tsv.parse(buffer);
    }
  }

  loadData(data, nrow, ncol) {
    // this.data = data;
    // for now generate random data
    this.data = this.generateData(nrow * ncol);

    // console.log(this.data);

    this.matrix = this.getNumMatrix(this.data, nrow, ncol);
    // console.log(this.matrix);
  }

  loadDataFromPath(ptr, size, compressed) {
    this.matrix = this.wasm.read_matrix_market(ptr, size, compressed);
    this.matrix = this.wasm.log_norm_counts(this.matrix, false, 0, false, 0);
  }

  getRandomArbitrary() {
    return Math.random() * 100;
  }

  setZero(arr) {
    arr.vector.set(arr.vector.map(() => 0));
  }

  generateData(size) {
    const arr = this.createMemorySpace(size, "Float64Array", "oData");
    var vec = this.getVector("oData");
    vec.set(vec.map(() => this.getRandomArbitrary()));
    return arr;
  }

  // from epiviz
  _generateGuid() {
    var chars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var result = "";
    var size = 5;

    for (var i = 0; i < size; ++i) {
      result += chars[Math.round(Math.random() * (chars.length - 1))];
    }
    return "var-" + result;
  }

  // pretty much the allocators
  createMemorySpace(size, type, key) {
    if (!key) {
      key = this._generateGuid();
    }

    if (type in this._heapMap) {
      const typeOpt = this._heapMap[type];
      let ptr = this.wasm._malloc(size * typeOpt["size"]);

      let x = {
        ptr: ptr,
        size: size,
        type: type,
        // vector: arr,
      };

      // this.setZero(x);
      this._internalMemTracker[key] = x;

      return x;
    }
  }

  getMemorySpace(key) {
    return this._internalMemTracker[key];
  }

  getVector(key, which = null, dim = null) {
    const obj = this.getMemorySpace(key);
    const type = obj["type"];
    const typeOpt = this._heapMap[type];
    var ptr = obj["ptr"];
    var size = obj["size"];

    if (dim != null) {
      if (!Array.isArray(dim)) {
        dim = [dim];
      }
      if (!Array.isArray(which)) {
        which = [which];
      }
      if (dim.size != which.size) {
        throw "'dim' and 'which' do not have the same length";
      }

      var vec_size = size / dim.reduce((a, b) => a * b);
      var multiplier = vec_size;
      for (var i = 0; i < which.length; i++) {
        ptr += multiplier * which[i];
        multiplier *= dim[i];
      }

      size = vec_size;
    }

    let arr;

    if (type == "Float64Array") {
      arr = new Float64Array(
        this.wasm[typeOpt["wasm"]].buffer,
        ptr,
        size
      );
    } else if (type == "Float32Array") {
      arr = new Float32Array(
        this.wasm[typeOpt["wasm"]].buffer,
        ptr,
        size
      );
    } else if (type == "Uint8Array") {
      arr = new Uint8Array(
        this.wasm[typeOpt["wasm"]].buffer,
        ptr,
        size
      );
    } else if (type == "Int32Array") {
      arr = new Int32Array(
        this.wasm[typeOpt["wasm"]].buffer,
        ptr,
        size
      );
    } else if (type == "Uint32Array") {
      arr = new Uint32Array(
        this.wasm[typeOpt["wasm"]].buffer,
        ptr,
        size
      );
    }

    return arr;
  }

  freeMemorySpace(key) {
    this.wasm._free(this._internalMemTracker[key][0]);
  }

  getNumMatrix(data, nrow, ncol) {
    var instance = new this.wasm.NumericMatrix(
      nrow,
      ncol,
      data.ptr
    );

    return instance;
  }

  qcMetrics(nmads) {
    var self = this;
    var nsubsets = 1;
    var subsets = this.createMemorySpace(
      this.matrix.nrow() * nsubsets,
      "Uint8Array",
      "qc_subsets"
    );

    // Testing:
    var subvec = this.getVector("qc_subsets");
    subvec.set(subvec.map(() => 0));
    // subvec[0] = 1;
    // subvec[1] = 1;
    // subvec[2] = 1;
    // subvec[this.matrix.ncol() + 2] = 1;
    // subvec[this.matrix.ncol() + 3] = 1;
    // subvec[this.matrix.ncol() + 4] = 1;
    // subvec[this.matrix.ncol() + 5] = 1;
    // console.log(this.getVector("qc_subsets", 0, 2));
    // console.log(this.getVector("qc_subsets", 1, 2));

    var metrics_output = this.wasm.per_cell_qc_metrics(this.matrix, nsubsets, subsets.ptr);
    this.qc_metrics = {
      "sums": metrics_output.sums().slice(),
      "detected": metrics_output.detected().slice(),
      "proportion": metrics_output.subset_proportions(0).slice() // TODO: generalize for multiple subsets.
    };

    var filter_output = this.wasm.per_cell_qc_filters(metrics_output, false, 0, nmads);
    this.thresholds = [
      filter_output.thresholds_sums()[0],
      filter_output.thresholds_detected()[0],
      filter_output.thresholds_proportions(0)[0] // TODO: generalize...
    ];

    var filtered = this.wasm.filter_cells(this.matrix, filter_output.discard_overall().byteOffset, false);
    this.filteredMatrix = filtered;

    metrics_output.delete();
    filter_output.delete();

    // compute distributions for all
    var maxDist = 100;
    var distributions = {
      "sums": new Array(maxDist).fill(0),
      "detected": new Array(maxDist).fill(0),
      "proportion": new Array(maxDist).fill(0)
    };

    var ranges = {
      "sums": [],
      "detected": [],
      "proportion": []
    };

    ["sums", "detected", "proportion"].forEach(function (x, i) {

      // if (x != "proportion") {
      //   self.qc_metrics[x] = self.qc_metrics[x].map(x => Math.log2(x + 1));
      // }

      var tmin = Math.min(...self.qc_metrics[x]);
      var tmax = Math.max(...self.qc_metrics[x]);

      ranges[x] = [tmin, tmax];

      // var tscale = d3.scaleLinear()
      //   .domain([tmin, tmax])
      //   .range([0, 100]);

      var m = (100) / (tmax - tmin);
      var b = -m * tmin;

      self.qc_metrics[x].forEach(function (y, j) {
        var idx = Math.ceil((m * y) + b);
        distributions[x][idx]++;
      });
    });

    return {
      "sums": distributions.sums,
      "detected": distributions.detected,
      "proportion": distributions.proportion,
      "ranges": ranges,
      "thresholds": {
        "sums": this.thresholds[0],
        "detected": this.thresholds[1],
        "proportion": this.thresholds[2]
      }
    }
  }

  filterCells() {
    var sums_vector = this.qc_metrics.sums;
    var detected_vector = this.qc_metrics.detected;
    var proportions_vector = this.qc_metrics.proportion;

    var discard_overall = this.createMemorySpace(
      this.matrix.ncol(),
      "Uint8Array",
      "disc_qc_filt"
    );

    var disc_vector = this.getVector("disc_qc_filt");

    for (var n = 0; n < this.matrix.ncol(); n++) {
      if (sums_vector[n] < this.thresholds[0] ||
        detected_vector[n] < this.thresholds[1] ||
        proportions_vector[n] > this.thresholds[2]) {
        disc_vector[n] = 1;
      } else {
        disc_vector[n] = 0;
      }
    }

    var filtered = this.wasm.filter_cells(this.matrix, discard_overall.ptr, false);

    if (this.filteredMatrix !== undefined) {
      this.filteredMatrix.delete();
    }
    this.filteredMatrix = filtered;
  }

  fSelection(span) {
    var model_output = this.wasm.model_gene_var(this.filteredMatrix, false, 0, span);

    var means_vec2 = model_output.means(0).slice();
    var vars_vec2 = model_output.variances(0).slice();
    var fitted_vec2 = model_output.fitted(0).slice();
    var resids_vec2 = model_output.residuals(0).slice();

    model_output.delete();

    this.residuals = resids_vec2;
    this.sorted_residuals = resids_vec2.slice(); // a separate copy.
    this.sorted_residuals.sort();

    return {
      "means": means_vec2,
      "vars": vars_vec2,
      "fitted": fitted_vec2,
      "resids": resids_vec2,
      "genes": this.genes
    }
  }

  runPCA(npc) {
    this.n_pcs = npc;

    var sub = this.createMemorySpace(
      this.filteredMatrix.nrow(),
      "Uint8Array",
      "subset_PCA"
    );

    var filter = false;
    var num_hvgs = 4000;
    if ("sorted_residuals" in this && num_hvgs > 0) {
      filter = true;
      var threshold_at = this.sorted_residuals[this.sorted_residuals.length - num_hvgs];

      var sub2 = this.getVector("subset_PCA");
      sub2.forEach((element, index, array) => {
        array[index] = this.residuals[index] >= threshold_at;
      });
      // console.log(sub2);
    }

    // console.log(sub.vector);

    // console.log(pcs.vector);
    // console.log(var_exp.vector);

    var pca_output = this.wasm.run_pca(this.filteredMatrix, this.n_pcs, filter, sub.ptr, false);

    var var_exp = pca_output.variance_explained().slice();
    var total_var = pca_output.total_variance();
    for (var n = 0; n < var_exp.length; n++) {
      var_exp[n] /= total_var;
    }

    if (this.pcs !== undefined) {
      this.pcs.delete();
    }
    this.pcs = pca_output;

    var res_pc = this.pcs.pcs();

    var pcs_mem = this.createMemorySpace(
      this.filteredMatrix.nrow() * npc,
      "Float64Array",
      "PCA_mat"
    );

    var pc_mat = this.getVector("PCA_mat");
    pc_mat.set(res_pc);

    this._pca_mat = new this.wasm.NumericMatrix(
      this.filteredMatrix.nrow(),
      npc,
      pcs_mem.ptr
    );

    // console.log(pcs.vector);
    // console.log(var_exp.vector);

    return {
      // "pcs": pcs,
      "var_exp": var_exp
    }
  }

  buildNeighborIndex(approximate = true) {

    var nn_index = this.wasm.build_neighbor_index(this._pca_mat, this.n_pcs,
      this.filteredMatrix.ncol(), approximate);

    if (this.nn_index !== undefined) {
      this.nn_index.delete();
    }

    this.nn_index = nn_index;
    return {};
  }

  initializeTsne(perplexity) {
    var tsne = this.createMemorySpace(
      this.filteredMatrix.ncol() * 2,
      "Float64Array",
      "tsne"
    );

    if (this.tsne_buffer !== undefined) {
      this.freeMemorySpace("tsne");
    }
    this.tsne_buffer = tsne;

    var init_tsne = this.wasm.initialize_tsne_from_index(this.nn_index, perplexity, tsne.ptr);
    if (this.init_tsne !== undefined) {
      this.init_tsne.delete();
    }
    this.init_tsne = init_tsne;
  }

  runTsne(iterations, animate = false) {
    var self = this;
    // console.log(this.getVector("mat_PCA"));
    // var pcs = this.getMemorySpace("mat_PCA");

    var init_tsne_copy = this.init_tsne.clone();

    var delay = 15;
    if (animate) {
      // var maxiter = 1000;
      this.wasm.run_tsne(init_tsne_copy, delay, iterations, tsne.ptr);
      // console.log(this.init_tsne_copy.iterations());
      this._lastIter = 0;

      var iterator = setInterval(() => {

        if (init_tsne_copy.iterations() >= iterations) {
          clearInterval(iterator);
        }

        var sh_tsne = self.getVector("tsne") //new SharedArrayBuffer(this.filteredMatrix.ncol());
        // sh_tsne.set(self.getVector("tsne"));

        var tsne1 = [], tsne2 = [];
        for (var i = 0; i < sh_tsne.length; i++) {
          if (i % 2 == 0) {
            tsne1.push(sh_tsne[i]);
          }
          else {
            tsne2.push(sh_tsne[i]);
            // sample.push("sample");
          }
        }

        postMessage({
          type: "tsne_iter",
          resp: JSON.parse(JSON.stringify({
            "tsne1": tsne1,
            "tsne2": tsne2,
            "iteration": init_tsne_copy.iterations()
          })),
          msg: `Success: TSNE done, ${self.filteredMatrix.nrow()}, ${self.filteredMatrix.ncol()}`
        });

        self.wasm.run_tsne(init_tsne_copy, delay, iterations, tsne.ptr);
      }, delay);

      var sh_tsne = self.getVector("tsne") //new SharedArrayBuffer(this.filteredMatrix.ncol());
      // sh_tsne.set(self.getVector("tsne"));

      var tsne1 = [], tsne2 = [];
      for (var i = 0; i < sh_tsne.length; i++) {
        if (i % 2 == 0) {
          tsne1.push(sh_tsne[i]);
        }
        else {
          tsne2.push(sh_tsne[i]);
          // sample.push("sample");
        }
      }

      init_tsne_copy.delete();
      return {
        "tsne1": tsne1,
        "tsne2": tsne2,
        "clusters": self.getVector("cluster_assignments"),
        "iteration": self._lastIter
      }
    } else {

      for (; init_tsne_copy.iterations() <= iterations;) {
        self.wasm.run_tsne(init_tsne_copy, delay, iterations, tsne.ptr);
      }

      var sh_tsne = self.getVector("tsne") //new SharedArrayBuffer(this.filteredMatrix.ncol());
      // sh_tsne.set(self.getVector("tsne"));

      var x = [], y = [];
      for (var i = 0; i < sh_tsne.length; i += 2) {
        x.push(sh_tsne[i]);
        y.push(sh_tsne[i + 1]);
      }

      init_tsne_copy.delete();
      return {
        "tsne": { x, y },
        "clusters": self.getVector("cluster_assignments"),
        "iteration": self._lastIter
      }
    }
  }

  initializeUmapNeighbors(num_neighbors = 15) {
    var nn_umap = this.wasm.find_nearest_neighbors(this.nn_index, num_neighbors);
    if (this.nn_umap !== undefined) {
      this.nn_umap.delete();
    }
    this.nn_umap = nn_umap;
    return;
  }

  initializeUmap(num_epochs = 500, min_dist = 0.01) {
    var umap = this.createMemorySpace(
      this.filteredMatrix.ncol() * 2,
      "Float64Array",
      "umap"
    );
    if (this.umap_buffer !== undefined) {
      this.freeMemorySpace("umap");
    }
    this.umap_buffer = umap;

    var init_umap = this.wasm.initialize_umap_from_neighbors(this.nn_umap,
      num_epochs, min_dist, umap.ptr);
    if (this.init_umap !== undefined) {
      this.init_umap.delete();
    }
    this.init_umap = init_umap;

    return;
  }

  runUmap(animate = false) {
    var self = this;
    // console.log(this.getVector("mat_PCA"));
    // var pcs = this.getMemorySpace("mat_PCA");

    var init_umap_copy = this.init_umap.clone();
    var iterations = init_umap_copy.num_epochs();

    var umap = this.createMemorySpace(
      this.filteredMatrix.ncol() * 2,
      "Float64Array",
      "umap_copy"
    );
    var copy = getVector("umap_copy");
    var original = getVector("umap");
    copy.set(original);

    var delay = 15;
    if (animate) {
      // var maxiter = 1000;
      this.wasm.run_umap(init_umap_copy, delay, iterations, umap.ptr);
      // console.log(this.init_umap_copy.iterations());
      this._lastIter = 0;

      var iterator = setInterval(() => {

        if (init_umap_copy.iterations() >= iterations) {
          clearInterval(iterator);
        }

        var sh_umap = self.getVector("umap") //new SharedArrayBuffer(this.filteredMatrix.ncol());
        // sh_umap.set(self.getVector("umap"));

        var umap1 = [], umap2 = [];
        for (var i = 0; i < sh_umap.length; i++) {
          if (i % 2 == 0) {
            umap1.push(sh_umap[i]);
          }
          else {
            umap2.push(sh_umap[i]);
            // sample.push("sample");
          }
        }

        postMessage({
          type: "umap_iter",
          resp: JSON.parse(JSON.stringify({
            "umap1": umap1,
            "umap2": umap2,
            "iteration": init_umap_copy.iterations()
          })),
          msg: `Success: TSNE done, ${self.filteredMatrix.nrow()}, ${self.filteredMatrix.ncol()}`
        });

        self.wasm.run_umap(init_umap_copy, delay, iterations, umap.ptr);
      }, delay);

      var sh_umap = self.getVector("umap") //new SharedArrayBuffer(this.filteredMatrix.ncol());
      // sh_umap.set(self.getVector("umap"));

      var umap1 = [], umap2 = [];
      for (var i = 0; i < sh_umap.length; i++) {
        if (i % 2 == 0) {
          umap1.push(sh_umap[i]);
        }
        else {
          umap2.push(sh_umap[i]);
          // sample.push("sample");
        }
      }

      init_umap_copy.delete();
      freeMemorySpace("umap_copy");
      return {
        "umap1": umap1,
        "umap2": umap2,
        "clusters": self.getVector("cluster_assignments"),
        "iteration": self._lastIter
      }
    } else {

      for (; init_umap_copy.iterations() <= iterations;) {
        self.wasm.run_umap(init_umap_copy, delay, iterations, umap.ptr);
      }

      var sh_umap = self.getVector("umap") //new SharedArrayBuffer(this.filteredMatrix.ncol());
      // sh_umap.set(self.getVector("umap"));

      var x = [], y = [];
      for (var i = 0; i < sh_umap.length; i += 2) {
        x.push(sh_umap[i]);
        y.push(sh_umap[i + 1]);
      }

      init_umap_copy.delete();
      freeMemorySpace("umap_copy");
      return {
        "umap": { x, y },
        "clusters": self.getVector("cluster_assignments"),
        "iteration": self._lastIter
      }

    }

    // var iterator = setInterval(() => {

    //   if (self.init_tsne.iterations() >= iterations) {
    //     clearInterval(iterator);
    //   }


    //   var sh_tsne = self.getVector("tsne") //new SharedArrayBuffer(this.filteredMatrix.ncol());
    //   // sh_tsne.set(self.getVector("tsne"));

    //   var tsne1 = new Float64Array(new SharedArrayBuffer(self.filteredMatrix.ncol() * 8)),
    //     tsne2 = new Float64Array(new SharedArrayBuffer(self.filteredMatrix.ncol() * 8));
    //   for (var i = 0; i < sh_tsne.length; i++) {
    //     if (i % 2 == 0) {
    //       // tsne1.push(sh_tsne[i]);
    //       tsne1[parseInt(i / 2)] = sh_tsne[i];
    //     }
    //     else {
    //       // tsne2.push(sh_tsne[i]);
    //       // sample.push("sample");
    //       tsne2[Math.floor(i / 2)] = sh_tsne[i];
    //     }
    //   }

    //   postMessage({
    //     type: "TSNE",
    //     resp: {
    //       "tsne1": tsne1,
    //       "tsne2": tsne2,
    //       "iteration": self.init_tsne.iterations()
    //     },
    //     msg: `Success: TSNE done, ${self.filteredMatrix.nrow()}, ${self.filteredMatrix.ncol()}`
    //   });

    //   self.wasm.run_tsne(self.init_tsne, delay, iterations, tsne.ptr);
    // }, delay);

    // var sh_tsne = self.getVector("tsne") //new SharedArrayBuffer(this.filteredMatrix.ncol());
    // // sh_tsne.set(self.getVector("tsne"));

    // var tsne1 = new Float64Array(new SharedArrayBuffer(self.filteredMatrix.ncol() * 8)),
    //   tsne2 = new Float64Array(new SharedArrayBuffer(self.filteredMatrix.ncol() * 8));
    // for (var i = 0; i < sh_tsne.length; i++) {
    //   if (i % 2 == 0) {
    //     // tsne1.push(sh_tsne[i]);
    //     tsne1[parseInt(i / 2)] = sh_tsne[i];
    //   }
    //   else {
    //     // tsne2.push(sh_tsne[i]);
    //     // sample.push("sample");
    //     tsne2[Math.floor(i / 2)] = sh_tsne[i];
    //   }
    // }

    // var cluster_sab = new Uint32Array(new SharedArrayBuffer(self.filteredMatrix.ncol() * 8));
    // self.getVector("cluster_assignments").map((x, i) => cluster_sab[i] = x);

    // return {
    //   "tsne1": tsne1,
    //   "tsne2": tsne2,
    //   "clusters": cluster_sab,
    //   "iteration": self._lastIter
    // }
  }

  findSNNeighbors(k = 10) {
    var snn_neighbors = this.wasm.find_nearest_neighbors(this.nn_index, k);
    if (this.snn_neighbors !== undefined) {
      this.snn_neighbors.delete();
    }
    this.snn_neighbors = snn_neighbors;
    return;
  }

  buildSNNGraph(scheme = 0) {
    var snn_graph = this.wasm.build_snn_graph_from_neighbors(this.snn_neighbors, scheme);
    if (this.snn_graph !== undefined) {
      this.snn_graph.delete();
    }
    this.snn_graph = snn_graph;
    return;
  }

  clusterSNNGraph(res = 1) {
    var clustering = this.wasm.cluster_snn_graph(this.snn_graph, res);
    var arr_clust_raw = clustering.membership(clustering.best());
    var arr_clust = arr_clust_raw.slice();
    clustering.delete();

    this.createMemorySpace(
      arr_clust.length,
      "Int32Array",
      "cluster_assignments"
    );

    var cluster_vec = this.getVector("cluster_assignments");

    cluster_vec.set(arr_clust);

    return {
      "clusters": cluster_vec,
    }
  }

  markerGenes() {
    var self = this;
    var clus_assigns = this.getMemorySpace("cluster_assignments");

    var markers_output = this.wasm.score_markers(this.filteredMatrix,
      clus_assigns.ptr, false, 0);

    self.markerGenes = markers_output;

    // var cluster_vec = this.getVector("cluster_assignments");

    // var all_cohens = {};
    // for (var i=0; i < Math.max(...cluster_vec); i++) {
    //   var cohen = markers_output.cohen(i, 1).slice();

    //   all_cohens["CLUS_" + i] = self.findMaxIndices(cohen, 5);
    // }


    // var auc = markers_output.auc(0).slice();
    // var cohen = markers_output.cohen(0, 1).slice();
    // var detected = markers_output.detected(0, 0).slice();
    // var means = markers_output.means(0, 0).slice();

    // markers_output.delete();

    return {
      // "auc": auc,
      // "cohen": cohen
      // "detected": detected,
      // "means": means
    }
  }

  getClusterMarkers(cluster) {
    var self = this;

    // var auc = self.markerGenes.auc(cluster).slice();
    var cohen = self.markerGenes.cohen(cluster, 1).slice();
    var detected = self.markerGenes.detected(cluster, 0).slice();
    var means = self.markerGenes.means(cluster, 0).slice();

    return {
      // "auc": auc,
      "cohen": self.findMaxIndices(cohen, 5),
      // "detected": detected,
      // "means": means
    }
  }

  findMaxIndices(arr, max) {
    var top = [];
    for (var i = 0; i < arr.length; i++) {
      top.push(i);
      if (top.length > max) {
        top.sort(function (a, b) { return arr[b] - arr[a]; });
        top.pop();
      }
    }
    return top;
  }
}

// export default scran;
