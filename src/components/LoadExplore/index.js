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
import { H5ADCard } from "./H5ADCard";
import { SECard } from "./SECard";
import { ZippedADBCard } from "./ZippedADBCard";
import JSZip from "jszip";

export function LoadExplore({ open, setOpen, setShowPanel, ...props }) {
  // close the entire panel
  const handleClose = () => {
    setOpen(false);
  };

  // minimise info box on the right
  const [openInfo, setOpenInfo] = useState(true);

  // Access App Context
  const {
    setExploreFiles,
    setPreInputFiles,
    preInputFilesStatus,
    setPreInputFilesStatus,
  } = useContext(AppContext);

  // what tab was selected to identify format
  const [tabSelected, setTabSelected] = useState("H5AD");

  // contains the full list of inputs
  const [exploreInputs, setExploreInputs] = useState([]);

  // is eveyrthing good?
  const [tmpStatusValid, setTmpStatusValid] = useState(true);

  // contains the tmp list of inputs so we can discard if needed
  const [tmpLoadInputs, setTmpLoadInputs] = useState({
    name: `explore-dataset-1`,
    format: tabSelected,
  });

  // final inputs for confirmation with options
  const [inputOptions, setInputOptions] = useState([]);

  const handleExplore = () => {
    let mapFiles = {};
    mapFiles[tmpLoadInputs.name] = tmpLoadInputs;
    mapFiles[tmpLoadInputs.name]["options"] = inputOptions;

    let fInputFiles = { files: mapFiles };
    setExploreFiles(fInputFiles);
    setShowPanel("explore");
  };

  // final inputs for confirmation with options
  const [jsZipNames, setJsZipNames] = useState(null);

  // making sure tmpNewInputs are valid as the user chooses datasets
  useEffect(() => {
    if (tmpLoadInputs) {
      let all_valid = true;
      let x = tmpLoadInputs;
      if (x.format === "H5AD") {
        if (x?.h5 && !x?.h5.name.toLowerCase().endsWith("h5ad")) {
          all_valid = false;
        }

        if (!x.h5) all_valid = false;
      } else if (x.format === "SummarizedExperiment") {
        if (x?.rds && !x?.rds.name.toLowerCase().endsWith("rds")) {
          all_valid = false;
        }

        if (!x.rds) all_valid = false;
      } else if (x.format === "ZippedArtifactdb") {
        if (x?.zipfile && !x?.zipfile.name.toLowerCase().endsWith("zip")) {
          all_valid = false;
        }

        if (!x.zipfile) all_valid = false;
        if (!x.zipname) all_valid = false;
      }

      setTmpStatusValid(all_valid);

      if (all_valid) {
        // currently only allow a single dataset
        tmpLoadInputs["uid"] = generateUID(tmpLoadInputs);

        setExploreInputs([tmpLoadInputs]);
      }
    }
  }, [tmpLoadInputs]);

  // send a preflight req out everytime a new dataset is added
  useEffect(() => {
    if (Array.isArray(exploreInputs) && exploreInputs.length > 0) {
      let mapFiles = {};
      for (const f of exploreInputs) {
        mapFiles[f.name] = f;
      }

      setPreInputFiles({
        files: mapFiles,
      });
    }
  }, [exploreInputs]);

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

          setExploreInputs([]);
          setInputOptions([]);
          setPreInputFiles(null);
          setPreInputFilesStatus(null);
        }}
      >
        <Tab
          id="H5AD"
          title="H5AD"
          panel={
            <div>
              <div className="row">
                <Callout intent="primary">
                  <p>
                    Load a <code>*.h5ad</code> file containing pre-computed
                    analysis results such as reduced dimensions and clusterings.
                  </p>
                </Callout>
              </div>
              <div className="row">
                <Label className="row-input">
                  <Text className="text-100">
                    <span>Choose a H5AD file</span>
                  </Text>
                  <FileInput
                    style={{
                      marginTop: "5px",
                    }}
                    text={tmpLoadInputs?.h5 ? tmpLoadInputs?.h5.name : ".H5AD"}
                    onInputChange={(msg) => {
                      if (msg.target.files) {
                        setTmpLoadInputs({
                          ...tmpLoadInputs,
                          h5: msg.target.files[0],
                        });
                      }
                    }}
                  />
                </Label>
              </div>
            </div>
          }
        />
        <Tab
          id="SummarizedExperiment"
          title="RDS"
          panel={
            <div>
              <div className="row">
                <Callout intent="primary">
                  <p>
                    Load an <code>*.rds</code> file containing a
                    SingleCellExperiment with pre-computed analysis results such
                    as reduced dimensions and clusterings.
                  </p>
                </Callout>
              </div>
              <div className="row">
                <Label className="row-input">
                  <Text className="text-100">
                    <span>Choose an RDS file</span>
                  </Text>
                  <FileInput
                    style={{
                      marginTop: "5px",
                    }}
                    text={tmpLoadInputs?.rds ? tmpLoadInputs?.rds.name : ".RDS"}
                    onInputChange={(msg) => {
                      if (msg.target.files) {
                        setTmpLoadInputs({
                          ...tmpLoadInputs,
                          rds: msg.target.files[0],
                        });
                      }
                    }}
                  />
                </Label>
              </div>
            </div>
          }
        />
        <Tab
          id="ZippedArtifactdb"
          title="ZIP"
          panel={
            <div>
              <div className="row">
                <Callout intent="primary">
                  <p>
                    Load an <code>*.zip</code> file containing the saved results
                    from <strong>kana</strong>'s analysis mode, via the <em>Download analysis results (as ZIP)</em> option. This should
                    include reduced dimensions and clusterings.
                  </p>
                </Callout>
              </div>
              <div className="row">
                <Label className="row-input">
                  <Text className="text-100">
                    <span>Choose a ZIP file</span>
                  </Text>
                  <FileInput
                    style={{
                      marginTop: "5px",
                    }}
                    text={
                      tmpLoadInputs?.zipfile
                        ? tmpLoadInputs?.zipfile.name
                        : ".zip"
                    }
                    onInputChange={(msg) => {
                      if (msg.target.files) {
                        JSZip.loadAsync(msg.target.files[0]).then(
                          function (zip) {
                            let se_tld = [];
                            zip.forEach(function (relativePath, zipEntry) {
                              if (
                                zipEntry.name.endsWith("/") &&
                                zipEntry.name.split("/").length == 2
                              ) {
                                se_tld.push(zipEntry.name.split("/")[0]);
                              }
                            });

                            setTmpStatusValid(true);
                            setJsZipNames(se_tld);

                            setTmpLoadInputs({
                              ...tmpLoadInputs,
                              zipfile: msg.target.files[0],
                              zipname: se_tld[0],
                            });
                          },
                          function (e) {
                            console.error(
                              "Error reading " +
                                msg.target.files[0].name +
                                ": " +
                                e.message
                            );

                            setTmpStatusValid(false);
                          }
                        );
                      }
                    }}
                  />
                </Label>
                {jsZipNames && jsZipNames.length > 0 && (
                  <Label className="row-input">
                    <Text className="text-100">
                      <span>Choose a summarized experiment to load</span>
                    </Text>
                    <HTMLSelect
                      defaultValue={jsZipNames[0]}
                      onChange={(e) => {
                        setTmpLoadInputs({
                          ...tmpLoadInputs,
                          zipname: e.currentTarget.value,
                        });
                      }}
                    >
                      {jsZipNames.map((x, i) => {
                        return (
                          <option key={i} value={x}>
                            {x}
                          </option>
                        );
                      })}
                    </HTMLSelect>
                  </Label>
                )}
              </div>
            </div>
          }
        />
      </Tabs>
    );
  };

  return (
    <Card className="section" interactive={false} elevation={Elevation.ZERO}>
      <div className="section-header">
        <H2 className="section-header-title">Explore Pre-computed Results</H2>
      </div>
      <Divider />
      <div className="section-content">
        <div className="section-content-body">{render_inputs()}</div>
        <div className="section-info">
          <div className="section-inputs">
            {exploreInputs.map((x, i) => {
              if (x.format == "H5AD" && x.h5 !== null && x.h5 !== undefined) {
                return (
                  <H5ADCard
                    key={i}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={exploreInputs}
                    setInputs={setExploreInputs}
                    setSelectedFsetModality={props?.setSelectedFsetModality}
                  />
                );
              } else if (
                x.format == "SummarizedExperiment" &&
                x.rds !== null &&
                x.rds !== undefined
              ) {
                return (
                  <SECard
                    key={i}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={exploreInputs}
                    setInputs={setExploreInputs}
                    setSelectedFsetModality={props?.setSelectedFsetModality}
                  />
                );
              } else if (
                x.format == "ZippedArtifactdb" &&
                x.zipfile !== null &&
                x.zipfile !== undefined
              ) {
                return (
                  <ZippedADBCard
                    key={i}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={exploreInputs}
                    setInputs={setExploreInputs}
                    setSelectedFsetModality={props?.setSelectedFsetModality}
                  />
                );
              }
            })}
          </div>
        </div>
      </div>
      <Divider />
      <div className="section-footer">
        <Tooltip2 content="Cancel explore" placement="left">
          <Button
            icon="cross"
            intent={"warning"}
            large={true}
            onClick={handleClose}
            text="Cancel"
          />
        </Tooltip2>
        <Tooltip2 content="Explore dataset" placement="right">
          <Button
            icon="import"
            onClick={handleExplore}
            intent={"primary"}
            large={true}
            disabled={!tmpStatusValid}
            text="Explore"
          />
        </Tooltip2>
      </div>
    </Card>
  );
}
