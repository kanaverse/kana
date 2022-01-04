import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const Stats = () => {
    const { initDims, qcDims } = useContext(AppContext);

    return (
        <>
            {
                <span>
                    Dataset dimensions: {initDims}
                    {qcDims ?
                        ` (After QC: ${qcDims})` :
                        " (After QC: ??? cells)"
                    }
                </span>
            }
        </>
    );
};

export default Stats;
