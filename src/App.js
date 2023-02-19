import { useState, useCallback, useEffect, useContext } from "react";

import {
  Alignment,
  Button,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Divider,
  ButtonGroup,
  Drawer,
  Menu,
  Classes,
  Text,
  MenuItem,
  EditableText,
  Position,
  Icon,
  Card,
  Elevation,
  H5,
  NonIdealState,
  NonIdealStateIconSize,
} from "@blueprintjs/core";

import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";

import SplitPane from "react-split-pane";

import { NewAnalysis } from "./components/NewAnalysis";
import { LoadAnalysis } from "./components/LoadAnalysis";
import { SaveAnalysis } from "./components/SaveAnalysis";
import { ParameterSelection } from "./components/ParamSelection";
import { AppContext } from "./context/AppContext";

import pkgVersion from "../package.json";

import logo from "./assets/kana-cropped.png";
import "./App.css";

const scranWorker = new Worker(
  new URL("./workers/scran.worker.js", import.meta.url),
  { type: "module" }
);

function App() {
  // true until wasm is initialized
  const [loading, setLoading] = useState(true);

  // show various components, reacts to left side bar clicks
  const [showPanel, setShowPanel] = useState(null);

  // app export state - store to indexedDB
  const [indexedDBState, setIndexedDBState] = useState(false);
  // list of saved analysis in the browser's indexeddb
  const [kanaIDBRecs, setKanaIDBRecs] = useState([]);
  // delete saved analysis in the browser's indexeddb
  const [deletekdb, setDeletekdb] = useState(null);

  // Logs
  const [logs, setLogs] = useState([]);

  // Error handling
  // error message caught from the worker
  const [scranError, setScranError] = useState(null);

  const {
    wasmInitialized,
    preInputFiles,
    setWasmInitialized,
    datasetName,
    setEhubDatasets,
    setPreInputFilesStatus,
    inputFiles,
    params,
  } = useContext(AppContext);

  // initializes various things on the worker side
  useEffect(() => {
    scranWorker.postMessage({
      type: "INIT",
      msg: "Initial Load",
    });
  }, []);

  useEffect(() => {
    if (wasmInitialized && preInputFiles) {
      if (preInputFiles.files) {
        scranWorker.postMessage({
          type: "PREFLIGHT_INPUT",
          payload: {
            inputs: preInputFiles,
          },
        });
      }
    }
  }, [preInputFiles, wasmInitialized]);

  // New analysis: files are imported into Kana
  useEffect(() => {
    if (wasmInitialized) {
      if (inputFiles.files != null) {
        scranWorker.postMessage({
          type: "RUN",
          payload: {
            inputs: inputFiles,
            params: params,
          },
        });

        add_to_logs("info", `--- Analyis started---`);
      }
    }
  }, [inputFiles, params, wasmInitialized]);

  function add_to_logs(type, msg, status) {
    let tmp = [...logs];
    let d = new Date();
    tmp.push([type, d.toLocaleTimeString(), msg, status]);

    setLogs(tmp);
  }

  scranWorker.onmessage = (msg) => {
    const payload = msg.data;

    console.log("ON MAIN::RCV::", payload);

    // process any error messages
    if (payload) {
      if (payload.type.toLowerCase().endsWith("start")) {
        add_to_logs(
          "start",
          payload.type.toLowerCase().replace("_start", ""),
          "started"
        );
      } else if (payload.type.indexOf("_store") != -1) {
        add_to_logs(
          "info",
          `(${payload.type
            .toLowerCase()
            .replace("_store", "")}) store initialized`
        );
      } else if (payload.type.toLowerCase().endsWith("init")) {
        add_to_logs("info", payload.msg.toLowerCase().replace("success: ", ""));
      } else if (payload.type.toLowerCase().endsWith("cache")) {
        add_to_logs(
          "complete",
          payload.type.toLowerCase().replace("_cache", ""),
          "finished (from cache)"
        );
      } else if (payload.type.toLowerCase().endsWith("data")) {
        add_to_logs(
          "complete",
          payload.type.toLowerCase().replace("_data", ""),
          "finished"
        );
      }

      const { resp } = payload;
      if (
        payload.type.toLowerCase().endsWith("error") ||
        resp?.status === "ERROR"
      ) {
        add_to_logs("error", `${resp.reason}`, "");

        setScranError({
          type: payload.type,
          msg: resp.reason,
          fatal: resp?.fatal === undefined ? true : resp.fatal,
        });

        return;
      }
    }

    const { resp, type } = payload;

    if (type === "INIT") {
      setLoading(false);
      setWasmInitialized(true);
    } else if (type === "KanaDB") {
      setIndexedDBState(false);
    } else if (type === "KanaDB_store") {
      if (resp !== undefined) {
        setKanaIDBRecs(resp);
      }
      setIndexedDBState(false);
    } else if (type === "ExperimentHub_store") {
      if (resp !== undefined && Array.isArray(resp)) {
        setEhubDatasets(resp);
      }
    } else if (type === "PREFLIGHT_INPUT_DATA") {
      if (resp.details) {
        setPreInputFilesStatus(resp.details);
      }
    }
  };

  return (
    <div className="App">
      <Navbar className={Classes.DARK}>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading>
            {<img height="20px" src={logo}></img>}{" "}
            <span
              style={{
                fontSize: "8px",
              }}
            >
              v{pkgVersion.version}
            </span>
          </NavbarHeading>

          <NavbarDivider />
          <span>Single cell analysis in the browser</span>
          <NavbarDivider />
        </NavbarGroup>
      </Navbar>
      <SplitPane
        className="left-sidebar"
        split="vertical"
        defaultSize={60}
        allowResize={false}
      >
        <div className="left-sidebar-content">
          <div className="left-sidebar-content-flex-top">
            <div
              className={
                showPanel === "new" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Start a new analysis"
                minimal={false}
                placement={"right"}
                intent={showPanel === "new" ? "primary" : ""}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"folder-new"}
                    onClick={() =>
                      showPanel !== "new"
                        ? setShowPanel("new")
                        : setShowPanel(null)
                    }
                    intent={showPanel === "new" ? "primary" : "none"}
                  ></Button>
                  <span>NEW</span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div
              className={
                showPanel === "load" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Load an existing analysis"
                minimal={false}
                placement={"right"}
                intent={showPanel === "load" ? "primary" : ""}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"archive"}
                    onClick={() =>
                      showPanel !== "load"
                        ? setShowPanel("load")
                        : setShowPanel(null)
                    }
                    intent={showPanel === "load" ? "primary" : "none"}
                  ></Button>
                  <span>LOAD</span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div
              className={
                showPanel === "save" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              {" "}
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Save analysis!"
                minimal={false}
                placement={"right"}
                intent={showPanel === "save" ? "primary" : "none"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"floppy-disk"}
                    onClick={() =>
                      showPanel !== "save"
                        ? setShowPanel("save")
                        : setShowPanel(null)
                    }
                    intent={showPanel === "save" ? "primary" : "none"}
                  ></Button>
                  <span>SAVE</span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div
              className={
                showPanel === "params" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              {" "}
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Update or modify analysis parameters!"
                minimal={false}
                placement={"right"}
                intent={showPanel === "params" ? "primary" : "none"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"derive-column"}
                    onClick={() =>
                      showPanel !== "params"
                        ? setShowPanel("params")
                        : setShowPanel(null)
                    }
                    intent={showPanel === "params" ? "primary" : "none"}
                  ></Button>
                  <span>PARAMS</span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div
              className={
                showPanel === "logs" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              {" "}
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="What's happening under the hood? See the blow-by-blow logs as the analysis runs!"
                minimal={false}
                placement={"right"}
                intent={showPanel === "logs" ? "primary" : "none"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"console"}
                    onClick={() =>
                      showPanel !== "logs"
                        ? setShowPanel("logs")
                        : setShowPanel(null)
                    }
                    intent={showPanel === "logs" ? "primary" : "none"}
                  ></Button>
                  <span>LOGS</span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
          </div>
          <div className="left-sidebar-content-flex-bottom">
            <Divider />
            <div
              className={
                showPanel === "info" ? "item-sidebar-intent" : "item-sidebar"
              }
            >
              {" "}
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Wanna know more about Kana?"
                minimal={false}
                placement={"right"}
                intent={showPanel === "info" ? "primary" : "none"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"info-sign"}
                    onClick={() =>
                      showPanel !== "info"
                        ? setShowPanel("info")
                        : setShowPanel(null)
                    }
                    intent={showPanel === "info" ? "primary" : "none"}
                  ></Button>
                  <span>INFO</span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
            <div className="item-sidebar">
              <Tooltip2
                className={popclass.TOOLTIP2_INDICATOR}
                content="Checkout Kanaverse"
                minimal={false}
                placement={"right"}
              >
                <div className="item-button-group">
                  <Button
                    outlined={false}
                    large={false}
                    minimal={true}
                    fill={true}
                    icon={"git-repo"}
                  ></Button>
                  <span>GITHUB</span>
                </div>
              </Tooltip2>
            </div>
            <Divider />
          </div>
        </div>
        <div className="App-body">
          {showPanel === "new" && <NewAnalysis />}
          {showPanel === "params" && <ParameterSelection />}
          {(showPanel === null || showPanel === undefined) && (
            <NonIdealState
              icon={"control"}
              iconSize={NonIdealStateIconSize.STANDARD}
              title={"Lost all the windows eh?"}
              description={
                <p>
                  My boss told me I can't start an app with an empty screen. So
                  here goes nothing...
                </p>
              }
              children={
                <Card
                  style={{
                    textAlign: "left",
                    width: "70%",
                  }}
                  elevation={Elevation.ZERO}
                >
                  <p>
                    <strong>kana</strong> performs a standard scRNA-seq data
                    analysis directly inside the browser.
                  </p>
                  <p>
                    With just a few clicks, you can get a UMAP/t-SNE, clusters
                    and their marker genes in an intuitive interface for further
                    exploration. No need to transfer data, no need to install
                    software, no need to configure a backend server - just point
                    to a Matrix Market file and we'll analyze <em>your</em> data
                    on <em>your</em> computer, no questions asked.
                  </p>
                  <p>
                    Check out our{" "}
                    <a
                      href="https://github.com/jkanche/scran.js.app"
                      target="_blank"
                    >
                      GitHub page
                    </a>{" "}
                    for more details. Or you could just play around with the app
                    to see what it can do.
                  </p>
                  <H5>Authors</H5>
                  Jayaram Kancherla (
                  <a href="https://github.com/jkanche" target="_blank">
                    <strong>@jkanche</strong>
                  </a>
                  ), Aaron Lun (
                  <a href="https://github.com/LTLA" target="_blank">
                    <strong>@LTLA</strong>
                  </a>
                  )
                </Card>
              }
              action={
                <Button
                  outlined={true}
                  text="Start a New Analysis"
                  icon="plus"
                  intent="primary"
                  onClick={() => setShowPanel("new")}
                />
              }
            />
          )}
        </div>
      </SplitPane>
      {/* {showNewAnalysisDialog && (
        <NewAnalysis
          open={showNewAnalysisDialog}
          setOpen={setShowNewAnalysisDialog}
        />
      )}
      {showLoadAnalysisDialog && (
        <LoadAnalysis
          open={showLoadAnalysisDialog}
          setOpen={setShowLoadAnalysisDialog}
        />
      )}
      {showSaveAnalysisDialog && (
        <SaveAnalysis
          open={showSaveAnalysisDialog}
          setOpen={setShowSaveAnalysisDialog}
        />
      )}
      {showParamDialog && (
        <ParameterSelection
          open={showParamDialog}
          setOpen={setShowParamDialog}
        />
      )} */}
    </div>
  );
}

export default App;
