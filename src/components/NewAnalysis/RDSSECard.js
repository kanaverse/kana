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

import {
  getDefaultFeature,
  reportFeatureTypes,
  getDefaultAssayName,
  guessModalitiesFromExperiments,
} from "./utils";

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
        let tmpOptions = guessModalitiesFromExperiments(preflight);
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
      tmpOptions["adtCountAssay"] = getDefaultAssayName(
        preflight.modality_assay_names[options?.["adtExperiment"]]
      );

      tmpOptions["primaryAdtFeatureIdColumn"] = getDefaultFeature(
        preflight.modality_features[options?.["adtExperiment"]]
      );
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
      tmpOptions["crisprCountAssay"] = getDefaultAssayName(
        preflight.modality_assay_names[options?.["crisprExperiment"]]
      );

      tmpOptions["primaryCrisprFeatureIdColumn"] = getDefaultFeature(
        preflight.modality_features[options?.["crisprExperiment"]]
      );
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
      tmpOptions["rnaCountAssay"] = getDefaultAssayName(
        preflight.modality_assay_names[options?.["rnaExperiment"]]
      );

      tmpOptions["primaryRnaFeatureIdColumn"] = getDefaultFeature(
        preflight.modality_features[options?.["rnaExperiment"]]
      );
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

  const getFTypeKey = (mod) => {
    return `${mod.toLowerCase()}Experiment`;
  };

  const getAssayNameKey = (mod) => {
    return `${mod.toLowerCase()}CountAssay`;
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
                          onChange={(e) => {
                            if (
                              e.target.value !== undefined &&
                              e.target.value !== null
                            ) {
                              let tmpOptions = { ...options };
                              if (e.target.value === "none") {
                                tmpOptions[getAssayNameKey(mod)] = null;
                              } else {
                                tmpOptions[getAssayNameKey(mod)] =
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
                              <option
                                key={i}
                                value={x}
                                selected={x === options?.[getAssayNameKey(mod)]}
                              >
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
