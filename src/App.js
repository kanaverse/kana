import { useState } from "react";

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
} from "@blueprintjs/core";

import pkgVersion from "../package.json";

import logo from "./assets/kana-cropped.png";
import "./App.css";

import { AnalysisMode } from "./components/AnalysisMode";
import { ExplorerMode } from "./components/ExploreMode";

function App() {
  // show app modes
  const [showMode, setShowMode] = useState(null);

  return (
    <>
      {showMode === null && (
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
          <NonIdealState
            icon={"playbook"}
            iconSize={NonIdealStateIconSize.STANDARD}
            title={"Choose a mode!"}
            description={
              <div
                style={{
                  textAlign: "left",
                }}
              >
                <p>Kana supports multiple modes -</p>

                <p>
                  <strong>Analysis mode:</strong> Choose this to perform a full
                  single-cell analysis on a dataset.
                </p>

                <p>
                  <strong>Explore mode:</strong> Choose this if you want to load
                  a pre-saved dataset with results. In explore mode, only the
                  marker detection step is computed.
                </p>
              </div>
            }
            action={
              <ButtonGroup>
                <Button
                  large={true}
                  text="Analysis Mode!"
                  icon="function"
                  intent="primary"
                  onClick={() => setShowMode("analysis")}
                />
                <Button
                  large={true}
                  text="Explore Mode!"
                  icon="geosearch"
                  intent="primary"
                  onClick={() => setShowMode("explore")}
                />
              </ButtonGroup>
            }
          />
        </div>
      )}
      {showMode === "analysis" && <AnalysisMode />}
      {showMode === "explore" && <ExplorerMode />}
    </>
  );
}

export default App;
