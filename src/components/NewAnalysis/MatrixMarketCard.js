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
import { guessModalities } from "./utils";

export function MatrixMarket({
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
    setCollapse(props?.expand);
  }, [props?.expand]);

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
    return Object.keys(dsMeta.modality_features);
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
          This <strong>10X MatrixMarket</strong> dataset contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells and the following feature
          types:{" "}
          {dsMeta &&
            Object.entries(dsMeta.modality_features).map((x) => (
              <>
                <Code>{x[0]}</Code> ({x[1].numberOfFeatures} features)
              </>
            ))}
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
                          options[getFTypeKey(mod)] !== null
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
                          <option value="none">rownames</option>
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
