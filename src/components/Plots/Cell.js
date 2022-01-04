import { useRef } from "react";

// uses two divs to fill out bars given various props
const Cell = (props) => {
    const container = useRef();

    let propwidth = props?.width;
    let minmax = props?.minmax;
    let score = props?.score;
    let colorscale = props?.colorscale;
    let colorscore = props?.colorscore;
    let color = props?.color;

    let percWidth = ((score - minmax[0]) / (minmax[1] - minmax[0]));

    if (!propwidth) {
        propwidth = "100%";
    }

    if (!color) {
        color = "#00B3A4";
    }

    return (
        <div ref={container}
            style={{
                width: propwidth, height: '15px',
                margin: '5px', border: '1px solid gainsboro',
                alignItems: 'center'
            }}>
            {colorscale ?
                <div style={{
                    width: `${colorscore * 100}%`,
                    backgroundColor: colorscale(colorscore),
                    height: '100%'
                }}></div>
                :
                <div style={{
                    width: `${percWidth * 100}%`,
                    backgroundColor: color,
                    height: '100%'
                }}>
                </div>
            }
        </div>
    );
};

export default Cell;