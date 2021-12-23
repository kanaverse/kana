import { useRef } from "react";

const Cell = (props) => {
    const container = useRef();

    let propwidth = props?.width;
    let minmax = props?.minmax;
    let colorscale = props?.colorscale;
    let score = props?.score;
    let colorscore = props?.colorscore;

    let percWidth = ((score - minmax[0]) / minmax[1]);

    if (!propwidth) {
        propwidth = "100%";
    }

    return (
        <div ref={container} 
            style={{ width: propwidth, height:'66%', 
                    margin:'5px', border: '1px solid gainsboro',
                    alignItems: 'center' }}>
            <div style={{ width: `${colorscore * 100}%`, 
                backgroundColor: colorscale(percWidth), 
                height: '100%', opacity: percWidth }}></div>
        </div>
    );
};

export default Cell;