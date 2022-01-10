import * as scran_utils from "./_utils.js";
import * as scran_utils_viz_parent from "./_utils_viz_parent.js";

var cache = { "counter": 0, "promises": {} };
var parameters = {};
var worker = null;

export var changed = false;

function core(wasm, args, reneighbor) {
  if (worker == null) {
    worker = scran_utils_viz_parent.createWorker("./tsneWorker.js", cache);
    cache.initialized = scran_utils_viz_parent.initializeWorker(worker, cache);
  }

  var nn_out = null;
  if (reneighbor()) {
    var k = wasm.perplexity_to_k(args.perplexity);
    nn_out = scran_utils_viz_parent.computeNeighbors(wasm, k);
  }

  cache.run = cache.initialized.then(x => scran_utils_viz_parent.runWithNeighbors(worker, args, nn_out, cache));
  return;
}

export function compute(wasm, args) {
  if (!scran_neighbor_index.changed && !scran_utils.changedParameters(parameters, args)) {
    changed = false;
    return;
  }

  core(wasm, args, () => {
    return scran_neighbor_index.changed || scran_utils.changedParameters(parameters.perplexity, args.perplexity);
  });

  parameters = args;
  delete cache.reloaded;
  changed = true;
}

export function results(wasm) {
  return scran_utils_viz_parent.retrieveCoordinates(worker, cache);
}

export function serialize(wasm) {
  return scran_utils_viz_parent.retrieveCoordinates(worker, cache)
  .then(contents => {
    return {
      "parameters": parameters,
      "contents": contents
    };
  });
}

export function unserialize(wasm, saved) {
  parameters = saved.parameters;
  cache.reloaded = saved.contents;
  return;
}

export function animate(wasm) {
  if ("reloaded" in cache) {
    var param_copy = { ...parameters };
    param_copy.animate = true;
    core(wasm, param_copy, ()=>true);
    delete cache.reloaded;

    // Mimicking the response from the re-run.
    return cache.run.then(contents => { 
      return {
        "type": "tsne_rerun",
        "data": { "status": "SUCCESS" }
      };
    });
  } else {
    return scran_utils_viz_parent.sendTask(worker, { "cmd": "RERUN" }, cache);
  }
}
