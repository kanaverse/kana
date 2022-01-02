importScripts("./_utils.js");
importScripts("./_normalization.js");
importScripts("./_choose_clustering.js");

const scran_score_markers = {};

(function(x) {
  /** Private members **/
  var cache = {};
  var parameters = {};

  /** Public members **/
  x.changed = false;

  /** Public functions (standard) **/
  x.compute = function(wasm, args) {
    if (!scran_normalization.changed && !scran_choose_clustering.changed && !scran_utils.changedParameters(parameters, args)) {
      x.changed = false;
    } else {
      scran_utils.freeCache(cache.raw);

      var mat = scran_normalization.fetchNormalizedMatrix(wasm);
      var cluster_offset = scran_choose_clustering.fetchClustersOFFSET(wasm);
      cache.raw = wasm.score_markers(mat, cluster_offset, false, 0);

      parameters = args;
      delete cache.reloaded;
      x.changed = true;
    }
    return;
  };

  x.results = function(wasm) {
    return {};
  };

  x.serialize = function(wasm) {
    var contents;
    if ("reloaded" in cache) {
      contents = cache.reloaded;

    } else {
      var contents = [];
      var num = cache.raw.num_groups(); /** TODO: get the number of groups. **/
      for (var i = 0; i < num; i++) {
        contents.push({
          "means": cache.raw.means(i, 0).slice(),
          "detected": cache.raw.detected(i, 0).slice(),
          "lfc": {
            "min": cache.raw.lfc(i, 0).slice(),
            "mean": cache.raw.lfc(i, 1).slice(),
            "min-rank": cache.raw.lfc(i, 4).slice()
          },
          "delta_detected": {
            "min": cache.raw.delta_detected(i, 0).slice(),
            "mean": cache.raw.delta_detected(i, 1).slice(),
            "min-rank": cache.raw.delta_detected(i, 4).slice()
          },
          "cohen": {
            "min": cache.raw.cohen(i, 0).slice(),
            "mean": cache.raw.cohen(i, 1).slice(),
            "min-rank": cache.raw.cohen(i, 4).slice()
          },
          "auc": {
            "min": cache.raw.auc(i, 0).slice(),
            "mean": cache.raw.auc(i, 1).slice(),
            "min-rank": cache.raw.auc(i, 4).slice()
          }
        });
      }
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
  x.fetchRankingUNSAFE = function(wasm, group, rank_type) {
    if ("reloaded" in cache) {
      var summary = "mean";
      if (rank_type.match(/-min$/)) {
          summary = "min";
      } else if (rank_type.match(/-min-rank$/)) {
          summary = "min-rank";
      }

      var effect;
      if (rank_type.match(/^cohen-/)) {
        effect = "cohen";
      } else if (rank_type.match(/^auc-/)) {
        effect = "auc";
      } else if (rank_type.match(/^lfc-/)) {
        effect = "lfc";
      } else if (rank_type.match(/^delta-d-/)) {
        effect = "delta_detected";
      } else {
        throw "unknown rank type '" + rank_type + "'";
      }

      return cache.reloaded[group][effect][summary];
    } else {
      var index = 1;
      if (rank_type.match(/-min$/)) {
          index = 0;
      } else if (rank_type.match(/-min-rank$/)) {
          increasing = true;
          index = 4;
      }
  
      if (rank_type.match(/^cohen-/)) {
        return results.cohen(group, index);
      } else if (rank_type.match(/^auc-/)) {
        return results.auc(group, index);
      } else if (rank_type.match(/^lfc-/)) {
        return results.lfc(group, index);
      } else if (rank_type.match(/^delta-d-/)) {
        return results.delta_detected(group, index);
      } else {
        throw "unknown rank type '" + rank_type + "'";
      }
    }
  };

  x.fetchResultsUNSAFE = function(wasm, group, rank) {
    if ("reloaded" in cache) {
      var current = cache.reloaded[group];
      return {
        "means": current.means,
        "detected": current.detected,
        "lfc": current.lfc["mean"],
        "delta_detected": current.delta_detected["mean"]
      };
    } else {
      return {
        "means": results.means(group, 0),
        "detected": results.detected(cluster, 0),
        "lfc": results.lfc(cluster, 1),
        "delta_detected": results.delta_detected(cluster, 1)
      }
    }
  };
})(scran_score_markers);
