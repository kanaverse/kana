import { useEffect, useRef, useContext, useState } from 'react';
import { ControlGroup, Button, HTMLSelect, InputGroup } from "@blueprintjs/core";

import { AppContext } from '../../context/AppContext';

const MarkerPlot = () => {

    const { plotRedDims, redDims, defaultRedDims } = useContext(AppContext);

    return (
        <>
            <Button minimal={true}>Gene </Button>
        </>
    );
};

export default MarkerPlot;