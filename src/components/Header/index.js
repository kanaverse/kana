import {
  Alignment,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
} from "@blueprintjs/core";

import { useState } from 'react';

import AnalysisDialog from '../Analysis';
import Stats from '../Stats';
import Logs from '../Logs';
import IntroDialog from "../Intro";

const Header = () => {
  // state for dialogs
  const [state] = useState({
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: false,
    enforceFocus: true,
    shouldReturnFocusOnClose: true,
  });

  return (
    <>
      <Navbar className="bp3-dark">
        <NavbarGroup className="navbar-group" align={Alignment.LEFT}>

          <NavbarHeading>SCRAN.JS</NavbarHeading>

          <NavbarDivider />
          <span>Analyze Single-cell RNA-seq Datasets</span>
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
