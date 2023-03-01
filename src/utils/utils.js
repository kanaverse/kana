import { randomColor } from "randomcolor";

export const getColors = (data) => {
  const palette = {
    1: ["#1b9e77"],
    2: ["#1b9e77", "#d95f02"],
    3: ["#1b9e77", "#d95f02", "#7570b3"],
    4: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a"],
    5: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e"],
    6: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02"],
    7: [
      "#1b9e77",
      "#d95f02",
      "#7570b3",
      "#e7298a",
      "#66a61e",
      "#e6ab02",
      "#a6761d",
    ],
    8: [
      "#1b9e77",
      "#d95f02",
      "#7570b3",
      "#e7298a",
      "#66a61e",
      "#e6ab02",
      "#a6761d",
      "#666666",
    ],
    9: [
      "#a6cee3",
      "#1f78b4",
      "#b2df8a",
      "#33a02c",
      "#fb9a99",
      "#e31a1c",
      "#fdbf6f",
      "#ff7f00",
      "#cab2d6",
    ],
    10: [
      "#a6cee3",
      "#1f78b4",
      "#b2df8a",
      "#33a02c",
      "#fb9a99",
      "#e31a1c",
      "#fdbf6f",
      "#ff7f00",
      "#cab2d6",
      "#6a3d9a",
    ],
    11: [
      "#a6cee3",
      "#1f78b4",
      "#b2df8a",
      "#33a02c",
      "#fb9a99",
      "#e31a1c",
      "#fdbf6f",
      "#ff7f00",
      "#cab2d6",
      "#6a3d9a",
      "#ffff99",
    ],
    12: [
      "#a6cee3",
      "#1f78b4",
      "#b2df8a",
      "#33a02c",
      "#fb9a99",
      "#e31a1c",
      "#fdbf6f",
      "#ff7f00",
      "#cab2d6",
      "#6a3d9a",
      "#ffff99",
      "#b15928",
    ],
  };

  let cluster_count = Math.max(...data) + 1;
  let cluster_colors = null;
  if (cluster_count > Object.keys(palette).length) {
    cluster_colors = randomColor({
      luminosity: "dark",
      count: cluster_count + 1,
    });
  } else {
    cluster_colors = palette[cluster_count.toString()];
  }

  return cluster_colors;
};

export function isObject(object) {
  return typeof object === "object" && Array.isArray(object) === false;
}

export const code = "K@𝜂a#$c3ll";

// this function is from https://developer.mozilla.org/en-US/docs/Glossary/Base64
export function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

export function generateUID(resource) {
  let base = `${resource.format}`;
  switch (resource.format) {
    case "SummarizedExperiment":
      base += `::${resource.rds.name}::${resource.rds.lastModified}::${resource.rds.size}`;
      return utf8_to_b64(base);
    case "MatrixMarket":
      for (let key of ["genes", "mtx", "annotations"]) {
        if (resource[key]) {
          base += `::${resource[key].name}::${resource[key].lastModified}::${resource[key].size}`;
        }
      }
      return utf8_to_b64(base);
    case "10X":
    case "H5AD":
      base += `::${resource.h5.name}::${resource.h5.lastModified}::${resource.h5.size}`;
      return utf8_to_b64(base);
    case "ExperimentHub":
      base += `::${resource.id}`;
      return utf8_to_b64(base);
    default:
      throw Error(`format: ${resource.format} does not exist`);
      break;
  }
}

export const MODALITIES = ["RNA", "ADT", "CRISPR"];

export const getMinMax = (arr) => {
  var max = -Number.MAX_VALUE,
    min = Number.MAX_VALUE;
  arr.forEach(function (x) {
    if (max < x) {
      max = x;
    }
    if (min > x) {
      min = x;
    }
  });
  return [min, max];
};

export const defaultColor = "#5F6B7C";