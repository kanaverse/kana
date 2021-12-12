function createInitCache(cache) {
  function initCache(key) {
    if (! (key in cached)) {
      cached[key] = {};
    }
    return cached[key];
  }
  return initCache;
}

function freeCache(cache, key) {
  if (cache[key] !== undefined && cache[key] !== null) {
    cache[key].delete();
    cache[key] = null;
  }
  return;
}

function createCheckParams(parameters) {
  function checkParams(step, latest, upstream, body) {
    var previous = parameters[step];
    var changed = true;
  
    if (!upstream) {
      if (previous !== undefined) {
        if (JSON.stringify(previous) == JSON.stringify(latest)) {
          changed = false;
        }
      }
    }
  
    if (!changed) {
      return null;
    } else {
      var output = body();
      output["$step"] = step;
      parameters[step] = latest;
      return output;
    }
  }

  return checkParams;
}

function processStep(body, args, upstream) {
  var t0 = performance.now();

  var output = null;
  try {
    var output = body(args, upstream);
  } catch (error) {
    console.log(error);
    throw error;
  }

  if (output !== null) {
    var t1 = performance.now();
    var ftime = (t1 - t0) / 1000;
    postMessage({
        type: `${output["$step"]}_DONE`,
        resp: `~${ftime.toFixed(2)} sec`,
        msg: 'Done'
    });
  }

  return output;
}

function allocateBuffer(wasm, size, type, cache) {
  var reallocate = true;
  if ("buffer" in cache) {
    if (cache.buffer.size != size) {
      cache.buffer.free();
    } else {
      reallocate = false;
    }
  }

  if (reallocate) {
    cache.buffer = new WasmBuffer(wasm, size, type);
  }
  return cache.buffer;
}
