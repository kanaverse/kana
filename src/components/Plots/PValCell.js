import { useRef } from "react";
import * as d3 from "d3";

// similar to cell, but fills the entire div,
// width is not controlled in this case
const PvalCell = (props) => {
  const container = useRef();

  let propwidth = props?.width;
  let score = props?.score;

  const detectedScale = d3
    .scaleSequential(d3.interpolateRdYlBu)
    .domain([0, 1]);

  if (!propwidth) {
    propwidth = "100%";
  }

  return (
    <div
      ref={container}
      style={{
        width: propwidth,
        height: "15px",
        margin: "1px",
        border: "1px solid gainsboro",
        alignItems: "center",
        backgroundColor: detectedScale(score),
      }}
    >
      <div
        style={{
          width: "100%",
          backgroundColor: detectedScale(score),
          height: "100%",
        }}
      ></div>
    </div>
  );
};

export default PvalCell;
