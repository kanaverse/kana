import ViolinPlotBasic from './ViolinPlotBasic';
import './QCPlots.css';
import React from 'react';

// shows the QC plots for sums, detected and proportion
// transforms data to a log scale or %
const QCPlotMgr = (props) => {

    let qcData = props.data;

    return (
        <div className="qc-plots">
            {
                ["sums", "detected", "proportion"].map(x => {
                    const props2 = {
                        "threshold": x !== "proportion" ?
                        Math.log2(qcData?.["thresholds"]?.[x]) : qcData?.["thresholds"]?.[x] * 100,
                        "range": x !== "proportion" ? 
                            qcData?.["ranges"]?.[x].map((x) => Math.log2(x + 1)) :
                            qcData?.["ranges"]?.[x].map((x) => x * 100),
                        "label": x,
                        "transform": x !== "proportion" ? "log" : "perc",
                        "showLabel": x !== "proportion" ? 
                        x: x,
                        "rdata": x !== "proportion" ? 
                            qcData?.["data"]?.[x].map((x) => Math.log2(x + 1)) :
                            qcData?.["data"]?.[x].map((x) => x * 100)
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