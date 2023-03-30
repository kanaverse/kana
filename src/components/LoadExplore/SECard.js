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
  Switch,
} from "@blueprintjs/core";

import "./index.css";

import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";

import { MODALITIES } from "../../utils/utils";

export function SECard({
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

  // when preflight is available
  useEffect(() => {
    if (preflight && preflight !== null && preflight !== undefined) {
      setDsMeta(preflight);

      // set some defaults
      let tmpOptions = {};
      tmpOptions["primaryAssay"] = {};
      tmpOptions["isPrimaryNormalized"] = {};
      for (const [k, v] of Object.entries(preflight.modality_assay_names)) {
        tmpOptions["primaryAssay"][k] = v[0];
        tmpOptions["isPrimaryNormalized"][k] = true;
      }
      tmpOptions["reducedDimensionNames"] = null;
      setOptions(tmpOptions);
    }
  }, [preflight]);

  // when options change
  useEffect(() => {
    if (options != {}) {
      let tmpInputOpts = { ...inputOpts };
      tmpInputOpts[index] = options;
      setInputOpts(tmpInputOpts);
    }
  }, [options]);

  // const handleRemove = () => {
  //   let tmpInputs = [...inputs];
  //   tmpInputs.splice(index, 1);
  //   setInputs(tmpInputs);
  // };

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
          {/* <Button icon="cross" minimal={true} onClick={handleRemove} /> */}
        </ButtonGroup>
      </div>
      <Divider />
      <div className={dsMeta ? "" : "bp4-skeleton"}>
        <p>
          <strong>{resource.format}</strong> contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells and{" "}
          {dsMeta && Object.keys(dsMeta.modality_features).length}{" "}
          {dsMeta && Object.keys(dsMeta.modality_features).length > 1
            ? "modalities"
            : "modality"}
          .
        </p>
        <Divider />
        <Collapse isOpen={collapse}>
          {dsMeta && (
            <div>
              <Label className="row-input">
                <Text>
                  <span>Choose a primary assay across modalities</span>
                </Text>
                {Object.keys(dsMeta.modality_assay_names).map((x, i) => {
                  return (
                    <div key={i}>
                      <Label className="row-input">
                        <Text>
                          <span>
                            Modality:{" "}
                            {x === "" ? <em>"Unknown Modality"</em> : x}
                          </span>
                        </Text>
                        <HTMLSelect
                          defaultValue={options["primaryAssay"][x]}
                          onChange={(e) => {
                            let tmpOptions = { ...options };
                            if (e.target.value === "none") {
                              delete tmpOptions["primaryAssay"][x];
                            } else {
                              tmpOptions["primaryAssay"][x] = e.target.value;
                            }
                            setOptions(tmpOptions);
                          }}
                        >
                          <option key={i} value="none">
                            None
                          </option>
                          {dsMeta.modality_assay_names[x].map((ax, i) => (
                            <option key={i} value={ax}>
                              {ax}
                            </option>
                          ))}
                        </HTMLSelect>
                      </Label>
                      {options["primaryAssay"][x] &&
                        options["primaryAssay"][x] !== "none" && (
                          <Label className="row-input">
                            <Switch
                              checked={options["isPrimaryNormalized"]}
                              label="Is this assay normalized?"
                              onChange={(e) => {
                                let tmpOptions = { ...options };
                                tmpOptions["isPrimaryNormalized"] =
                                  e.target.checked;
                                setOptions(tmpOptions);
                              }}
                            />
                          </Label>
                        )}
                      <Divider />
                    </div>
                  );
                })}
              </Label>
            </div>
          )}
        </Collapse>
      </div>
    </Callout>
  );
}
