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
          {dsMeta && Object.entries(dsMeta.modality_features).map(x => 
              <> 
                <Code>{x[0]}</Code> ({x[1].numberOfFeatures} features)
              </>
            )
          }
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
                          options[
                            `featureType${
                              mod.toLowerCase().charAt(0).toUpperCase() +
                              mod.toLowerCase().slice(1)
                            }Name`
                          ] !== null
                            ? options[
                                `featureType${
                                  mod.toLowerCase().charAt(0).toUpperCase() +
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
                                  mod.toLowerCase().charAt(0).toUpperCase() +
                                  mod.toLowerCase().slice(1)
                                }Name`
                              ] = null;
                            } else {
                              tmpOptions[
                                `featureType${
                                  mod.toLowerCase().charAt(0).toUpperCase() +
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
                            {x === "" ? "Unknown Modality" : x}
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
                            options?.[
                              `featureType${
                                mod.toLowerCase().charAt(0).toUpperCase() +
                                mod.toLowerCase().slice(1)
                              }Name`
                            ]
                          ]?.["columns"] &&
                            Object.keys(
                              dsMeta.modality_features[
                                options[
                                  `featureType${
                                    mod.toLowerCase().charAt(0).toUpperCase() +
                                    mod.toLowerCase().slice(1)
                                  }Name`
                                ]
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
