import * as scran_inputs from "./_inputs.js";
import * as scran_utils from "./_utils.js";
import WasmBuffer from "./WasmBuffer.js";
import * as mito from "./mito.js";

var cache = {};
var parameters = {};

export var changed = false;

function rawCompute(wasm, args) {
  scran_utils.freeCache(cache.raw);
  var mat = scran_inputs.fetchCountMatrix();

  // TODO: add more choices.
  var nsubsets = 1;
  var subsets = new WasmBuffer(wasm, mat.nrow() * nsubsets, "Uint8Array");
  try {
    subsets.fill(0);

    var gene_info = scran_inputs.fetchGenes();
    var sub_arr = subsets.array();
    for (const [key, val] of Object.entries(gene_info)) {
      if (args.use_mito_default) {
        val.forEach((x, i) => {
          if (mito.symbol.has(x) || mito.ensembl.has(x)) {
            sub_arr[i] = 1;
          }
        });
      } else {
        var lower_mito = args.mito_prefix.toLowerCase();
        val.forEach((x, i) => {
          if(x.toLowerCase().startsWith(lower_mito)) {
            sub_arr[i] = 1;
          }
        });
      }
    }

    cache.raw = wasm.per_cell_qc_metrics(mat, nsubsets, subsets.ptr);
  } finally {
    subsets.free();
  }

  delete cache.reloaded;
  return;
}

function fetchResults() {
  var data = {};
  if ("reloaded" in cache) {
    var qc_output = cache.reloaded;
    data.sums = qc_output.sums.slice();
    data.detected = qc_output.detected.slice();
    data.proportion = qc_output.proportion.slice();
  } else {
    var qc_output = cache.raw;
    data.sums = qc_output.sums().slice();
    data.detected = qc_output.detected().slice();
    data.proportion = qc_output.subset_proportions(0).slice();
  }
  return data;
}

export function compute(wasm, args) {
  if (!scran_inputs.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
  } else {
    rawCompute(wasm, args);
    parameters = args;
    changed = true;
  }
  return;
}

export function results(wasm) {
  var data = fetchResults();

  var ranges = {};
  ranges.sums = scran_utils.computeRange(data.sums);
  ranges.detected = scran_utils.computeRange(data.detected);
  ranges.proportion = scran_utils.computeRange(data.proportion);

  return { "data": data, "ranges": ranges };
}

export function serialize(wasm) {
  return {
    "parameters": parameters,
    "contents": fetchResults()
  };
};

export function unserialize(wasm, saved) {
  parameters = saved.parameters;
  cache.reloaded = saved.contents;
  return;
}

/** Public functions (custom) **/
export function fetchQCMetrics(wasm) {
  if ("reloaded" in cache) {
    rawCompute(wasm);
  }
  return cache.raw;
}

export function fetchSumsUNSAFE(wasm) {
  if ("reloaded" in cache) {
    return cache.reloaded.sums;
  } else {
    // Unsafe, because we're returning a raw view into the Wasm heap,
    // which might be invalidated upon further allocations.
    return cache.raw.sums();
  }
}
