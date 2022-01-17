const Stats = (props) => {

    return (
        <>
            {
                <span>
                    {props?.initDims ? `: ${props?.initDims}` : " "}
                    {props?.qcDims ?  ` (${props?.qcDims} after QC)` : "" }
                </span>
            }
        </>
    );
};

export default Stats;
