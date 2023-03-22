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
            <div style={{ textAlign: "left", alignItems: "flex-start" }}>
              <H2>Kana supports multiple modes</H2>
            </div>
            <div className="frontpage-row">
              <Callout
                title="Analysis Mode"
                onClick={() => setAppMode("analysis")}
                className="frontpage-rowitem"
                icon="function"
                intent="primary"
              >
                <p>
                  In this mode, <strong>kana</strong> performs a standard
                  single-cell data analysis directly inside the browser.
                </p>
                <p>
                  With just a few clicks, you can get a UMAP/t-SNE, clusters and
                  their marker genes in an intuitive interface for further
                  exploration. No need to transfer data, no need to install
                  software, no need to configure a backend server - just point
                  to one of our supported file formats and we'll analyze{" "}
                  <strong>
                    <em>your</em>
                  </strong>{" "}
                  data on{" "}
                  <strong>
                    <em>your</em>
                  </strong>{" "}
                  computer, no questions asked.
                </p>
              </Callout>
              <Callout
                title="Explore Mode"
                onClick={() => setAppMode("explore")}
                className="frontpage-rowitem"
                icon="geosearch"
                intent="warning"
              >
                <p>
                  Choose this if you want to load a pre-saved dataset with
                  results. In explore mode, only the marker detection step is
                  computed.
                </p>
              </Callout>
            </div>
            <div className="frontpage-row">
              <Card elevation={Elevation.ZERO}>
                <p>
                  Check out our{" "}
                  <a href="https://github.com/kanaverse" target="_blank">
                    GitHub page
                  </a>{" "}
                  for more details.
                </p>
                <p>
                  If you are paper-savvy, read our manuscript on{" "}
                  <a href="Checkout our preprint on bioRxiv">bioRxiv</a>.
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
