export function guessModalities(preflight) {
  let tmpOptions = {};
  for (const [k, v] of Object.entries(preflight.modality_features)) {
    if (k.toLowerCase().indexOf("gene") > -1) {
      tmpOptions["featureTypeRnaName"] = k;
      tmpOptions["primaryRnaFeatureIdColumn"] = Object.keys(v.columns)[0];
    } else if (
      k.toLowerCase().indexOf("antibody") > -1 ||
      k.toLowerCase().indexOf("adt") > -1
    ) {
      tmpOptions["featureTypeAdtName"] = k;
      tmpOptions["primaryAdtFeatureIdColumn"] = Object.keys(v.columns)[0];
    } else if (k.toLowerCase().indexOf("crispr") > -1) {
      tmpOptions["featureTypeCrisprName"] = k;
      tmpOptions["primaryCrisprFeatureIdColumn"] = Object.keys(v.columns)[0];
    }
  }

  return tmpOptions;
}
