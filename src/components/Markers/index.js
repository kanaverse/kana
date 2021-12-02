import { ScatterGL } from 'scatter-gl';
import { useEffect, useRef, useContext, useState } from 'react';
import { ControlGroup, Button, HTMLSelect, InputGroup } from "@blueprintjs/core";
import { Classes, Popover2 } from "@blueprintjs/popover2";

import { AppContext } from '../../context/AppContext';

import { randomColor } from 'randomcolor';

const MarkerPlot = () => {
    const container = useRef();
    const [scatterplot, setScatterplot] = useState(null);

    const { plotRedDims, redDims, defaultRedDims } = useContext(AppContext);

    return (
        <>

        </>
    );
};

export default MarkerPlot;