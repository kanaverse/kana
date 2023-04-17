import { useState, useEffect } from "react";

import {
  Label,
  Text,
  HTMLSelect,
  ButtonGroup,
  Button,
  Divider,
  Callout,
  Collapse,
  EditableText,
  Switch,
} from "@blueprintjs/core";

import "./index.css";

import { reportFeatureTypes, reportEmbeddings } from "./utils.js";

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
  const [sortedFeatureVals, setSortedFeatureVals] = useState(null);

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
        tmpOptions["isPrimaryNormalized"][k] = v[0] === "counts" ? false : true;
      }
      tmpOptions["reducedDimensionNames"] = null;
      setOptions(tmpOptions);

      let top_modality = Object.keys(preflight.modality_features).sort(
        (a, b) => {
          return (
            preflight.modality_features[b].numberOfFeatures -
            preflight.modality_features[a].numberOfFeatures
          );
        }
      );

      props?.setSelectedFsetModality(top_modality[0]);
      setSortedFeatureVals(top_modality);
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
          This <strong>ZIP</strong> file contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells,{" "}
          {dsMeta && reportEmbeddings(dsMeta.reduced_dimension_names)} and the
          following feature types:{" "}
          {dsMeta && reportFeatureTypes(dsMeta.modality_features)}
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
                  defaultValue={sortedFeatureVals[0]}
                  onChange={(e) => {
                    if (e.target.value === "none") {
                      props?.setSelectedFsetModality(null);
                    } else {
                      props?.setSelectedFsetModality(e.target.value);
                    }
                  }}
                >
                  <option value="none">--- no selection ---</option>
                  {sortedFeatureVals.map((x, i) => (
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
                              <code>
                                <em>unnamed</em>
                              </code>
                            ) : (
                              x
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
                              checked={options["isPrimaryNormalized"][x]}
                              label="Is this assay normalized?"
                              onChange={(e) => {
                                let tmpOptions = { ...options };
                                tmpOptions["isPrimaryNormalized"][x] =
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
