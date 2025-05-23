// kana/src/App.js
import { useContext } from "react";

import {
  Alignment,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Classes,
  Callout,
  H2,
  Card,
  Icon,
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
import { resetApp } from "./utils/utils";

function App() {
  const { appMode, setAppMode, setLoadZiesel } = useContext(AppContext);

  return (
    <>
      {appMode === null && (
        <div className="App">
          <Navbar className={Classes.DARK}>
            <NavbarGroup align={Alignment.LEFT}>
              <NavbarHeading>
                <div style={{ cursor: "pointer" }} onClick={resetApp}>
                  <img height="20px" src={logo} alt="Kana logo"></img>{" "}
                  <span
                    style={{
                      fontSize: "8px",
                    }}
                  >
                    v{pkgVersion.version}
                  </span>
                </div>
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
                alt="Kana animation"
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
                <a
                  href="https://github.com/kanaverse"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub page
                </a>
                ,{" "}
                <a
                  href="https://doi.org/10.1101/2022.03.02.482701"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  bioRxiv manuscript
                </a>{" "}
                or{" "}
                <a
                  hred="https://doi.org/10.21105/joss.05603"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  JOSS publication
                </a>{" "}
                for more details.
              </p>
              <p>
                Download some of our test datasets{" "}
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/kanaverse/random-test-files/releases"
                >
                  here
                </a>{" "}
                to try us out.
              </p>
            </div>
            <div className="frontpage-actions">
              {window.navigator.userAgent.toLowerCase().indexOf("macintosh") !==
                -1 &&
                window.navigator.userAgent.toLowerCase().indexOf("safari") !==
                  -1 &&
                window.navigator.userAgent.toLowerCase().indexOf("firefox") ===
                  -1 &&
                window.navigator.userAgent.toLowerCase().indexOf("chrome") ===
                  -1 && (
                  <>
                    <Callout
                      title="For Safari users"
                      className="frontpage-rowitem-danger"
                      icon="warning-sign"
                      intent="danger"
                    >
                      <p>
                        <strong>Kana</strong> relies on some web standards that
                        are not supported by old versions of Safari. If you run
                        into any issues, try updating Safari to version 16.4 or
                        higher, or switch to Chrome or Firefox.
                      </p>
                    </Callout>
                    {window.location.href.startsWith("http://") && (
                      <Callout
                        title="Detected HTTP access"
                        className="frontpage-rowitem-danger"
                        icon="warning-sign"
                        intent="danger"
                      >
                        <p>
                          <strong>Kana</strong> does not work in HTTP mode.{" "}
                          <a href="https://kanaverse.org/kana">Click here</a> to
                          manually redirect to the HTTPS version.
                        </p>
                      </Callout>
                    )}
                  </>
                )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  width: "100%",
                }}
              >
                <Card
                  interactive={true}
                  elevation={Elevation.TWO}
                  onClick={() => setAppMode("analysis")}
                  style={{ cursor: "pointer" }}
                >
                  <H5>
                    <Icon
                      icon="function"
                      intent="primary"
                      style={{ marginRight: "10px" }}
                    />
                    Analyze new dataset
                  </H5>
                  <p>
                    Provide a single-cell dataset and <strong>kana</strong> will
                    perform a standard analysis. Get UMAPs, t-SNEs, clusters,
                    and marker genes.
                  </p>
                </Card>
                <Card
                  interactive={true}
                  elevation={Elevation.TWO}
                  onClick={() => setAppMode("explore")}
                  style={{ cursor: "pointer" }}
                >
                  <H5>
                    <Icon
                      icon="geosearch"
                      intent="success"
                      style={{ marginRight: "10px" }}
                    />
                    Explore existing results
                  </H5>
                  <p>
                    Load a pre-analyzed dataset to explore existing UMAPs,
                    t-SNEs, clusters, and marker genes.
                  </p>
                </Card>
                <Card
                  interactive={true}
                  elevation={Elevation.TWO}
                  onClick={() => {
                    setAppMode("analysis");
                    setLoadZiesel(true);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <H5>
                    <Icon
                      icon="clean"
                      intent="warning"
                      style={{ marginRight: "10px" }}
                    />
                    Try with Zeisel dataset
                  </H5>
                  <p>
                    Quickly try <strong>kana</strong> using the Zeisel mouse
                    brain dataset from Bioconductor's ExperimentHub. No setup
                    required!
                  </p>
                </Card>
                <Card
                  interactive={true}
                  elevation={Elevation.TWO}
                  onClick={() => {
                    window.open("https://jkanche.com/kana", "_blank");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <H5>
                    <Icon icon="history" style={{ marginRight: "10px" }} />
                    Access Old Version (2.0)
                  </H5>
                  <p>
                    Need to go back? The previous version of{" "}
                    <strong>kana</strong> is still available.
                  </p>
                </Card>
              </div>
            </div>
            <div className="frontpage-footer">
              Kana is developed by Jayaram Kancherla (
              <a
                href="https://github.com/jkanche"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>@jkanche</strong>
              </a>
              ), Aaron Lun (
              <a
                href="https://github.com/LTLA"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>@LTLA</strong>
              </a>
              ).
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
