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
                        "range": qcData?.["ranges"]?.[x],
                        "label": x,
                        "transform": x === "proportion" ? ".2" : ".2s",
                        "showLabel": x,
                        "dataTransform": x === "proportion" ? null : "log",
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