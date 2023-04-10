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

export function ZippedADBCard({
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
      tmpOptions["primaryMatrixName"] = preflight.all_assay_names[0];
      tmpOptions["isPrimaryNormalized"] = true;
      tmpOptions["reducedDimensionNames"] = null;

      setOptions(tmpOptions);
    }
  }, [preflight]);

  // when options change
  useEffect(() => {
    if (options != {}) {
      let tmpInputOpts = { ...inputOpts, ...options };
      setInputOpts(tmpInputOpts);
    }
  }, [options]);

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
          <strong>{resource.format}</strong> contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells and{" "}
          {dsMeta && dsMeta.reduced_dimension_names.length}{" "}
          {dsMeta && dsMeta.reduced_dimension_names.length > 1
            ? "embeddings"
            : "embedding"}
          .
        </p>
        <Divider />
        <Collapse isOpen={collapse}>
          {dsMeta && (
            <div>
              <Label className="row-input">
                <Text>
                  <span>Primary Assay</span>
                </Text>
                <HTMLSelect
                  defaultValue={dsMeta.all_assay_names[0]}
                  onChange={(e) => {
                    let tmpOptions = { ...options };
                    tmpOptions["primaryMatrixName"] = e.target.value;
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
              <Label className="row-input">
                <Switch
                  checked={options["isPrimaryNormalized"]}
                  label="Is Primary Assay Normalized?"
                  onChange={(e) => {
                    let tmpOptions = { ...options };
                    tmpOptions["isPrimaryNormalized"] = e.target.checked;
                    setOptions(tmpOptions);
                  }}
                />
              </Label>
            </div>
          )}
        </Collapse>
      </div>
    </Callout>
  );
}
