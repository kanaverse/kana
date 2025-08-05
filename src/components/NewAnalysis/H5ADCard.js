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
import { getDefaultFeature, getDefaultAssayName } from "./utils";

export function H5AD({
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
        let tmpOptions = {
          featureTypeRnaName: null,
          featureTypeAdtName: null,
          featureTypeCrisprName: null,
        };

        tmpOptions["primaryRnaFeatureIdColumn"] = getDefaultFeature(
          preflight.all_features
        );

        // Default assignment to
        tmpOptions["countMatrixName"] = getDefaultAssayName(
          preflight.all_assay_names
        );

        setOptions(tmpOptions);
        setInit2(false);
      }
    }
  }, [preflight]);

  // when options change
  useEffect(() => {
    if (options !== null && options !== undefined && options !== {}) {
      let tmpInputOpts = [...inputOpts];
      tmpInputOpts[index] = options;
      setInputOpts(tmpInputOpts);
    }
  }, [options]);

  useEffect(() => {
    setCollapse(props?.expand);
  }, [props?.expand]);

  useEffect(() => {
    if (
      dsMeta &&
      options?.["featureTypeColumnName"] !== null &&
      options?.["featureTypeColumnName"] !== "none"
    ) {
      let vals =
        dsMeta.all_features.columns[options["featureTypeColumnName"]].values;
      let tmpInputOpts = [...inputOpts];
      if (vals.length === 1) {
        tmpInputOpts["featureTypeRnaName"] = vals[0];
        tmpInputOpts["primaryRnaFeatureIdColumn"] = Object.keys(
          dsMeta.all_features.columns
        )[0];
      } else {
        for (const k of vals) {
          if (k.toLowerCase().indexOf("gene") > -1) {
            tmpInputOpts["featureTypeRnaName"] = k;
            tmpInputOpts["primaryRnaFeatureIdColumn"] = Object.keys(
              dsMeta.all_features.columns
            )[0];
          } else if (
            k.toLowerCase().indexOf("antibody") > -1 ||
            k.toLowerCase().indexOf("adt") > -1
          ) {
            tmpInputOpts["featureTypeAdtName"] = k;
            tmpInputOpts["primaryAdtFeatureIdColumn"] = Object.keys(
              dsMeta.all_features.columns
            )[0];
          } else if (k.toLowerCase().indexOf("crispr") > -1) {
            tmpInputOpts["featureTypeCrisprName"] = k;
            tmpInputOpts["primaryCrisprFeatureIdColumn"] = Object.keys(
              dsMeta.all_features.columns
            )[0];
          }
        }
      }
      setInputOpts(tmpInputOpts);
    }
  }, [options?.["featureTypeColumnName"]]);

  const getCamelCaseKey = (mod) => {
    return (
      mod.toLowerCase().charAt(0).toUpperCase() + mod.toLowerCase().slice(1)
    );
  };

  const getFTypeKey = (mod) => {
    return `featureType${getCamelCaseKey(mod)}Name`;
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

  const getAvailableModalities = (modality) => {
    return dsMeta.all_features.columns[options["featureTypeColumnName"]].values;
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
          This <strong>{resource.format}</strong> dataset contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells and{" "}
          {dsMeta && dsMeta.all_features.numberOfFeatures} features.
        </p>
        <Divider />
        <Collapse isOpen={collapse}>
          <div>
            {dsMeta && (
              <Label className="row-input">
                <Text>
                  <strong>Primary count matrix name</strong>
                </Text>
                <HTMLSelect
                  defaultValue={dsMeta.all_assay_names[0]}
                  onChange={(e) => {
                    let tmpOptions = { ...options };
                    tmpOptions["countMatrixName"] = e.target.value;
                    setOptions(tmpOptions);
                  }}
                >
                  {dsMeta.all_assay_names.map((x, i) => (
                    <option key={i} value={x}>
                      {x}
                    </option>
                  ))}
                </HTMLSelect>
              </Label>
            )}
            {dsMeta && (
              <>
                <Label className="row-input">
                  <Text>
                    <strong>Feature type column</strong>
                  </Text>
                  <HTMLSelect
                    defaultValue="none"
                    onChange={(e) => {
                      let tmpOptions = { ...options };
                      let val = e.target.value;
                      if (val === "none") {
                        val = null;
                      }
                      tmpOptions["featureTypeColumnName"] = val;
                      setOptions(tmpOptions);
                    }}
                  >
                    <option key="none" value="none">
                      --- no selection ---
                    </option>
                    {Object.keys(dsMeta.all_features.columns).map((x, i) => (
                      <option key={i} value={x}>
                        {x}
                      </option>
                    ))}
                  </HTMLSelect>
                </Label>
                {(options["featureTypeColumnName"] === null ||
                  options["featureTypeColumnName"] === undefined ||
                  options["featureTypeColumnName"] === "none") && (
                  <Label className="row-input">
                    <Divider />
                    <FormGroup>
                      <Label className="row-input">
                        <Text>
                          <strong>RNA primary feature ID</strong>{" "}
                          <small>
                            (when no feature type is provided, we assume that
                            only RNA data is present)
                          </small>
                        </Text>
                        <HTMLSelect
                          defaultValue={options["primaryRnaFeatureIdColumn"]}
                          onChange={(e) => {
                            if (
                              e.target.value !== undefined &&
                              e.target.value !== null
                            ) {
                              let tmpOptions = { ...options };
                              if (e.target.value === "none") {
                                tmpOptions[`primaryRnaFeatureIdColumn`] = null;
                              } else {
                                tmpOptions[`primaryRnaFeatureIdColumn`] =
                                  e.target.value;
                              }
                              setOptions(tmpOptions);
                            }
                          }}
                        >
                          {dsMeta.all_features.rownames === true && (
                            <option value="none">rownames</option>
                          )}
                          {dsMeta.all_features &&
                            Object.keys(dsMeta.all_features["columns"]).map(
                              (x, i) => (
                                <option key={i} value={x}>
                                  {x}
                                </option>
                              )
                            )}
                        </HTMLSelect>
                      </Label>
                    </FormGroup>
                  </Label>
                )}
                {options["featureTypeColumnName"] &&
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
                                  e.target.value === "none"
                                    ? null
                                    : e.target.value
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
                                {x === "" ? <em>unnamed</em> : x}
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
                              <strong>{mod} primary feature ID</strong>
                            </Text>
                            <HTMLSelect
                              disabled={
                                options?.[getFTypeKey(mod)] === undefined ||
                                options?.[getFTypeKey(mod)] === null ||
                                options?.[getFTypeKey(mod)] === "none"
                              }
                              defaultValue="none"
                              onChange={(e) => {
                                if (e.target.value) {
                                  let tmpOptions = { ...options };
                                  if (e.target.value === "none") {
                                    tmpOptions[
                                      `primary${getCamelCaseKey(
                                        mod
                                      )}FeatureIdColumn`
                                    ] = null;
                                  } else {
                                    tmpOptions[
                                      `primary${getCamelCaseKey(
                                        mod
                                      )}FeatureIdColumn`
                                    ] = e.target.value;
                                  }
                                  setOptions(tmpOptions);
                                }
                              }}
                            >
                              {dsMeta.all_features.rownames === true && (
                                <option value="none">rownames</option>
                              )}
                              {dsMeta.all_features &&
                                Object.keys(dsMeta.all_features["columns"]).map(
                                  (x, i) => (
                                    <option key={i} value={x}>
                                      {x}
                                    </option>
                                  )
                                )}
                            </HTMLSelect>
                          </Label>
                        </FormGroup>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </Collapse>
      </div>
    </Callout>
  );
}
