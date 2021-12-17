import {
  Alignment,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
} from "@blueprintjs/core";

import { useState, useContext } from 'react';

// import ImportFilesDialog from '../ImportFiles';
// import InputParamsDialog from '../InputParams';
import AnalysisDialog from '../Analysis';
import Stats from '../Stats';
import Logs from '../Logs';


const Header = (props) => {
  const [state] = useState({
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: true,
    enforceFocus: true,
    shouldReturnFocusOnClose: true,
    // usePortal: true,
  });

  return (
    <>
      <Navbar className="bp3-dark">
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading>SCRAN.JS</NavbarHeading>
          <NavbarDivider />
          <span>Analyze Single-cell RNA-seq Datasets</span>
          <NavbarDivider />
          {/* <Button className={Classes.MINIMAL} icon="home" text="Home" /> */}
          <AnalysisDialog
            icon="document"
            title="Import dataset and update parameters"
            buttonText="Start Analysis"
            includeFooter={true}
            {...state} />
          <NavbarDivider />
          <Stats />
          <Logs />
        </NavbarGroup>
      </Navbar>
    </>
  );
};

export default Header;
