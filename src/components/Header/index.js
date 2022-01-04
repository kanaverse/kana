import {
  Alignment,
  Button,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
} from "@blueprintjs/core";

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

  const {setExportState} = useContext(AppContext);

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
            title="Import dataset & update parameters (mouseover for more info)"
            buttonText="Start Analysis"
            includeFooter={true}
            {...state} />
          <NavbarDivider />

          <Stats />
          <NavbarDivider />

          <Button intent="warning"
          onClick={() => {
            setExportState(true);
          }}>Export Analysis</Button>
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
