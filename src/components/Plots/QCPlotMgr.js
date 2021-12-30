import ViolinPlotBasic from './ViolinPlotBasic';
import './QCPlots.css';

const QCPlotMgr = (props) => {

    let qcData = props.data;

    return (
        <div className="qc-plots">
            {
                ["sums", "detected", "proportion"].map(x => {
                    const props2 = {
                        "threshold": qcData?.["thresholds"]?.[x],
                        "range": qcData?.["ranges"]?.[x],
                        "label": x,
                        "rdata": qcData?.["data"]?.[x]
                    }
                    return (
                        <div key={x}>
                            <ViolinPlotBasic {...props2} />
                        </div>)
                })
            }
        </div>
    );
};

export default QCPlotMgr;