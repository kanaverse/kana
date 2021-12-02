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
    usePortal: true,
});

  return (
    <>
      <Navbar>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading>SCRAN.JS</NavbarHeading>
          <NavbarDivider />
          <span>Analyze Single-cell Datasets in the Browser</span>
          <NavbarDivider />
          {/* <Button className={Classes.MINIMAL} icon="home" text="Home" /> */}
          <AnalysisDialog 
            icon="document"
            title="Import Single-cell data and Start Analysis"
            buttonText="Start Analysis"
            includeFooter={true}
            {...state}/>
            <NavbarDivider />
                        <Stats />
          {/* <ImportFilesDialog
            icon="document"
            title="Import Single-cell data"
            buttonText="Import Single-cell data"
            includeFooter={true}
            {...state}
          />
          <NavbarDivider />
          <InputParamsDialog
            icon="document"
            title="Update Analysis"
            buttonText="Update Analysis"
            includeFooter={true}
            {...state}
          /> */}
        </NavbarGroup>
      </Navbar>
    </>
  );
};

export default Header;
