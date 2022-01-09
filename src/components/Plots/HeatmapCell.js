import { useRef } from "react";
import * as d3 from 'd3';

// similar to cell, but fills the entire div, 
// width is not controlled in this case
const HeatmapCell = (props) => {
    const container = useRef();

    let propwidth = props?.width;
    let score = props?.score;
    let minmax = props?.minmax;

    // inverted scale - blue for +ve, red for -ve
    var lower = minmax[0];
    var upper = minmax[1];

    var limit = 0;
    if (lower < 0) {
        limit = -lower;
    }
    if (upper > 0 && upper > limit) {
        limit = upper;
    }
    const detectedScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([limit, -limit]);

    if (!propwidth) {
        propwidth = "100%";
    }

    return (
        <div ref={container}
            style={{
                width: propwidth, height: '15px',
                margin: '1px', border: '1px solid gainsboro',
                alignItems: 'center',
                backgroundColor: detectedScale(score)
            }}>
            <div style={{
                width: '100%',
                backgroundColor: detectedScale(score),
                height: '100%'
            }}></div>
        </div>
    );
};

export default HeatmapCell;
