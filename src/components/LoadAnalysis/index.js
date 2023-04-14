import { useState, useCallback, useContext, useEffect } from "react";

import {
  Tabs,
  Tab,
  Classes,
  Drawer,
  Label,
  Text,
  HTMLSelect,
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
  ButtonGroup,
  RadioGroup,
  Radio,
} from "@blueprintjs/core";

import "./index.css";

import { AppContext } from "../../context/AppContext";

import { generateUID } from "../../utils/utils";
import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";

import { MODALITIES } from "../../utils/utils";

export function LoadAnalysis({ open, setOpen, setShowPanel, ...props }) {
  // close the entire panel
  const handleClose = () => {
    setOpen(false);
  };

  // minimise info box on the right
  const [openInfo, setOpenInfo] = useState(true);

  // Access App Context
  const { setLoadFiles } = useContext(AppContext);

  // what tab was selected to identify format
  const [tabSelected, setTabSelected] = useState("kana");

  // is eveyrthing good?
  const [tmpStatusValid, setTmpStatusValid] = useState(true);

  // contains the tmp list of inputs so we can discard if needed
  const [tmpLoadInputs, setTmpLoadInputs] = useState({
    name: `load-dataset-1`,
    format: tabSelected,
  });

  const parseKanaDate = (x) => {
    let d = new Date(x);
    return d.toDateString() + ", " + d.toLocaleTimeString();
  };

  const handleLoad = () => {
    let mapFiles = {};
    mapFiles[tmpLoadInputs.name] = tmpLoadInputs;

    let fInputFiles = { files: mapFiles };
    setLoadFiles(fInputFiles);
    setShowPanel("results");
  };

  // making sure tmpNewInputs are valid as the user chooses datasets
  useEffect(() => {
    if (tmpLoadInputs) {
      let x = tmpLoadInputs;
      if (x?.file == null) {
        setTmpStatusValid(false);
      } else {
        if (
          tabSelected === "kana" &&
          x?.file != null &&
          !(
            x.file.name.toLowerCase().endsWith("kana") ||
            x.file.name.toLowerCase().endsWith("kana.gz") ||
            x.file.name.toLowerCase().endsWith("zip")
          )
        ) {
          setTmpStatusValid(false);
        } else if (tabSelected === "kanadb" && x?.file === null) {
          setTmpStatusValid(false);
        } else {
          setTmpStatusValid(true);
        }
      }
    }
  }, [tmpLoadInputs]);

  const render_inputs = () => {
    return (
      <Tabs
        animate={true}
        renderActiveTabPanelOnly={true}
        vertical={true}
        defaultSelectedTabId={tabSelected}
        onChange={(ntab, otab) => {
          let tmp = { ...tmpLoadInputs };
          tmp["format"] = ntab;
          setTmpLoadInputs(tmp);
          setTabSelected(ntab);
        }}
      >
        <Tab
          id="kana"
          title="Load from file"
          panel={
            <div>
              <div className="row">
                <Label className="row-input">
                  <Text className="text-100">
                    <span>Load analysis from Kana file</span>
                  </Text>
                  <FileInput
                    style={{
                      marginTop: "5px",
                    }}
                    text={
                      tmpLoadInputs?.file
                        ? tmpLoadInputs?.file.name
                        : ".kana or .kana.gz or .zip"
                    }
                    onInputChange={(msg) => {
                      if (msg.target.files) {
                        setTmpLoadInputs({
                          ...tmpLoadInputs,
                          file: msg.target.files[0],
                        });
                      }
                    }}
                  />
                </Label>
              </div>
            </div>
          }
        />
        {
          <Tab
            id="kanadb"
            title="Load from browser"
            panel={
              <div>
                {props?.kanaIDBRecs.length > 0 ? (
                  <div className="row">
                    <Label className="row-input">
                      <Text
                        className="text-100"
                        style={{
                          paddingBottom: "10px",
                        }}
                      >
                        <span>Load analysis saved to browser</span>
                      </Text>
                      <RadioGroup
                        onChange={(x) => {
                          let tmp = { ...tmpLoadInputs };
                          tmp["file"] = x.currentTarget?.value;
                          setTmpLoadInputs(tmp);

                          setTmpStatusValid(true);
                        }}
                        selectedValue={tmpLoadInputs?.file}
                      >
                        {props?.kanaIDBRecs.map((x, i) => {
                          return (
                            <Radio
                              key={i}
                              style={{
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                              label={<strong>{x.title}</strong>}
                              value={x.id}
                            >
                              &nbsp;
                              <span className="kana-date">
                                {parseKanaDate(x.time)}
                              </span>{" "}
                              &nbsp;
                              <Icon
                                icon="trash"
                                size="10"
                                style={{
                                  alignSelf: "baseline",
                                  paddingTop: "4px",
                                  paddingLeft: "5px",
                                }}
                                onClick={() => {
                                  props?.setDeletekdb(x.id);
                                }}
                              ></Icon>
                            </Radio>
                          );
                        })}
                      </RadioGroup>
                    </Label>
                  </div>
                ) : (
                  <div className="row">
                    <Label className="row-input">
                      <Text className="text-100">
                        <span>Load analysis saved to browser</span>
                      </Text>
                      <br />
                      <span>No saved analysis found in the browser!</span>
                    </Label>
                  </div>
                )}
              </div>
            }
          />
        }
      </Tabs>
    );
  };

  return (
    <Card className="section" interactive={false} elevation={Elevation.ZERO}>
      <div className="section-header">
        <H2 className="section-header-title">Load Saved Analysis</H2>
      </div>
      <Divider />
      <div className="section-content">
        <div className="section-content-body">
          <Callout>
            <p>
              <strong> Import a saved analysis to get started. </strong>
            </p>
          </Callout>
          <Divider />
          {render_inputs()}
        </div>
        <div className="section-info">
          <div>
            {openInfo && (
              <Button
                outlined={true}
                fill={true}
                intent="warning"
                text="Hide Info"
                onClick={() => setOpenInfo(false)}
              />
            )}
            {!openInfo && (
              <Button
                outlined={true}
                fill={true}
                intent="warning"
                text="Show Info"
                onClick={() => setOpenInfo(true)}
              />
            )}
            <Collapse isOpen={openInfo}>
              <Callout intent="primary">
                <p>
                  These files are stored as{" "}
                  <strong>
                    <code>*.kana</code>
                  </strong>
                  . files.
                </p>
              </Callout>
            </Collapse>
          </div>
        </div>
      </div>
      <Divider />
      <div className="section-footer">
        <Tooltip2 content="Cancel Load" placement="left">
          <Button
            icon="cross"
            intent={"warning"}
            large={true}
            onClick={handleClose}
            text="Cancel"
          />
        </Tooltip2>
        <Tooltip2 content="Load Analysis" placement="right">
          <Button
            icon="import"
            onClick={handleLoad}
            intent={"primary"}
            large={true}
            disabled={!tmpStatusValid}
            text="Load"
          />
        </Tooltip2>
      </div>
    </Card>
  );
}
