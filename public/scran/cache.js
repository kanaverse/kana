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
