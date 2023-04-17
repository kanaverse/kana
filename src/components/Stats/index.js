const Stats = (props) => {
  return (
    <span>
      {props?.initDims ? `: ${props?.initDims}` : " "}
      {props?.qcDims ? ` (${props?.qcDims} after QC)` : ""}
      {props?.headerInfo}
    </span>
  );
};

export default Stats;
