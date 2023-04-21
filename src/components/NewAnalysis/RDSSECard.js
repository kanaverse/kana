import { useState, useEffect } from "react";

import {
  Label,
  Text,
  HTMLSelect,
  ButtonGroup,
  Button,
  Divider,
  Callout,
  Collapse,
  FormGroup,
  EditableText,
} from "@blueprintjs/core";

import "./index.css";

import { MODALITIES } from "../../utils/utils";

import { reportFeatureTypes } from "./utils";

export function RDSSE({
  resource,
  index,
  preflight,
  inputOpts,
  setInputOpts,
  inputs,
  setInputs,
  ...props
}) {
  const [dsMeta, setDsMeta] = useState(null);
  const [options, setOptions] = useState({});
  const [collapse, setCollapse] = useState(true);
  const [init2, setInit2] = useState(true);

  // when preflight is available
  useEffect(() => {
    if (preflight && preflight !== null && preflight !== undefined) {
      setDsMeta(preflight);

      // set some defaults
      if (init2) {
        let tmpOptions = guessModalities(preflight);
        setOptions(tmpOptions);
        setInit2(false);
      }
    }
  }, [preflight]);

  // when options change
  useEffect(() => {
    if (options !== {}) {
      let tmpInputOpts = [...inputOpts];
      tmpInputOpts[index] = options;
      setInputOpts(tmpInputOpts);
    }
  }, [options]);

  useEffect(() => {
    let tmpOptions = { ...options };
    if (
      options !== {} &&
      "adtExperiment" in options &&
      options["adtExperiment"] !== "none" &&
      options["adtExperiment"] !== null &&
      options["adtExperiment"] !== undefined
    ) {
      tmpOptions["adtCountAssay"] =
        preflight.modality_assay_names[options?.["adtExperiment"]][0];

      if (
        preflight.modality_features[options?.["adtExperiment"]].rownames ===
        true
      ) {
        tmpOptions["primaryAdtFeatureIdColumn"] = "none";
      } else {
        tmpOptions["primaryAdtFeatureIdColumn"] = Object.keys(
          preflight.modality_features[options?.["adtExperiment"]].columns
        )[0];
      }
    } else {
      delete tmpOptions["adtCountAssay"];
      delete tmpOptions["primaryAdtFeatureIdColumn"];
    }
    setOptions(tmpOptions);
  }, [options?.["adtExperiment"]]);

  useEffect(() => {
    let tmpOptions = { ...options };
    if (
      options !== {} &&
      "crisprExperiment" in options &&
      options["crisprExperiment"] !== "none" &&
      options["crisprExperiment"] !== null &&
      options["crisprExperiment"] !== undefined
    ) {
      tmpOptions["crisprCountAssay"] =
        preflight.modality_assay_names[options?.["crisprExperiment"]][0];

      if (
        preflight.modality_features[options?.["crisprExperiment"]].rownames ===
        true
      ) {
        tmpOptions["primaryCrisprFeatureIdColumn"] = "none";
      } else {
        tmpOptions["primaryCrisprFeatureIdColumn"] = Object.keys(
          preflight.modality_features[options?.["crisprExperiment"]].columns
        )[0];
      }
    } else {
      delete tmpOptions["crisprCountAssay"];
      delete tmpOptions["primaryCrisprFeatureIdColumn"];
    }
    setOptions(tmpOptions);
  }, [options?.["crisprExperiment"]]);

  useEffect(() => {
    let tmpOptions = { ...options };
    if (
      options !== {} &&
      "rnaExperiment" in options &&
      options["rnaExperiment"] !== "none" &&
      options["rnaExperiment"] !== null &&
      options["rnaExperiment"] !== undefined
    ) {
      tmpOptions["rnaCountAssay"] =
        preflight.modality_assay_names[options?.["rnaExperiment"]][0];

      if (
        preflight.modality_features[options?.["rnaExperiment"]].rownames ===
        true
      ) {
        tmpOptions["primaryRnaFeatureIdColumn"] = "none";
      } else {
        tmpOptions["primaryRnaFeatureIdColumn"] = Object.keys(
          preflight.modality_features[options?.["rnaExperiment"]].columns
        )[0];
      }
    } else {
      delete tmpOptions["rnaCountAssay"];
      delete tmpOptions["primaryRnaFeatureIdColumn"];
    }
    setOptions(tmpOptions);
  }, [options?.["rnaExperiment"]]);

  useEffect(() => {
    setCollapse(props?.expand);
  }, [props?.expand]);

  const getAvailableModalities = (modality) => {
    return Object.keys(dsMeta.modality_features);
  };

  const getCamelCaseKey = (mod) => {
    return (
      mod.toLowerCase().charAt(0).toUpperCase() + mod.toLowerCase().slice(1)
    );
  };

  const getFTypeKey = (mod) => {
    return `${mod.toLowerCase()}Experiment`;
  };

  const resetModality = (mod, val) => {
    let tmpOptions = { ...options };

    const remaining_modalities = MODALITIES.filter((x) => x !== mod);

    for (const rm of remaining_modalities) {
      if (val === tmpOptions?.[getFTypeKey(rm)]) {
        tmpOptions[getFTypeKey(rm)] = null;
      }
    }

    return tmpOptions;
  };

  function guessModalities(preflight) {
    let tmpOptions = {
      rnaExperiment: null,
      adtExperiment: null,
      crisprExperiment: null,
    };
    for (const [k, v] of Object.entries(preflight.modality_features)) {
      if (k === "" || k.toLowerCase().indexOf("gene") > -1) {
        tmpOptions["rnaExperiment"] = k;
        tmpOptions["rnaCountAssay"] = preflight.modality_assay_names[k][0];
        if (v.rownames === true) {
          tmpOptions["primaryRnaFeatureIdColumn"] = "none";
        } else {
          tmpOptions["primaryRnaFeatureIdColumn"] = Object.keys(v.columns)[0];
        }
      } else if (
        k.toLowerCase().indexOf("antibody") > -1 ||
        k.toLowerCase().indexOf("adt") > -1
      ) {
        tmpOptions["adtExperiment"] = k;
        tmpOptions["adtCountAssay"] = preflight.modality_assay_names[k][0];

        if (v.rownames === true) {
          tmpOptions["primaryAdtFeatureIdColumn"] = "none";
        } else {
          tmpOptions["primaryAdtFeatureIdColumn"] = Object.keys(v.columns)[0];
        }
      } else if (k.toLowerCase().indexOf("crispr") > -1) {
        tmpOptions["crisprExperiment"] = k;
        tmpOptions["crisprCountAssay"] = preflight.modality_assay_names[k][0];

        if (v.rownames === true) {
          tmpOptions["primaryCrisprFeatureIdColumn"] = "none";
        } else {
          tmpOptions["primaryCrisprFeatureIdColumn"] = Object.keys(
            v.columns
          )[0];
        }
      }
    }
    return tmpOptions;
  }

  const handleRemove = () => {
    let tmpInputs = [...inputs];
    tmpInputs.splice(index, 1);
    setInputs(tmpInputs);

    let tmpInputOpts = [...inputOpts];
    tmpInputOpts.splice(index, 1);
    setInputOpts(tmpInputOpts);
  };

  return (
    <Callout className="section-input-item">
      <div className="section-input-item-header">
        <EditableText
          intent="primary"
          confirmOnEnterKey={true}
          defaultValue={resource.name}
          alwaysRenderInput={true}
        />
        <ButtonGroup minimal={true}>
          <Button
            icon={collapse ? "minimize" : "maximize"}
            minimal={true}
            onClick={() => {
              setCollapse(!collapse);
            }}
          />
          <Button icon="cross" minimal={true} onClick={handleRemove} />
        </ButtonGroup>
      </div>
      <div className={dsMeta ? "" : "bp4-skeleton"}>
        <p>
          This <strong>RDS</strong> dataset contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells and the following feature
          types: {dsMeta && reportFeatureTypes(dsMeta.modality_features)}
        </p>
        <Collapse isOpen={collapse}>
          <div>
            {dsMeta &&
              MODALITIES.map((mod, i) => {
                return (
                  <div key={options[getFTypeKey(mod)] + i}>
                    <Divider />
                    <Label className="row-input">
                      <Text>
                        <strong>{mod} modality</strong>
                      </Text>
                      <HTMLSelect
                        defaultValue={
                          options[getFTypeKey(mod)] !== null &&
                          options[getFTypeKey(mod)] !== undefined
                            ? options[getFTypeKey(mod)]
                            : "none"
                        }
                        onChange={(e) => {
                          if (
                            e.target.value !== undefined &&
                            e.target.value !== null
                          ) {
                            let tmpOptions = resetModality(
                              mod,
                              e.target.value === "none" ? null : e.target.value
                            );
                            if (e.target.value === "none") {
                              tmpOptions[getFTypeKey(mod)] = null;
                            } else {
                              tmpOptions[getFTypeKey(mod)] = e.target.value;
                            }
                            setOptions(tmpOptions);
                          }
                        }}
                      >
                        <option value="none">--- no selection ---</option>
                        {getAvailableModalities(mod).map((x, i) => (
                          <option key={i} value={x}>
                            {x === "" ? "unnamed" : x}
                          </option>
                        ))}
                      </HTMLSelect>
                    </Label>
                    <FormGroup
                      disabled={
                        options?.[getFTypeKey(mod)] === undefined ||
                        options?.[getFTypeKey(mod)] === null ||
                        options?.[getFTypeKey(mod)] === "none"
                      }
                    >
                      <Label className="row-input">
                        <Text>
                          <strong>{mod} count assay</strong>
                        </Text>
                        <HTMLSelect
                          defaultValue={
                            options?.[getFTypeKey(mod)]
                              ? dsMeta.modality_assay_names[
                                  options?.[getFTypeKey(mod)]
                                ][0]
                              : null
                          }
                          onChange={(e) => {
                            if (
                              e.target.value !== undefined &&
                              e.target.value !== null
                            ) {
                              let tmpOptions = { ...options };
                              if (e.target.value === "none") {
                                tmpOptions[`${mod.toLowerCase()}CountAssay`] =
                                  null;
                              } else {
                                tmpOptions[`${mod.toLowerCase()}CountAssay`] =
                                  e.target.value;
                              }
                              setOptions(tmpOptions);
                            }
                          }}
                        >
                          {dsMeta.modality_assay_names[
                            options?.[getFTypeKey(mod)]
                          ] &&
                            dsMeta.modality_assay_names[
                              options[getFTypeKey(mod)]
                            ].map((x, i) => (
                              <option key={i} value={x}>
                                {x}
                              </option>
                            ))}
                        </HTMLSelect>
                      </Label>
                    </FormGroup>
                    <FormGroup
                      disabled={
                        options?.[getFTypeKey(mod)] === undefined ||
                        options?.[getFTypeKey(mod)] === null ||
                        options?.[getFTypeKey(mod)] === "none"
                      }
                    >
                      <Label className="row-input">
                        <Text>
                          <strong>{mod} primary feature ID</strong>
                        </Text>
                        <HTMLSelect
                          disabled={
                            options?.[getFTypeKey(mod)] === undefined ||
                            options?.[getFTypeKey(mod)] === null ||
                            options?.[getFTypeKey(mod)] === "none"
                          }
                          defaultValue={
                            options[
                              `primary${
                                mod.toLowerCase().charAt(0).toUpperCase() +
                                mod.toLowerCase().slice(1)
                              }FeatureIdColumn`
                            ]
                          }
                          onChange={(e) => {
                            if (e.target.value) {
                              let tmpOptions = { ...options };
                              if (e.target.value === "none") {
                                tmpOptions[
                                  `primary${
                                    mod.toLowerCase().charAt(0).toUpperCase() +
                                    mod.toLowerCase().slice(1)
                                  }FeatureIdColumn`
                                ] = null;
                              } else {
                                tmpOptions[
                                  `primary${
                                    mod.toLowerCase().charAt(0).toUpperCase() +
                                    mod.toLowerCase().slice(1)
                                  }FeatureIdColumn`
                                ] = e.target.value;
                              }
                              setOptions(tmpOptions);
                            }
                          }}
                        >
                          {dsMeta.modality_features[options?.[getFTypeKey(mod)]]
                            ?.rownames === true && (
                            <option value="none">rownames</option>
                          )}

                          {dsMeta.modality_features[
                            options?.[getFTypeKey(mod)]
                          ]?.["columns"] &&
                            Object.keys(
                              dsMeta.modality_features[
                                options[getFTypeKey(mod)]
                              ]["columns"]
                            ).map((x, i) => (
                              <option key={i} value={x}>
                                {x}
                              </option>
                            ))}
                        </HTMLSelect>
                      </Label>
                    </FormGroup>
                  </div>
                );
              })}
          </div>
        </Collapse>
      </div>
    </Callout>
  );
}
