import { useState, useContext, useEffect } from "react";

import {
  Tabs,
  Tab,
  Label,
  Text,
  FileInput,
  Icon,
  Card,
  Elevation,
  Button,
  Divider,
  Callout,
  H2,
  RadioGroup,
  Radio,
} from "@blueprintjs/core";

import "./index.css";

import { AppContext } from "../../context/AppContext";

import { Tooltip2 } from "@blueprintjs/popover2";

export function LoadAnalysis({ setShowPanel, ...props }) {
  // clear the entire panel
  const handleClose = () => {
    setTmpLoadInputs({
      name: `load-dataset-1`,
      format: tabSelected,
    });

    setTmpStatusValid(true);
  };

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
            <>
              <div>
                <div className="row">
                  <Callout intent="primary">
                    <p>
                      Load analysis parameters from a <code>*.zip</code> file,
                      created by clicking <em>Download analysis parameters</em>{" "}
                      during a previous <strong>kana</strong> session.
                    </p>
                  </Callout>
                </div>
                <div className="row">
                  <Label className="row-input">
                    <Text className="text-100">
                      <span>Load parameters from ZIP file</span>
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
            </>
          }
        />
        {
          <Tab
            id="kanadb"
            title="Load from browser"
            panel={
              <>
                <div className="row">
                  <Callout intent="primary">
                    <p>
                      Load analysis parameters from the browser's cache, created
                      by clicking <em>Save analysis parameters (to browser)</em>{" "}
                      during a previous <strong>kana</strong> session.
                    </p>
                  </Callout>
                </div>
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
                          <span>Load parameters from browser</span>
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
              </>
            }
          />
        }
      </Tabs>
    );
  };

  return (
    <Card className="section" interactive={false} elevation={Elevation.ZERO}>
      <div className="section-header">
        <H2 className="section-header-title">Load Analysis Parameters</H2>
      </div>
      <Divider />
      <div className="section-content">
        <div className="section-content-body">
          <Callout>
            <p>
              <strong>
                Recover an analysis using saved parameters from a previous kana
                session.
              </strong>
            </p>
          </Callout>
          <Divider />
          {render_inputs()}
        </div>
      </div>
      <Divider />
      <div className="section-footer">
        <Tooltip2 content="Clear selection" placement="left">
          <Button
            icon="cross"
            intent={"warning"}
            large={true}
            onClick={handleClose}
            text="Clear"
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
