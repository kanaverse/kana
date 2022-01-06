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
  EditableText
} from "@blueprintjs/core";

import { Popover2, Tooltip2 } from "@blueprintjs/popover2";

import { useContext, useState } from 'react';

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
    enforceFocus: true,
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

          <Tooltip2 content="Modify dataset title">
            <EditableText defaultValue={datasetName} intent="primary"
              onConfirm={(val) => { setDatasetName(val) }} />
          </Tooltip2>

          <Stats />
          <NavbarDivider />

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
          <NavbarDivider />

          <Logs />
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

export default Header;
