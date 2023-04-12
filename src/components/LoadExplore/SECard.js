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

import { reportFeatureTypes, reportEmbeddings } from "./utils.js";

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
      <div className={dsMeta ? "" : "bp4-skeleton"}>
        <p>
          This <strong>RDS</strong> file contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells,{" "}
          {dsMeta && reportEmbeddings(dsMeta.reduced_dimension_names)}{" "}
          and the following feature
          types: {dsMeta && reportFeatureTypes(dsMeta.modality_features)}
        </p>
        <Divider />
        <Collapse isOpen={collapse}>
          {dsMeta && (
            <div>
              <Label className="row-input">
                <Text>
                  <strong>Name of the RNA feature type</strong>
                </Text>
                <HTMLSelect
                  defaultValue="none"
                  onChange={(e) => {
                    if (e.target.value === "none") {
                      props?.setSelectedFsetModality(null);
                    } else {
                      props?.setSelectedFsetModality(e.target.value);
                    }
                  }}
                >
                  <option value="none">--- no selection ---</option>
                  {Object.keys(dsMeta.modality_assay_names).map((x, i) => (
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
              <Label className="row-input">
                {Object.keys(dsMeta.modality_assay_names).map((x, i) => {
                  return (
                    <div key={i}>
                      <Divider />
                      <Label className="row-input">
                        <Text>
                          <strong>
                            Assay for feature type{" "}
                            {x === "" ? (
                              <em>
                                <code>unnamed</code>
                              </em>
                            ) : (
                              <code>{x}</code>
                            )}
                          </strong>
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
                          <option value="none">--- no selection ---</option>
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
                              label="Is this assay log-normalized?"
                              onChange={(e) => {
                                let tmpOptions = { ...options };
                                tmpOptions["isPrimaryNormalized"] =
                                  e.target.checked;
                                setOptions(tmpOptions);
                              }}
                            />
                          </Label>
                        )}
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
