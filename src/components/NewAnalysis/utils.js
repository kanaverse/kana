import { Code } from "@blueprintjs/core";

export function guessModalitiesFromFeatureTypes(preflight) {
  let tmpOptions = {
    featureTypeRnaName: null,
    featureTypeAdtName: null,
    featureTypeCrisprName: null,
  };
  for (const [k, v] of Object.entries(preflight.modality_features)) {
    if (k.toLowerCase() === "" || k.toLowerCase().indexOf("gene") > -1) {
      tmpOptions["featureTypeRnaName"] = k;
      tmpOptions["primaryRnaFeatureIdColumn"] = getDefaultFeature(v);
    } else if (
      k.toLowerCase().indexOf("antibody") > -1 ||
      k.toLowerCase().indexOf("adt") > -1
    ) {
      tmpOptions["featureTypeAdtName"] = k;
      tmpOptions["primaryAdtFeatureIdColumn"] = getDefaultFeature(v);
    } else if (k.toLowerCase().indexOf("crispr") > -1) {
      tmpOptions["featureTypeCrisprName"] = k;
      tmpOptions["primaryCrisprFeatureIdColumn"] = getDefaultFeature(v);
    }
  }

  return tmpOptions;
}

export function guessModalitiesFromExperiments(preflight) {
  let tmpOptions = {
    rnaExperiment: null,
    adtExperiment: null,
    crisprExperiment: null,
  };
  for (const [k, v] of Object.entries(preflight.modality_features)) {
    if (k === "" || k.toLowerCase().indexOf("gene") > -1) {
      tmpOptions["rnaExperiment"] = k;
      tmpOptions["rnaCountAssay"] = getDefaultAssayName(
        preflight.modality_assay_names[k]
      );

      tmpOptions["primaryRnaFeatureIdColumn"] = getDefaultFeature(v);
    } else if (
      k.toLowerCase().indexOf("antibody") > -1 ||
      k.toLowerCase().indexOf("adt") > -1
    ) {
      tmpOptions["adtExperiment"] = k;
      tmpOptions["adtCountAssay"] = getDefaultAssayName(
        preflight.modality_assay_names[k]
      );
      tmpOptions["primaryAdtFeatureIdColumn"] = getDefaultFeature(v);
    } else if (k.toLowerCase().indexOf("crispr") > -1) {
      tmpOptions["crisprExperiment"] = k;
      tmpOptions["crisprCountAssay"] = getDefaultAssayName(
        preflight.modality_assay_names[k]
      );
      tmpOptions["primaryCrisprFeatureIdColumn"] = getDefaultFeature(v);
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
    if (_aname.toLowerCase() === "counts") {
      _defname = _aname;
    }
  }

  return _defname;
}

export function getCamelCaseKey(mod) {
  return mod.toLowerCase().charAt(0).toUpperCase() + mod.toLowerCase().slice(1);
}
