import { useContext } from 'react';
import { AppContext } from '../../context/AppContext';

const Stats = () => {
    const { initDims, qcDims } = useContext(AppContext);

    return (
        <>
            {
                <span>
                    {initDims ? `: ${initDims}` : " "}
                    {qcDims ?  ` (${qcDims} after QC)` : "" }
                </span>
            }
        </>
    );
};

export default Stats;
