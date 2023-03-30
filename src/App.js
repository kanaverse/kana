import { useState, useContext } from "react";

import {
  Alignment,
  Button,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  ButtonGroup,
  Classes,
  NonIdealState,
  NonIdealStateIconSize,
  Callout,
  Code,
  H2,
  Card,
  H5,
  Elevation,
} from "@blueprintjs/core";

import pkgVersion from "../package.json";

import logo from "./assets/kana-cropped.png";
import gif from "./assets/logo.gif";

import "./App.css";

import { AnalysisMode } from "./components/AnalysisMode";
import { ExplorerMode } from "./components/ExploreMode";

import { AppContext } from "./context/AppContext";

function App() {
  const { appMode, setAppMode } = useContext(AppContext);

  return (
    <>
      {appMode === null && (
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
          <div className="frontpage">
            <div className="frontpage-logo">
              <img
                src={gif}
                style={{ border: "5px solid #eeeeee" }}
                width={245}
                height={245}
              />
            </div>
            <div className="frontpage-content">
              <H2>Analyze single-cell datasets in the browser</H2>
              <p>
                <strong>kana</strong> uses WebAssembly and other technologies to
                efficiently analyze large single-cell datasets in the browser.
              </p>
              <ul>
                <li>Always free. It's your analysis running on your device.</li>
                <li>
                  Always available. Because science can't wait for server
                  outages.
                </li>
                <li>Always private. Data never, ever leaves your computer.</li>
              </ul>
              <p>
                Check out our{" "}
                <a href="https://github.com/kanaverse" target="_blank">
                  GitHub page
                </a>{" "}
                or our{" "}
                <a
                  href="https://doi.org/10.1101/2022.03.02.482701"
                  target="_blank"
                >
                  bioRxiv manuscript
                </a>{" "}
                for more details.
              </p>
            </div>
            <div className="frontpage-actions">
              <Callout
                title="I want to analyze a new dataset"
                onClick={() => setAppMode("analysis")}
                className="frontpage-rowitem"
                icon="function"
                intent="primary"
              >
                <p>
                  Provide a single-cell dataset in one of the accepted formats
                  and <strong>kana</strong> will perform a standard single-cell
                  data analysis. Get your UMAPs, t-SNEs, clusters and marker
                  genes with a click of a button.
                </p>
              </Callout>
              <Callout
                title="I want to explore existing analysis results"
                onClick={() => setAppMode("explore")}
                className="frontpage-rowitem"
                icon="geosearch"
                intent="success"
              >
                <p>
                  Provide a pre-analyzed single-cell dataset in one of the
                  accepted formats and <strong>kana</strong> will load the
                  existing results into the browser for further exploration.
                </p>
              </Callout>
            </div>
          </div>
        </div>
      )}
      {appMode === "analysis" && <AnalysisMode />}
      {appMode === "explore" && <ExplorerMode />}
    </>
  );
}

export default App;
