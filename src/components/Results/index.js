import { useState, useCallback, useContext, useEffect } from "react";

import {
  Label,
  Text,
  HTMLSelect,
  Card,
  Elevation,
  Button,
  Divider,
  Callout,
  H2,
  Collapse,
  H5,
  InputGroup,
  Switch,
  NumericInput,
  Checkbox,
} from "@blueprintjs/core";
import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";
import { ResizeEntry, ResizeSensor } from "@blueprintjs/core";

import "./index.css";

import { AppContext } from "../../context/AppContext";

import DimPlot from "../Plots/DimPlot";

import SplitPane from "react-split-pane";

export function AnnResults() {
  const [windowWidth, setWindowWidth] = useState(0);

  const handleResize = () => {
    setWindowWidth(window.innerWidth);
  };

  useEffect(() => {}, []);
  return (
    <ResizeSensor onResize={handleResize}>
      <SplitPane
        defaultSize="80%"
        split={windowWidth >= 900 ? "vertical" : "horizontal"}
      >
        <SplitPane
          defaultSize="30%"
          minSize={200}
          split="vertical"
          primary="second"
        >
          <div className="results-dims">dims</div>
          <div className="results-markers">markers</div>
        </SplitPane>
        <div className="results-gallery">gallery?</div>
      </SplitPane>
    </ResizeSensor>
  );
}
