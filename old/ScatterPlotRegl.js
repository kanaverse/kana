import createScatterplot from 'regl-scatterplot';
import { useEffect, useRef, useContext, useState } from 'react';
import { AppContext } from '../../context/AppContext';

import {randomColor} from 'randomcolor';
import {scaleLinear} from 'd3-scale';

const DimPlot = (props) => {
    const canvas = useRef();
    const [scatterplot, setScatterplot] = useState(null);

    // settings for scatter-plot
    const opacity = 1;
    let selection = [], points = [];

    const lassoMinDelay = 0;
    const lassoMinDist = 2;
    const showReticle = false;
    const reticleColor = [1, 1, 0.878431373, 0.33];
    const pointSize = 200;
    const pointOutlineWidth = 2;
    const cameraDistance = 3;
    const colorsScale = [
        '#002072', // dark blue
        '#162b79',
        '#233680',
        '#2e4186',
        '#394d8d',
        '#425894',
        '#4b649a',
        '#5570a1',
        '#5e7ca7',
        '#6789ae',
        '#7195b4',
        '#7ba2ba',
        '#85aec0',
        '#90bbc6',
        '#9cc7cc',
        '#a9d4d2',
        '#b8e0d7',
        '#c8ecdc',
        '#ddf7df',
        '#ffffe0', // bright yellow
      ];

    const pointoverHandler = (pointId) => {
        const x = points.x[pointId];
        const y = points.y[pointId];
        const category = points.z[pointId];
        const value = points.w[pointId];
        console.log(
            `Out point: ${pointId}`,
            `X: ${x}\nY: ${y}\nCategory: ${category}\nValue: ${value}`
        );
    };

    const pointoutHandler = (pointId) => {
        console.log('Out point:', pointId);
        const x = points.x[pointId];
        const y = points.y[pointId];
        const category = points.z[pointId];
        const value = points.w[pointId];
        console.log(
            `Out point: ${pointId}`,
            `X: ${x}\nY: ${y}\nCategory: ${category}\nValue: ${value}`
        );
    };

    const selectHandler = ({ points: selectedPoints }) => {
        selection = selectedPoints;
        if (selection.length === 1) {
            const point = points[selection[0]];
            console.log(
                `Selected: ${selectedPoints}`,
                `X: ${point[0]}\nY: ${point[1]}\nCategory: ${point[2]}\nValue: ${point[3]}`
            );
        }
    };

    const deselectHandler = () => {
        console.log('Deselected:', selection);
        selection = [];
    };

    useEffect(() => {
        console.log(canvas.current);

        const canvasElem = canvas.current;

        // canvasElem.style.width = "100%";
        // canvasElem.style.height = "100%";

        var scale = 1; // window.devicePixelRatio || 1;
        canvasElem.width = Math.floor(canvasElem.offsetWidth * scale);
        canvasElem.height = Math.floor(canvasElem.offsetHeight * scale);

        const { width, height } = canvasElem.getBoundingClientRect();

        let scatterplot = createScatterplot({
            canvas: canvasElem,
            width,
            height,
            lassoMinDelay,
            lassoMinDist,
            pointSize,
            showReticle,
            reticleColor,
            lassoInitiator: false,
            opacity,
            // cameraDistance,
            pointOutlineWidth,
        });

        setScatterplot(scatterplot);

        // scatterplot.subscribe('pointover', pointoverHandler);
        // scatterplot.subscribe('pointout', pointoutHandler);
        // scatterplot.subscribe('select', selectHandler);
        // scatterplot.subscribe('deselect', deselectHandler);

        // canvasElem.width = canvasElem.offsetWidth;
        // canvasElem.height = canvasElem.offsetHeight;
    }, []);

    const { tsneData } = useContext(AppContext);

    useEffect(() => {
        console.log("tsne data changed");

        const canvasElem = canvas.current;

        if (canvasElem) {

            if (tsneData?.tsne) {

                // const canvasElem = canvas.current;
                // scatterplot.set({
                //     width: canvasElem.offsetWidth,
                //     height: canvasElem.offsetHeight
                // });

                scatterplot.clear();

                // if (!self.cluster_mappings) {
                let cluster_mappings = Object.values(tsneData?.clusters);
                let cluster_count = Math.max(...cluster_mappings);
                const cluster_colors = randomColor({ luminosity: 'dark', count: cluster_count + 1 });
                // let cluster_colors_gradients = [];
                // for (var i = 0; i < self.cluster_count + 1; i++) {
                //     var gradient = new Rainbow();
                //     gradient.setSpectrum("grey", self.cluster_colors[i]);
                //     gradient.setNumberRange(0, self.tsne_cluster_iterations);
                //     self.cluster_colors_gradients.push(gradient);
                // }
                // }

                const xScale = scaleLinear().domain([Math.min(tsneData?.tsne.x), Math.max(tsneData?.tsne.x)]);
                const yScale = scaleLinear().domain([Math.min(tsneData?.tsne.y), Math.max(tsneData?.tsne.y)]);
                scatterplot.set({ xScale, yScale });

                points = {
                    x: tsneData?.tsne.x,
                    y: tsneData?.tsne.y,
                    z: Object.values(tsneData?.clusters),
                    w: Object.values(tsneData?.clusters),
                }
                // const colorsCat = ['#3a78aa', '#aa3a99'];

                scatterplot.set({ colorBy: 'category', pointColor: cluster_colors });
                // scatterplot.set({ colorBy: 'value', pointColor: colorsScale });

                scatterplot.draw(points);

                // scatterplot.refresh();
            }
        }
    }, [tsneData]);

    return (
        <>
            <canvas ref={canvas} ></canvas>
        </>
    );
};

export default DimPlot;