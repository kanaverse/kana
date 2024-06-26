import { Code } from "@blueprintjs/core";

export function guessModalities(preflight) {
  let tmpOptions = {
    featureTypeRnaName: null,
    featureTypeAdtName: null,
    featureTypeCrisprName: null,
  };
  for (const [k, v] of Object.entries(preflight.modality_features)) {
    if (k.toLowerCase() === "" || k.toLowerCase().indexOf("gene") > -1) {
      tmpOptions["featureTypeRnaName"] = k;
      // tmpOptions["primaryRnaFeatureIdColumn"] = Object.keys(v.columns)[0];
    } else if (
      k.toLowerCase().indexOf("antibody") > -1 ||
      k.toLowerCase().indexOf("adt") > -1
    ) {
      tmpOptions["featureTypeAdtName"] = k;
      // tmpOptions["primaryAdtFeatureIdColumn"] = Object.keys(v.columns)[0];
    } else if (k.toLowerCase().indexOf("crispr") > -1) {
      tmpOptions["featureTypeCrisprName"] = k;
      // tmpOptions["primaryCrisprFeatureIdColumn"] = Object.keys(v.columns)[0];
    }
  }

  return tmpOptions;
}

export function reportFeatureTypes(modality_features) {
  return Object.entries(modality_features).map((x, i) => (
    <>
      {i > 0 ? ", " : ""}
      {x[0] === "" ? (
        <Code>
          <em>unnamed</em>
        </Code>
      ) : (
        <Code>{x[0]}</Code>
      )}{" "}
      ({x[1].numberOfFeatures} features)
    </>
  ));
}

export function getDefaultFeature(obj) {
  if (obj.rownames === true) {
    return null;
  }

  return Object.keys(obj.columns)[0];
}

export function getDefaultAssayName(assaynames) {
  let _defname = assaynames[0];
  for (let _aname of assaynames) {
    if (_aname.toLowerCase() == "counts") {
      _defname = _aname;
    }
  }

  return _defname;
}
