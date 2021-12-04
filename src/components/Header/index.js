import {
  Alignment,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
} from "@blueprintjs/core";
import React from "react";

// import ImportFilesDialog from '../ImportFiles';
// import InputParamsDialog from '../InputParams';
import AnalysisDialog from '../Analysis';
import Stats from '../Stats';

const Header = (props) => {
  const [state] = React.useState({
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: true,
    enforceFocus: true,
    shouldReturnFocusOnClose: true,
    // usePortal: true,
  });

  return (
    <>
      <Navbar>
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
        </NavbarGroup>
      </Navbar>
    </>
  );
};

export default Header;
