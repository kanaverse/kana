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
} from "@blueprintjs/core";

import pkgVersion from "../package.json";

import logo from "./assets/kana-cropped.png";
import gif from "./assets/logo.gif";

import "./App.css";

import { AnalysisMode } from "./components/AnalysisMode";
import { ExplorerMode } from "./components/ExploreMode";

import { AppContext } from "./context/AppContext";

function App() {
  const { appMode, setAppMode, setLoadZiesel } = useContext(AppContext);

  return (
    <>
      {appMode === null && (
        <div className="App">
          <Navbar className={Classes.DARK}>
            <NavbarGroup align={Alignment.LEFT}>
              <NavbarHeading>
                <div style={{ cursor: "pointer" }} onClick={setAppMode(null)}>
                  <img height="20px" src={logo}></img>{" "}
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
              <p>
                Download some of our test datasets{" "}
                <a
                  target="_blank"
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
                        <strong>Kana</strong> relies on some web standards that are not supported by old versions of Safari.
                        If you run into any issues, try updating Safari to version 16.4 or higher, or switch to Chrome or Firefox.
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
              <Callout
                title="I want to analyze a new dataset"
                onClick={() => setAppMode("analysis")}
                className="frontpage-rowitem"
                icon="function"
                intent="primary"
                style={{ cursor: "pointer" }}
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
                style={{ cursor: "pointer" }}
              >
                <p>
                  Provide a pre-analyzed single-cell dataset in one of the
                  accepted formats and <strong>kana</strong> will load the
                  existing results into the browser for further exploration.
                </p>
              </Callout>
              <Callout
                title="I just want to try it out"
                onClick={() => {
                  setAppMode("analysis");
                  setLoadZiesel(true);
                }}
                className="frontpage-rowitem"
                icon="clean"
                intent="warning"
                style={{ cursor: "pointer" }}
              >
                <p>
                  Try out <strong>kana</strong> using the Zeisel mouse brain
                  dataset from Bioconductor's ExperimentHub. No lock-in
                  contract, no credit check required.
                </p>
              </Callout>
              <Callout
                title="I want to go back to the old version!"
                onClick={() => {
                  window.open("https://jkanche.com/kana", "_blank");
                }}
                className="frontpage-rowitem"
                icon="heart-broken"
                style={{ cursor: "pointer" }}
              >
                <p>
                  Sometimes it's time to move on, but for all other times,
                  there's <strong>kana</strong> <em>2.0</em>.
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
