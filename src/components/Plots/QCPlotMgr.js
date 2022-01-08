import ViolinPlotBasic from './ViolinPlotBasic';
import './QCPlots.css';
import React from 'react';
import { useEffect, useState } from 'react';

// shows the QC plots for sums, detected and proportion
// transforms data to a log scale or %
const QCPlotMgr = (props) => {

    const [qcData, setQCData] = useState(null);

    useEffect(() => {
        setQCData(props.data);
    }, [props]);

    return (
        qcData && <div className="qc-plots">
            {
                ["sums", "detected", "proportion"].map(x => {
                    const props2 = {
                        "threshold": qcData?.["thresholds"]?.[x],
                        "range": [qcData?.["ranges"]?.[x][0] == 0 ? -0.1 : qcData?.["ranges"]?.[x][0], qcData?.["ranges"]?.[x][1]],
                        "label": x,
                        "transform": x === "proportion" ? ".2" : ".2s",
                        "showLabel": x,
                        "rdata": qcData?.["data"]?.[x]
                    }
                    return (
                        <div key={x}>
                            <ViolinPlotBasic
                                filename={props?.title + "_" + x + ".png"} {...props2} />
                        </div>)
                })
            }
        </div>
    );
};

export default React.memo(QCPlotMgr);