import {
  Alignment,
  Button,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  ButtonGroup,
  Menu,
  MenuItem,
  EditableText,
  Position
} from "@blueprintjs/core";

import { Popover2, Tooltip2 } from "@blueprintjs/popover2";

import React, { useContext, useState } from 'react';

import AnalysisDialog from '../Analysis';
import Stats from '../Stats';
import Logs from '../Logs';
import IntroDialog from "../Intro";

import { AppContext } from "../../context/AppContext";

const Header = () => {
  // state for dialogs
  const [state] = useState({
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: false,
    enforceFocus: false,
    shouldReturnFocusOnClose: true,
  });

  const { setExportState, datasetName, setDatasetName, setIndexedDBState } = useContext(AppContext);

  return (
    <>
      <Navbar className="bp3-dark">
        <NavbarGroup className="navbar-group" align={Alignment.LEFT}>

          <NavbarHeading>kana</NavbarHeading>

          <NavbarDivider />
          <span>Single cell RNA-seq analysis in the browser</span>
          <NavbarDivider />

          <AnalysisDialog
            icon="document"
            title="Import dataset & update parameters (mouseover for info)"
            buttonText="Start Analysis"
            includeFooter={true}
            {...state} />

          <NavbarDivider />

          <Tooltip2 content="Modify dataset title" position={Position.BOTTOM}>
            <EditableText value={datasetName} intent="primary"
              onConfirm={(val) => { setDatasetName(val) }} />
          </Tooltip2>

          <Stats />
          <NavbarDivider />

          <Tooltip2 content="Save Analysis" position={Position.BOTTOM}>
            <ButtonGroup>
              <Popover2 content={
                <Menu>
                  <MenuItem text="Save" icon="floppy-disk"
                    onClick={() => {
                      setIndexedDBState(true);
                    }} />
                  <MenuItem text="Download" icon="download"
                    onClick={() => {
                      setExportState(true);
                    }} />
                </Menu>
              } placement="bottom-start">
                <Button intent="warning" rightIcon="caret-down" text="Export" />
              </Popover2>
            </ButtonGroup>
          </Tooltip2>
          <NavbarDivider />

          <Tooltip2 content="Whats happening ?" position={Position.BOTTOM}>
            <Logs />
          </Tooltip2>
          <NavbarDivider />

          <IntroDialog
            icon="document"
            title="Single-cell RNA-seq analysis in the browser"
            isOpen={true}
            {...state}
          />
        </NavbarGroup>
      </Navbar>
    </>
  );
};

export default React.memo(Header);
