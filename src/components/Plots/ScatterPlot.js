import { ScatterGL } from 'scatter-gl';
import { useEffect, useRef, useContext, useState } from 'react';
import { ControlGroup, Button, Icon, ButtonGroup, Callout, RangeSlider } from "@blueprintjs/core";

import { AppContext } from '../../context/AppContext';
import getMinMax from './utils';

import Rainbow from './rainbowvis';

import "./ScatterPlot.css";

const DimPlot = () => {
    const container = useRef();
    const [scatterplot, setScatterplot] = useState(null);
    const [clusHighlight, setClusHighlight] = useState(null);
    const [showGradient, setShowGradient] = useState(false);
    const [exprMinMax, setExprMinMax] = useState(null);
    const [sliderMinMax, setSliderMinMax] = useState(exprMinMax);
    const [gradient, setGradient] = useState(null);
    // const scoreColors = ["#F6F6F6", "#3399FF"];
    const { plotRedDims, redDims, defaultRedDims, setDefaultRedDims, clusterData,
        tsneData, umapData, setPlotRedDims, clusterColors,
        gene, selectedClusterSummary } = useContext(AppContext);

    useEffect(() => {

        if (!gene || gene == "") {
            setShowGradient(false);
        }

        if (selectedClusterSummary?.[gene]?.expr) {
            let exprMinMax = getMinMax(selectedClusterSummary?.[gene]?.expr);
            let val = exprMinMax[1] === 0 ? 0.01 : exprMinMax[1];
            let tmpgradient = new Rainbow();
            tmpgradient.setSpectrum('#F5F8FA', "#2965CC");
            tmpgradient.setNumberRange(0, val);
            setShowGradient(true);
            setGradient(tmpgradient);
            setSliderMinMax([0, val]);
            setExprMinMax([0, val]);
        }
    }, [selectedClusterSummary?.[gene]?.expr], gene);

    useEffect(() => {

        if (Array.isArray(sliderMinMax)) {
            let tmpgradient = new Rainbow();
            tmpgradient.setSpectrum('#F5F8FA', "#2965CC");
            tmpgradient.setNumberRange(...sliderMinMax);
            setGradient(tmpgradient);
            setShowGradient(true);
        }

    }, [sliderMinMax]);

    useEffect(() => {

        const containerEl = container.current;

        if (containerEl) {

            let tmp_scatterplot = scatterplot;

            if (!tmp_scatterplot) {
                const containerEl = container.current;

                containerEl.style.width = "95%";
                containerEl.style.height = "95%";

                let lastSelectedPoints = [];

                tmp_scatterplot = new ScatterGL(containerEl, {
                    // onClick: (point) => {
                    //     console.log(`click ${point}`);
                    // },
                    // onHover: (point) => {
                    //     console.log(`hover ${point}`);
                    // },
                    // onSelect: (points) => {
                    //     let message = '';
                    //     if (points.length === 0 && lastSelectedPoints.length === 0) {
                    //         message = 'no selection';
                    //     } else if (points.length === 0 && lastSelectedPoints.length > 0) {
                    //         message = 'deselected';
                    //     } else if (points.length === 1) {
                    //         message = `selected ${points}`;
                    //     } else {
                    //         message = `selected ${points.length} points`;
                    //     }
                    //     console.log(message);
                    // },
                    orbitControls: {
                        zoomSpeed: 1.25,
                    },
                    styles: {
                        point: {
                            scaleDefault: 2.5,
                            scaleSelected: 2.5,
                            scaleHover: 2.5,
                        }
                    }
                });

                tmp_scatterplot.setPanMode();
                setScatterplot(tmp_scatterplot);
            }

            if (plotRedDims?.plot) {

                let cluster_mappings = plotRedDims?.clusters;
                const cluster_colors = clusterColors

                let points = []
                plotRedDims?.plot.x.forEach((x, i) => {
                    points.push([x, plotRedDims?.plot.y[i]]);
                });

                let metadata = {
                    clusters: cluster_mappings
                };
                const dataset = new ScatterGL.Dataset(points, metadata);

                tmp_scatterplot.render(dataset);

                tmp_scatterplot.setPointColorer((i, selectedIndices, hoverIndex) => {
                    // if (hoverIndex === i) {
                    //     return 'red';
                    // }

                    if (clusHighlight != null && clusHighlight !== cluster_mappings[i]) {
                        return '#D3D3D3';
                    }

                    if (gene && Array.isArray(selectedClusterSummary?.[gene]?.expr)) {
                        // let exprMinMax = getMinMax(selectedClusterSummary[gene].expr);
                        // var gradient = new Rainbow();
                        // gradient.setSpectrum('#F5F8FA', "#2965CC");
                        // let val = sliderMinMax[1] === 0 ? 0.01 : sliderMinMax[1];
                        // gradient.setNumberRange(0, val);
                        // setExprMinMax([0, val]);
                        // setShowGradient(true);
                        setShowGradient(true);

                        return "#" + gradient.colorAt(selectedClusterSummary?.[gene]?.expr?.[i]);
                        // let colorGradients = cluster_colors.map(x => {
                        //     var gradient = new Rainbow();
                        //     gradient.setSpectrum('#D3D3D3', x);
                        //     let val = exprMinMax[1] === 0 ? 0.01 : exprMinMax[1];
                        //     gradient.setNumberRange(0, val);
                        //     return gradient;
                        // });

                        // return "#" + colorGradients[cluster_mappings[i]].colorAt(selectedClusterSummary?.[gene]?.expr?.[i])
                    }

                    setShowGradient(false);
                    return cluster_colors[cluster_mappings[i]];
                });
            }
        }
    }, [plotRedDims, gradient, clusHighlight]);

    useEffect(() => {
        changeRedDim(defaultRedDims);
    }, [defaultRedDims])

    const changeRedDim = (x) => {
        if (defaultRedDims === "TSNE") {
            setPlotRedDims({
                "plot": tsneData,
                "clusters": clusterData?.clusters
            });
        } else if (defaultRedDims === "UMAP") {
            setPlotRedDims({
                "plot": umapData,
                "clusters": clusterData?.clusters
            });
        }
    };

    const setInteraction = (x) => {
        if (x === "PAN") {
            scatterplot.setPanMode();
        } else if (x === "SELECT") {
            scatterplot.setSelectMode();
        }
    }

    return (
        <div className="scatter-plot">
            <ButtonGroup style={{ minWidth: 75, minHeight: 150 }}
                fill={false}
                large={false}
                minimal={false}
                vertical={true}
                className='left-sidebar'
            >
                <Button className='dim-button'
                    disabled={redDims.indexOf("TSNE") === -1}
                    onClick={() => setDefaultRedDims("TSNE")}
                    intent={defaultRedDims === "TSNE" ? "primary" : ""}
                >
                    <Icon icon="database"></Icon>
                    <br />
                    <span>TSNE</span>
                </Button>
                <Button className='dim-button'
                    disabled={redDims.indexOf("UMAP") === -1}
                    onClick={() => setDefaultRedDims("UMAP")}
                    intent={defaultRedDims === "UMAP" ? "primary" : ""}
                >
                    <Icon icon="database"></Icon><br />
                    <span>UMAP</span>
                </Button>
            </ButtonGroup>
            <ControlGroup className="top-header" fill={false} vertical={false}>
                {/* <Button>Play t-SNE Interactively</Button>
                <Button>Color Plot by Metadata</Button>
                <Button>What else ?</Button> */}
                <Button icon="hand-up" onClick={x => setInteraction("PAN")}>Pan</Button>
                <Button icon="widget" onClick={x => setInteraction("SELECT")}>Selection</Button>
            </ControlGroup>
            <div className='dim-plot'>
                {
                    plotRedDims?.plot ?
                        <div ref={container} ></div> :
                        "Choose an Embedding... or Embeddings are being computed..."
                }
            </div>
            <div className='right-sidebar'>
                {showGradient ?
                    <div>
                        <span>Use the slider to adjust the color gradient of the plot. Useful when data is skewed
                            by either a few lowly or highly expressed cells
                        </span>
                        <div className='dim-slider-container'>
                            {/* <svg xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="geneGradient" gradientTransform="rotate(0)">
                                    <stop offset="5%" stopColor="#F5F8FA" />
                                    <stop offset="95%" stopColor="#2965CC" />
                                </linearGradient>
                            </defs>
                            <rect x="5%" y="25%" width="50%" height="15" fill="url('#geneGradient')" />
                            <text x="20%" y="20%" style={{ font: '8px sans-serif' }}>{gene}</text>
                            <text x="30%" y="25%" style={{ font: '8px sans-serif' }}>{exprMinMax[0]}</text>
                            <text x="30%" y="100%" style={{ font: '8px sans-serif' }}>{exprMinMax[1].toFixed(2)}</text>
                        </svg> */}
                            <div className='dim-slider-gradient'>
                                <span>{Math.round(exprMinMax[0])}</span>
                                <div
                                    value-start={Math.round(exprMinMax[0])}
                                    value-end={Math.round(exprMinMax[1])}
                                    style={{
                                        backgroundImage: "linear-gradient(0deg, #F5F8FA, 50%, #2965CC)",
                                        width: '15px', height: '150px',
                                    }}></div>
                                <span>{Math.round(exprMinMax[1])}</span>
                            </div>
                            <div className='dim-range-slider'>
                                <RangeSlider
                                    min={Math.round(exprMinMax[0])}
                                    max={Math.round(exprMinMax[1])}
                                    stepSize={Math.round(exprMinMax[1] - exprMinMax[0]) / 20}
                                    onChange={(range) => { setSliderMinMax(range) }}
                                    value={[Math.round(sliderMinMax[0]), Math.round(sliderMinMax[1])]}
                                    vertical={true}
                                />
                            </div>
                        </div>
                    </div>
                    :
                    <Callout title="CLUSTERS" icon="circle-arrow-left">
                        <ul>
                            {clusterColors?.map((x, i) => {
                                return (<li key={i}
                                    className={clusHighlight == i ? 'legend-highlight' : ''}
                                    style={{ color: x }}
                                    onClick={() => {
                                        if (i === clusHighlight) {
                                            setClusHighlight(null);

                                        } else {
                                            setClusHighlight(i);
                                        }
                                    }}
                                > Cluster {i + 1} </li>)
                            })}
                        </ul>
                    </Callout>
                }
            </div>
        </div>
    );
};

export default DimPlot;