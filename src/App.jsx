import { useState } from "react";
import logo from "./assets/kana-cropped.png";
import "./App.css";
import {
  Alignment,
  Button,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  ButtonGroup,
  Menu,
  Classes,
  MenuItem,
  EditableText,
  Position,
} from "@blueprintjs/core";

import { Popover2, Tooltip2 } from "@blueprintjs/popover2";

import pkgVersion from "../package.json";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <Navbar className={Classes.DARK}>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading>
            {<img height="25px" src={logo}></img>}{" "}
            <span
              style={{
                fontSize: "8px",
              }}
            >
              v{pkgVersion.version}
            </span>
          </NavbarHeading>

          <NavbarDivider />
          <span>Single cell RNA-seq analysis in the browser</span>
          <NavbarDivider />

          <Popover2
            content={
              <Menu>
                <MenuItem text="New Analysis" icon="floppy-disk" />
                <MenuItem text="Load Analysis" icon="download" />
              </Menu>
            }
            placement="bottom-start"
          >
            <Button intent="warning" rightIcon="caret-down" text="Start here" />
          </Popover2>

          {/* <Tooltip2
            content="Modify the dataset title here."
            position={Position.BOTTOM}
          >
            <EditableText
              value={"new analysis"}
              intent="primary"
              onConfirm={(val) => {
                console.log(val);
              }}
              onChange={(val) => {
                console.log(val);
              }}
            />
          </Tooltip2> */}
        </NavbarGroup>
        <NavbarGroup align={Alignment.RIGHT}>
          <Tooltip2
            content="What's happening under the hood? See the blow-by-blow logs as the analysis runs."
            position={Position.BOTTOM}
          >
            <Button icon="wrench" outlined={true} intent="warning"></Button>
          </Tooltip2>
          <NavbarDivider />

          <Button icon="info-sign" intent="primary" text="" />
        </NavbarGroup>
      </Navbar>
      <div className="App-body">
        <div className="left-sidebar">
          <ButtonGroup style={{ minWidth: 47 }} fill={true} vertical={true}>
            <Button icon="database" text={"Quality Control"} />
            <Button icon="function" text={"Feature Selection"} />
            <Button icon="function" text={"Principal components analysis"} />
            <Button icon="function" text={"Batch Correction"} />
            <Button icon="function" text={"Clustering"} />
            <Button icon="function" text={"t-SNE"} />
            <Button icon="function" text={"UMAP"} />
            <Button icon="function" text={"Celltype Annotation"} />
            <Button icon="function" text={"Neighbor Search"} />
          </ButtonGroup>
        </div>
        <div className="content">
          <div className="embeddings">
            <p>embeddings</p>
          </div>
          <div className="markers">
            <p>markers</p>
          </div>
          <div className="gallery">
            <p>gallery</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
