import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const Stats = () => {
    const { initDims, qcDims } = useContext(AppContext);

    return (
        <>
            {
                <span>
                    Dataset Dims: {initDims}
                    {qcDims ?
                        ` (After QC: ${qcDims})` :
                        " (After QC: ??? X ???)"
                    }
                </span>
            }
        </>
    );
};

export default Stats;
