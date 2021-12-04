import { useEffect, useRef, useContext, useState } from 'react';
import { ControlGroup, Button, HTMLSelect, InputGroup, Icon } from "@blueprintjs/core";
import { Classes, Popover2 } from "@blueprintjs/popover2";
import BoxPlot from './BoxPlot';

import { AppContext } from '../../context/AppContext';

import './QCPlots.css';

const QCPlotMgr = (props) => {
    console.log("props", props);

    const { qcData } = useContext(AppContext);
    console.log("qcData", qcData);

    return (
        <div className="qc-plots">
            {
                ["sums", "detected"].map(x => {
                    const props = {
                        "threshold": qcData["thresholds"][x],
                        "range": qcData["ranges"][x],
                        "data": qcData[x],
                        "label": x
                    }
                    return <div><BoxPlot {...props}/></div>
                })
            }
        </div>
    );
};

export default QCPlotMgr;