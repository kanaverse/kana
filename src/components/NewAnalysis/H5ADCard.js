import { useState, useCallback, useContext, useEffect } from "react";

import {
  Tabs,
  Tab,
  Classes,
  Drawer,
  Label,
  Text,
  HTMLSelect,
  ButtonGroup,
  FileInput,
  Icon,
  Card,
  Elevation,
  Button,
  Divider,
  Callout,
  Code,
  H2,
  Collapse,
  Tag,
  OverflowList,
  H5,
  H6,
  FormGroup,
  InputGroup,
  EditableText,
} from "@blueprintjs/core";

import "./index.css";

import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";

import { MODALITIES } from "../../utils/utils";

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
        let tmpOptions = {};
        tmpOptions["countMatrixName"] = preflight.all_assay_names[0];
        setOptions(tmpOptions);
        setInit2(false);
      }
    }
  }, [preflight]);

  // when options change
  useEffect(() => {
    if (options != {}) {
      let tmpInputOpts = [...inputOpts];
      tmpInputOpts[index] = options;
      setInputOpts(tmpInputOpts);
    }
  }, [options]);

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

  const getAvailableModalities = (modality) => {
    let curr_mod_sel =
      options?.[
        `featureType${
          modality.toLowerCase().charAt(0).toUpperCase() +
          modality.toLowerCase().slice(1)
        }Name`
      ];

    let remaining_modalities = MODALITIES.filter((x) => x !== modality).map(
      (x) =>
        options?.[
          `featureType${
            x.toLowerCase().charAt(0).toUpperCase() + x.toLowerCase().slice(1)
          }Name`
        ]
    );

    let list = [
      curr_mod_sel,
      ...dsMeta.all_features.columns[
        options["featureTypeColumnName"]
      ].values.filter((x) => x !== curr_mod_sel),
    ].filter((x) => !remaining_modalities.includes(x));

    return list.filter((x) => !!x);
  };

  const handleRemove = () => {
    let tmpInputs = [...inputs];
    tmpInputs.splice(index, 1);
    setInputs(tmpInputs);
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
                  <span>Primary count matrix name</span>
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
                    <span>Feature type column</span>
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
                      none
                    </option>
                    {Object.keys(dsMeta.all_features.columns).map((x, i) => (
                      <option key={i} value={x}>
                        {x}
                      </option>
                    ))}
                  </HTMLSelect>
                </Label>
                {options["featureTypeColumnName"] &&
                  MODALITIES.map((mod, i) => {
                    return (
                      <div key={i}>
                        <Label className="row-input">
                          <Text>
                            <strong>{mod} modality</strong>
                          </Text>
                          <HTMLSelect
                            defaultValue={
                              options[
                                `featureType${
                                  mod.toLowerCase().charAt(0).toUpperCase() +
                                  mod.toLowerCase().slice(1)
                                }Name`
                              ] !== null
                                ? options[
                                    `featureType${
                                      mod
                                        .toLowerCase()
                                        .charAt(0)
                                        .toUpperCase() +
                                      mod.toLowerCase().slice(1)
                                    }Name`
                                  ]
                                : "none"
                            }
                            onChange={(e) => {
                              if (e.target.value) {
                                let tmpOptions = { ...options };
                                if (e.target.value === "none") {
                                  tmpOptions[
                                    `featureType${
                                      mod
                                        .toLowerCase()
                                        .charAt(0)
                                        .toUpperCase() +
                                      mod.toLowerCase().slice(1)
                                    }Name`
                                  ] = null;
                                } else {
                                  tmpOptions[
                                    `featureType${
                                      mod
                                        .toLowerCase()
                                        .charAt(0)
                                        .toUpperCase() +
                                      mod.toLowerCase().slice(1)
                                    }Name`
                                  ] = e.target.value;
                                }
                                setOptions(tmpOptions);
                              }
                            }}
                          >
                            <option value="none">None</option>
                            {getAvailableModalities(mod).map((x, i) => (
                              <option key={i} value={x}>
                                {x === "" ? <em>unnamed</em> : x}
                              </option>
                            ))}
                          </HTMLSelect>
                        </Label>
                        <FormGroup
                          disabled={
                            options?.[
                              `featureType${
                                mod.toLowerCase().charAt(0).toUpperCase() +
                                mod.toLowerCase().slice(1)
                              }Name`
                            ] === undefined ||
                            options?.[
                              `featureType${
                                mod.toLowerCase().charAt(0).toUpperCase() +
                                mod.toLowerCase().slice(1)
                              }Name`
                            ] === null ||
                            options?.[
                              `featureType${
                                mod.toLowerCase().charAt(0).toUpperCase() +
                                mod.toLowerCase().slice(1)
                              }Name`
                            ] === "none"
                          }
                        >
                          <Label className="row-input">
                            <Text>
                              <strong>{mod} primary feature ID</strong>
                            </Text>
                            <HTMLSelect
                              defaultValue="none"
                              onChange={(e) => {
                                if (e.target.value) {
                                  let tmpOptions = { ...options };
                                  if (e.target.value === "none") {
                                    tmpOptions[
                                      `primary${
                                        mod
                                          .toLowerCase()
                                          .charAt(0)
                                          .toUpperCase() +
                                        mod.toLowerCase().slice(1)
                                      }FeatureIdColumn`
                                    ] = null;
                                  } else {
                                    tmpOptions[
                                      `primary${
                                        mod
                                          .toLowerCase()
                                          .charAt(0)
                                          .toUpperCase() +
                                        mod.toLowerCase().slice(1)
                                      }FeatureIdColumn`
                                    ] = e.target.value;
                                  }
                                  setOptions(tmpOptions);
                                }
                              }}
                            >
                              <option value="none">rownames</option>
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
                        <Divider />
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
