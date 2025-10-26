import { useState, useEffect } from "react";

import {
  Label,
  Text,
  HTMLSelect,
  Divider,
  Callout,
  Collapse,
  Switch,
} from "@blueprintjs/core";

import "./index.css";

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

  const [sortedFeatureVals, setSortedFeatureVals] = useState(null);

  // when preflight is available
  useEffect(() => {
    if (preflight && preflight !== null && preflight !== undefined) {
      setDsMeta(preflight);

      // set some defaults
      let tmpOptions = {};
      tmpOptions["primaryMatrixName"] = preflight.all_assay_names[0];
      tmpOptions["isPrimaryNormalized"] = true;
      tmpOptions["reducedDimensionNames"] = null;
      props?.setSelectedFsetModality("");
      setOptions(tmpOptions);
    }
  }, [preflight]);

  // when options change
  useEffect(() => {
    if (options !== {}) {
      let tmpInputOpts = { ...inputOpts, ...options };
      setInputOpts(tmpInputOpts);
    }
  }, [options]);

  const handleRemove = () => {
    let tmpInputs = [...inputs];
    tmpInputs.splice(index, 1);
    setInputs(tmpInputs);
  };

  useEffect(() => {
    if (
      options["featureTypeColumnName"] !== "none" &&
      options["featureTypeColumnName"] !== null &&
      options["featureTypeColumnName"] !== undefined
    ) {
      const vals =
        dsMeta.all_features.columns[options["featureTypeColumnName"]].values;

      const all_vals =
        dsMeta.all_features.columns[options["featureTypeColumnName"]]["_all_"];

      const top_mods = vals.sort((a, b) => {
        return (
          all_vals.filter((x) => x === b).length -
          all_vals.filter((x) => x === a).length
        );
      });

      setSortedFeatureVals(top_mods);

      props?.setSelectedFsetModality(top_mods[0]);
    }
  }, [options["featureTypeColumnName"]]);

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
              <Divider />
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
            </div>
          )}
        </Collapse>
      </div>
    </Callout>
  );
}
