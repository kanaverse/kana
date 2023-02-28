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
      for (const [k, v] of Object.entries(preflight.modality_features)) {
        if (k.toLowerCase().indexOf("rna") > -1) {
          tmpOptions["primaryRnaFeatureIdColumn"] = Object.keys(v.columns)[0];
        }
      }

      setOptions(tmpOptions);
    }
  }, [preflight]);

  // when options change
  useEffect(() => {
    if (options != {}) {
      let tmpInputOpts = {...inputOpts};
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
                  <span>Primary RNA Feature ID</span>
                </Text>
                <HTMLSelect
                  defaultValue={
                    Object.keys(dsMeta.modality_features["RNA"]["columns"])[0]
                  }
                  onChange={(e) => {
                    let tmpOptions = { ...options };
                    tmpOptions["primaryRnaFeatureIdColumn"] = e.target.value;
                    setOptions(tmpOptions);
                  }}
                >
                  {Object.keys(dsMeta.modality_features["RNA"]["columns"]).map(
                    (x, i) => (
                      <option key={i} value={x}>
                        {x}
                      </option>
                    )
                  )}
                </HTMLSelect>
              </Label>
            </div>
          )}
        </Collapse>
      </div>
    </Callout>
  );
}
