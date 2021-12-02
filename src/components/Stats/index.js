import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const Stats = (props) => {
    const { initDims, qcDims } = useContext(AppContext);

    return (
        <>
            <span>
                {
                    initDims ? (
                        <span>
                        Dataset Dims: {initDims}
                        {qcDims ?
                            ` (After QC: ${qcDims})` :
                                    " (After QC: ??? X ???)"
                                }
                        </span>
                    ) : ""
                }
            </span>
            {/* <Card icon="info-sign" interactive={false} elevation={Elevation.TWO}>
                <H5>Dataset Info</H5>
                {
                    initDims ? (
                        <>
                            <p> Dataset Dimensions:
                                {initDims ?
                                    ` ${initDims}` :
                                    " ??? X ???"
                                }
                            </p>
                            <p>After QC:
                                {qcDims ?
                                    ` ${qcDims}` :
                                    " ??? X ???"
                                }
                            </p>
                            <p>After feature sel:
                                {fSelDims ?
                                    ` ${fSelDims}` :
                                    " ??? X ???"
                                }
                            </p>
                        </>
                    ) :
                        "Please Import a dataset to see stats."
                }
            </Card> */}
        </>
    );
};

export default Stats;
