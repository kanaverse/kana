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
    if (options != {}) {
      let tmpInputOpts = [...inputOpts];
      tmpInputOpts[index] = options;
      setInputOpts(tmpInputOpts);
    }
  }, [options]);

  useEffect(() => {
    let tmpOptions = { ...options };
    if (
      options != {} &&
      "adtExperiment" in options &&
      options["adtExperiment"] !== "none" &&
      options["adtExperiment"] !== null &&
      options["adtExperiment"] !== undefined
    ) {
      tmpOptions["adtCountAssay"] =
        preflight.modality_assay_names[options?.["adtExperiment"]][0];
      tmpOptions["primaryAdtFeatureIdColumn"] = Object.keys(
        preflight.modality_features[options?.["adtExperiment"]].columns
      )[0];
    } else {
      delete tmpOptions["adtCountAssay"];
      delete tmpOptions["primaryAdtFeatureIdColumn"];
    }
    setOptions(tmpOptions);
  }, [options?.["adtExperiment"]]);

  useEffect(() => {
    let tmpOptions = { ...options };
    if (
      options != {} &&
      "crisprExperiment" in options &&
      options["crisprExperiment"] !== "none" &&
      options["crisprExperiment"] !== null &&
      options["crisprExperiment"] !== undefined
    ) {
      tmpOptions["crisprCountAssay"] =
        preflight.modality_assay_names[options?.["crisprExperiment"]][0];
      tmpOptions["primaryCrisprFeatureIdColumn"] = Object.keys(
        preflight.modality_features[options?.["crisprExperiment"]].columns
      )[0];
    } else {
      delete tmpOptions["crisprCountAssay"];
      delete tmpOptions["primaryCrisprFeatureIdColumn"];
    }
    setOptions(tmpOptions);
  }, [options?.["crisprExperiment"]]);

  useEffect(() => {
    let tmpOptions = { ...options };
    if (
      options != {} &&
      "rnaExperiment" in options &&
      options["rnaExperiment"] !== "none" &&
      options["rnaExperiment"] !== null &&
      options["rnaExperiment"] !== undefined
    ) {
      tmpOptions["rnaCountAssay"] =
        preflight.modality_assay_names[options?.["rnaExperiment"]][0];
      tmpOptions["primaryRnaFeatureIdColumn"] = Object.keys(
        preflight.modality_features[options?.["rnaExperiment"]].columns
      )[0];
    } else {
      delete tmpOptions["rnaCountAssay"];
      delete tmpOptions["primaryRnaFeatureIdColumn"];
    }
    setOptions(tmpOptions);
  }, [options?.["rnaExperiment"]]);

  const getAvailableModalities = (modality) => {
    let curr_mod_sel = options?.[`${modality.toLowerCase()}Experiment`];

    let remaining_modalities = MODALITIES.filter((x) => x !== modality).map(
      (x) => options?.[`${x.toLowerCase()}Experiment`]
    );

    let list = [
      ...Object.keys(dsMeta.modality_features).filter(
        (x) => x !== curr_mod_sel
      ),
    ].filter((x) => !remaining_modalities.includes(x));

    const flist = list.filter((x) => x !== undefined || x !== null);
    let fflist = flist;
    if (curr_mod_sel !== undefined && curr_mod_sel !== null) {
      fflist = [curr_mod_sel, ...flist];
    }

    return fflist;
  };

  function guessModalities(preflight) {
    let tmpOptions = {};
    for (const [k, v] of Object.entries(preflight.modality_features)) {
      if (k == "" || k.toLowerCase().indexOf("gene") > -1) {
        tmpOptions["rnaExperiment"] = k;
        tmpOptions["rnaCountAssay"] = preflight.modality_assay_names[k][0];
        tmpOptions["primaryRnaFeatureIdColumn"] = Object.keys(v.columns)[0];
      } else if (
        k.toLowerCase().indexOf("antibody") > -1 ||
        k.toLowerCase().indexOf("adt") > -1
      ) {
        tmpOptions["adtExperiment"] = k;
        tmpOptions["adtCountAssay"] = preflight.modality_assay_names[k][0];
        tmpOptions["primaryAdtFeatureIdColumn"] = Object.keys(v.columns)[0];
      } else if (k.toLowerCase().indexOf("crispr") > -1) {
        tmpOptions["crisprExperiment"] = k;
        tmpOptions["crisprCountAssay"] = preflight.modality_assay_names[k][0];
        tmpOptions["primaryCrisprFeatureIdColumn"] = Object.keys(v.columns)[0];
      }
    }
    return tmpOptions;
  }

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
      <Divider />
      <div className={dsMeta ? "" : "bp4-skeleton"}>
        <p>
          This <strong>{resource.format}</strong> dataset contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells and the following feature types:{" "}
          {dsMeta && reportFeatureTypes(dsMeta.modality_features)}
        </p>
        <Divider />
        <Collapse isOpen={collapse}>
          <div>
            {dsMeta && Object.keys(dsMeta.modality_features).length > 1 && (
              <H5>Optional settings</H5>
            )}
            {dsMeta &&
              MODALITIES.map((mod, i) => {
                return (
                  <div key={i}>
                    <Label className="row-input">
                      <Text>
                        <strong>{mod} Modality</strong>
                      </Text>
                      <HTMLSelect
                        defaultValue={
                          options[`${mod.toLowerCase()}Experiment`] !== null
                            ? options[`${mod.toLowerCase()}Experiment`]
                            : "none"
                        }
                        onChange={(e) => {
                          if (e.target.value) {
                            let tmpOptions = { ...options };
                            if (e.target.value === "none") {
                              tmpOptions[`${mod.toLowerCase()}Experiment`] =
                                null;
                            } else {
                              tmpOptions[`${mod.toLowerCase()}Experiment`] =
                                e.target.value;
                            }
                            setOptions(tmpOptions);
                          }
                        }}
                      >
                        <option value="none">None</option>
                        {getAvailableModalities(mod).map((x, i) => (
                          <option key={i} value={x}>
                            {x === "" ? "Unknown Modality" : x}
                          </option>
                        ))}
                      </HTMLSelect>
                    </Label>
                    <FormGroup
                      disabled={
                        options?.[`${mod.toLowerCase()}Experiment`] ===
                          undefined ||
                        options?.[`${mod.toLowerCase()}Experiment`] === null ||
                        options?.[`${mod.toLowerCase()}Experiment`] === "none"
                      }
                    >
                      <Label className="row-input">
                        <Text>
                          <strong>{mod} Count Assay</strong>
                        </Text>
                        <HTMLSelect
                          defaultValue={
                            options?.[`${mod.toLowerCase()}Experiment`]
                              ? dsMeta.modality_assay_names[
                                  options?.[`${mod.toLowerCase()}Experiment`]
                                ][0]
                              : null
                          }
                          onChange={(e) => {
                            if (e.target.value) {
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
                            options?.[`${mod.toLowerCase()}Experiment`]
                          ] &&
                            dsMeta.modality_assay_names[
                              options[`${mod.toLowerCase()}Experiment`]
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
                        options?.[`${mod.toLowerCase()}Experiment`] ===
                          undefined ||
                        options?.[`${mod.toLowerCase()}Experiment`] === null ||
                        options?.[`${mod.toLowerCase()}Experiment`] === "none"
                      }
                    >
                      <Label className="row-input">
                        <Text>
                          <strong>{mod} Feature ID</strong>
                        </Text>
                        <HTMLSelect
                          defaultValue="none"
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
                          <option value="none">rownames</option>
                          {dsMeta.modality_features[
                            options?.[`${mod.toLowerCase()}Experiment`]
                          ]?.["columns"] &&
                            Object.keys(
                              dsMeta.modality_features[
                                options[`${mod.toLowerCase()}Experiment`]
                              ]["columns"]
                            ).map((x, i) => (
                              <option key={i} value={x}>
                                {x}
                              </option>
                            ))}
                        </HTMLSelect>
                      </Label>
                    </FormGroup>
                    <Divider />
                  </div>
                );
              })}
          </div>
        </Collapse>
      </div>
    </Callout>
  );
}
