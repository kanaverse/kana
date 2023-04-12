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

import { reportEmbeddings } from "./utils.js";

export function H5ADCard({
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
      // tmpOptions["featureTypeColumnName"] = Object.keys(
      //   preflight.all_features.columns
      // )[0];

      props?.setSelectedFsetModality("");

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
      <div className={dsMeta ? "" : "bp4-skeleton"}>
        <p>
          This <strong>H5AD</strong> file contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells and{" "}
          {dsMeta && dsMeta.all_features.numberOfFeatures} features.
        </p>
        <Divider />
        <Collapse isOpen={collapse}>
          {dsMeta && (
            <div>
              <Label className="row-input">
                <Text>
                  <strong>Primary Assay</strong>
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
              <Divider/>
              <Label className="row-input">
                <Text>
                  <strong>Feature type column name</strong>{" "}
                  <small>
                    (when no feature type is provided, we assume that only RNA
                    data is present)
                  </small>
                </Text>
                <HTMLSelect
                  defaultValue="none"
                  onChange={(e) => {
                    let tmpOptions = { ...options };
                    if (e.target.value === "none") {
                      tmpOptions["featureTypeColumnName"] = null;
                      props?.setSelectedFsetModality("");
                    } else {
                      tmpOptions["featureTypeColumnName"] = e.target.value;
                      props?.setSelectedFsetModality(
                        dsMeta.all_features.columns[e.target.value].values[0]
                      );
                    }
                    setOptions(tmpOptions);
                  }}
                >
                  <option value="none">--- no selection ---</option>
                  {Object.keys(dsMeta.all_features["columns"]).map((x, i) => (
                    <option key={i} value={x}>
                      {x}
                    </option>
                  ))}
                </HTMLSelect>
              </Label>
              {options["featureTypeColumnName"] !== "none" &&
                options["featureTypeColumnName"] !== null &&
                options["featureTypeColumnName"] !== undefined && (
                  <Label className="row-input">
                    <Text>
                      <strong>
                        Name of the RNA feature type
                      </strong>
                    </Text>
                    <HTMLSelect
                      onChange={(e) => {
                        if (e.target.value === "none") {
                          props?.setSelectedFsetModality(null);
                        } else {
                          props?.setSelectedFsetModality(e.target.value);
                        }
                      }}
                    >
                      {dsMeta.all_features.columns[
                        options["featureTypeColumnName"]
                      ].values.map((x, i) => (
                        <option key={i} value={x}>
                          {x === "" ? (
                            <em>
                              <code>unnamed</code>
                            </em>
                          ) : (
                            <code>{x}</code>
                          )}
                        </option>
                      ))}
                    </HTMLSelect>
                  </Label>
                )}
            </div>
          )}
        </Collapse>
      </div>
    </Callout>
  );
}
