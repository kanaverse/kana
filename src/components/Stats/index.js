import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const Stats = () => {
    const { initDims, qcDims } = useContext(AppContext);

    return (
        <>
            {
                <span>
                    Dataset dimensions: {initDims ? `${initDims}` : " ???"}
                    {qcDims ?  ` (after QC: ${qcDims})` : "" }
                </span>
            }
        </>
    );
};

export default Stats;
