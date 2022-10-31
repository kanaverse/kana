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

import pkgVersion from "../../../package.json";

import logo from "./kana-cropped.png";

const Header = (props) => {
  // state for dialogs
  const [state] = useState({
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: false,
    enforceFocus: true,
    shouldReturnFocusOnClose: true,
    hasBackdrop: true,
    position: Position.LEFT,
    usePortal: true,
    size: '75vw',
  });

  const { datasetName, setDatasetName } = useContext(AppContext);
  // app open inputs
  const [openInput, setOpenInput] = useState(false);

  return (
    <>
      <Navbar className="bp3-dark">
        <NavbarGroup className="navbar-group" align={Alignment.LEFT}>

          <NavbarHeading>{<img height="25px" src={logo}></img>} <span style={{
            fontSize: "8px"
          }}>v{pkgVersion.version}</span></NavbarHeading>

          <NavbarDivider />
          <span>Single cell RNA-seq analysis in the browser</span>
          <NavbarDivider />

          <AnalysisDialog
            icon="document"
            title="Import dataset & update parameters (mouseover for info)"
            buttonText="Start Analysis"
            includeFooter={true}
            openInput={openInput}
            {...state}
            kanaIDBRecs={props?.kanaIDBRecs}
            setKanaIDBRecs={props?.setKanaIDBRecs}
            deletekdb={props?.deletekdb}
            setDeletekdb={props?.setDeletekdb} />

          <NavbarDivider />

          <Tooltip2 content="Modify the dataset title here." position={Position.BOTTOM}>
            <EditableText value={datasetName} intent="primary"
              onConfirm={(val) => { setDatasetName(val) }}
              onChange={(val) => { setDatasetName(val) }} />
          </Tooltip2>

          <Stats initDims={props?.initDims} qcDims={props?.qcDims} />
          <NavbarDivider />

          <Tooltip2 content="Save the analysis, either in your browser's cache or to a file on your computer." position={Position.BOTTOM}>
            <ButtonGroup>
              <Popover2 content={
                <Menu>
                  <MenuItem text="Save to browser" icon="floppy-disk"
                    onClick={() => {
                      props?.setIndexedDBState(true);
                    }} />
                  <MenuItem text="Download to file" icon="download"
                    onClick={() => {
                      props?.setExportState(true);
                    }} />
                </Menu>
              } placement="bottom-start">
                <Button intent="warning" rightIcon="caret-down" text="Export" />
              </Popover2>
            </ButtonGroup>
          </Tooltip2>
          <NavbarDivider />

          <Tooltip2 content="What's happening under the hood? See the blow-by-blow logs as the analysis runs." position={Position.BOTTOM}>
            <Logs logs={props?.logs} loadingStatus={props?.loadingStatus}/>
          </Tooltip2>
          <NavbarDivider />

          <IntroDialog
            icon={<img height="20px" src={logo}></img>}
            title="&nbsp; Single-cell RNA-seq analysis in the browser"
            isOpen={true}
            setOpenInput={setOpenInput}
            {...state}
          />
        </NavbarGroup>
      </Navbar>
    </>
  );
};

export default React.memo(Header);
