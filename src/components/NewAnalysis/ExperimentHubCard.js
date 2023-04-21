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
} from "@blueprintjs/core";

import "./index.css";

import { reportFeatureTypes } from "./utils";

export function ExperimentHub({
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
        let tmpOptions = {};
        if (preflight.modality_features["RNA"].rownames === true) {
          tmpOptions["primaryRnaFeatureIdColumn"] = "none";
        } else {
          tmpOptions["primaryRnaFeatureIdColumn"] = Object.keys(
            preflight.modality_features["RNA"]["columns"]
          )[0];
        }
        // for (const [k, v] of Object.entries(preflight.modality_features)) {
        //   if (k.toLowerCase().indexOf("rna") > -1) {
        //     tmpOptions["primaryRnaFeatureIdColumn"] = Object.keys(v.columns)[0];
        //   }
        // }

        setOptions(tmpOptions);
        setInit2(false);
      }
    }
  }, [preflight]);

  // when options change
  useEffect(() => {
    if (options !== null && options !== undefined && options !== {}) {
      let tmpInputOpts = [...inputOpts];
      tmpInputOpts[index] = options;
      setInputOpts(tmpInputOpts);
    }
  }, [options]);

  useEffect(() => {
    setCollapse(props?.expand);
  }, [props?.expand]);

  const handleRemove = () => {
    let tmpInputs = [...inputs];
    tmpInputs.splice(index, 1);
    setInputs(tmpInputs);

    let tmpInputOpts = [...inputOpts];
    tmpInputOpts.splice(index, 1);
    setInputOpts(tmpInputOpts);
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
          This <strong>{resource.format}</strong> dataset contains{" "}
          {dsMeta && dsMeta.cells.numberOfCells} cells and the following feature
          types: {dsMeta && reportFeatureTypes(dsMeta.modality_features)}
        </p>
        <Divider />
        <Collapse isOpen={collapse}>
          {dsMeta && (
            <div>
              <Label className="row-input">
                <Text>
                  <strong>RNA primary feature ID</strong>
                </Text>
                <HTMLSelect
                  defaultValue={options["primaryRnaFeatureIdColumn"]}
                  onChange={(e) => {
                    if (
                      e.target.value !== undefined &&
                      e.target.value !== null
                    ) {
                      let tmpOptions = { ...options };
                      if (e.target.value === "none") {
                        tmpOptions["primaryRnaFeatureIdColumn"] = null;
                      } else {
                        tmpOptions["primaryRnaFeatureIdColumn"] =
                          e.target.value;
                      }
                      setOptions(tmpOptions);
                    }
                  }}
                >
                  {dsMeta.modality_features["RNA"].rownames === true && (
                    <option value="none">rownames</option>
                  )}
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
