import { Button } from "@blueprintjs/core";
import { useEffect, useRef, useState, useContext } from "react";
import { AppContext } from "../../context/AppContext";

import './ImgPlot.css';

const ImgPlot = (props) => {
    const container = useRef();
    const [title, setTitle] = useState(null);

    const { genesInfo, geneColSel } = useContext(AppContext);

    let data = props?.data;
    let propwidth = props?.width;
    let propheight = props?.height;
    let color = props?.color;

    if (!propwidth) {
        propwidth = 325;
    }

    if (!propheight) {
        propheight = 200
    }

    if (!color) {
        color = "#00B3A4";
    }

    useEffect(() => {
        let containerEL = container.current;
        if (containerEL) {

            if (data?.image) {
                let ctx = containerEL.getContext("2d");

                var img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, propwidth, propheight);
                };
                img.src = data?.image;
                // ctx.putImageData(data?.image, 0, 0);
            }

            let text = ` ${data?.config?.embedding} `
            if (data?.config?.gene) {
                text += `⊃ ${genesInfo[geneColSel][props?.gene]} `
            }

            if (data?.config?.highlight) {
                String(data?.config?.highlight).startsWith("cs") ?
                text += `⊃ Custom Selection ${data?.config?.highlight} `
                : text += `⊃ Cluster ${parseInt(data?.config?.highlight) + 1} `
            }

            setTitle(text);
        }
    }, []);

    return (
        <div className="imgplot-container">
            <h5>{title}</h5>
            <Button small={true} className="imgplot-save" icon="download"
                onClick={() => {
                    let tmpLink = document.createElement("a");
                    tmpLink.href = data?.image;
                    tmpLink.download = `${title.replace("⊃", "").split(" ").join("_")}.png`;
                    tmpLink.click();
                }}>Download</Button>
            <canvas className="imgplot-canvas" width={propwidth} height={propheight} ref={container}></canvas>
        </div>
    );
};

export default ImgPlot;