import { Label } from "@blueprintjs/core";
import { useEffect, useRef } from "react";

const ImgPlot = (props) => {
    const container = useRef();

    // useEffect(() => {
    let data = props?.data;
    let propwidth = props?.width;
    let color = props?.color;

    if (!propwidth) {
        propwidth = 325;
    }

    if (!color) {
        color = "#00B3A4";
    }

    if (!data) return "";

    if (data?.image) {
        let containerEL = container.current;
        let ctx = containerEL.getContext("2d");

        var img = new Image;
        img.onload = function () {
            ctx.drawImage(img, 0, 0);
        };
        img.src = data?.image;
        // ctx.putImageData(data?.image, 0, 0);
    }

    let text = ` ${data?.embedding} `
    if (data?.gene) {
        text += `> ${data?.gene} `
    }

    if (data?.highlight) {
        text += `> ${data?.highlight} `
    }

    // }, []);

    return (
        <div>
            <Label>{text}</Label>
            <canvas width="300" height="250" ref={container}></canvas>
        </div>
    );
};

export default ImgPlot;