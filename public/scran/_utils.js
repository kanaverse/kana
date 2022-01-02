const scran_utils = {};

/* Free a cached Wasm-constructed object. */
scran_utils.freeCache = function(object) {
  if (object !== undefined && object !== null) {
    object.delete();
  }
  return;
};

/* Compare two parameter sets. */
scran_utils.compareParameters = function(x, y) {
    return JSON.stringify(x) == JSON.stringify(y);
};

/* Calculate range of an array */
scran_utils.computeRange = (arr) => {
  var max = -Infinity, min = Infinity;
  arr.forEach(function (x) {
    if (max < x) {
      max = x;
    }
    if (min > x) {
      min = x;
    }
  });
  return [min, max];
}
