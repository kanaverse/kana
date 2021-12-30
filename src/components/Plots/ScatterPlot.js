import { ScatterGL } from 'scatter-gl';
import { useEffect, useRef, useContext, useState } from 'react';
import {
    ControlGroup, Button, Icon, ButtonGroup, Callout, RangeSlider,
    Divider, Tag, Label
} from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";

import { AppContext } from '../../context/AppContext';
import getMinMax from './utils';

import Rainbow from './rainbowvis';
import { randomColor } from 'randomcolor';

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
        tsneData, umapData, setPlotRedDims, clusterColors, setClusterColors,
        gene, selectedClusterSummary,
        customSelection, setCustomSelection } = useContext(AppContext);

    // const [showPointSelection, setShowPointSelection] = useState(false);
    const [selectedPoints, setSelectedPoints] = useState(null);
    const [plotMode, setPlotMode] = useState('PAN');
    // const []

    useEffect(() => {

        if (!gene || gene == "") {
            setShowGradient(false);
            setGradient(null);
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

                tmp_scatterplot = new ScatterGL(containerEl, {
                    // onClick: (point) => {
                    //     console.log(`click ${point}`);
                    // },
                    // onHover: (point) => {
                    //     console.log(`hover ${point}`);
                    // },
                    onSelect: (points) => {
                        if (points.length !== 0) {
                            setSelectedPoints(points);
                        }
                        // let message = '';
                        // if (points.length === 0 && lastSelectedPoints.length === 0) {
                        //     message = 'no selection';
                        // } else if (points.length === 0 && lastSelectedPoints.length > 0) {
                        //     message = 'deselected';
                        // } else if (points.length === 1) {
                        //     message = `selected ${points}`;
                        // } else {
                        //     message = `selected ${points.length} points`;
                        // }
                        // console.log(message);
                    },
                    orbitControls: {
                        zoomSpeed: 1.25,
                    },
                    styles: {
                        point: {
                            scaleDefault: 1.75,
                            scaleSelected: 2,
                            scaleHover: 2,
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

                    if (selectedIndices.has(i)) {
                        return "#30404D";
                    }

                    if (clusHighlight != null) {
                        if (!String(clusHighlight).startsWith("cs")) {
                            if (clusHighlight !== cluster_mappings[i]) return '#D3D3D3';
                        } else {
                            if (customSelection[clusHighlight].indexOf(i) === -1) return '#D3D3D3';
                        }
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

                    if (clusHighlight != null && String(clusHighlight).startsWith("cs")) {
                        let tmpclus = parseInt(clusHighlight.replace("cs", ""));
                        return clusterColors[Math.max(...clusterData?.clusters) + tmpclus];
                    } else {
                        return cluster_colors[cluster_mappings[i]];
                    }
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
            setPlotMode("PAN");
        } else if (x === "SELECT") {
            scatterplot.setSelectMode();
            setPlotMode("SELECT");
        }
    }

    const clearPoints = () => {
        setSelectedPoints(null);
        scatterplot.select(null);
    }

    const savePoints = () => {
        // generate random color
        let color = randomColor({ luminosity: 'dark', count: 1 });
        let tmpcolor = [...clusterColors];
        tmpcolor.push(color[0]);
        setClusterColors(tmpcolor);

        let cid = Object.keys(customSelection).length;
        let tmpSelection = { ...customSelection };
        tmpSelection[`cs${cid + 1}`] = selectedPoints;
        setCustomSelection(tmpSelection);

        clearPoints();
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
                <Button active={plotMode == "PAN"} intent={plotMode === "PAN" ? "primary": "none"} icon="hand-up" onClick={x => setInteraction("PAN")}>Pan</Button>
                <Button active={plotMode == "SELECT"} intent={plotMode === "SELECT" ? "primary": "none"} icon="widget" onClick={x => setInteraction("SELECT")}>Selection</Button>
            </ControlGroup>
            <div className='dim-plot'>
                {
                    plotRedDims?.plot ?
                        <div ref={container} ></div> :
                        "Choose an Embedding... or Embeddings are being computed..."
                }
            </div>
            <div className='right-sidebar'>
                <div style={{ width: '100%' }}>
                    {
                        <div className='right-sidebar-cluster'>
                            <Callout title="CLUSTERS"
                            // icon="circle-arrow-left"
                            >
                                <ul>
                                    {clusterColors?.map((x, i) => {
                                        return i < clusterColors.length - Object.keys(customSelection).length ?
                                         (<li key={i}
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
                                        : ""
                                    })}
                                </ul>
                                {
                                    Object.keys(customSelection).length > 0 ?
                                        <div
                                            style={{
                                                paddingTop: '5px'
                                            }}>
                                            <span>Custom Selection &nbsp;
                                                <Tooltip2 content="Custom selection of cells" openOnTargetFocus={false}>
                                                    <Icon icon="help"></Icon>
                                                </Tooltip2>
                                            </span>
                                            <ul>
                                                {Object.keys(customSelection)?.map((x, i) => {
                                                    return (<li key={x}
                                                        className={clusHighlight == x ? 'legend-highlight' : ''}
                                                        style={{ color: clusterColors[Math.max(...clusterData?.clusters) + 1 + i] }}
                                                    >
                                                        <div style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            flexDirection: 'row'
                                                        }}>
                                                            <span
                                                                style={{
                                                                    alignSelf: 'center'
                                                                }}
                                                                onClick={() => {
                                                                    if (x === clusHighlight) {
                                                                        setClusHighlight(null);

                                                                    } else {
                                                                        setClusHighlight(x);
                                                                    }
                                                                }}>Custom Selection {x.replace("cs", "")}
                                                            </span>
                                                            <Icon
                                                                size={12}
                                                                icon="trash"
                                                                style={{
                                                                    paddingLeft: '2px'
                                                                }}
                                                                onClick={() => {
                                                                    let tmpSel = { ...customSelection };
                                                                    delete tmpSel[x];
                                                                    setCustomSelection(tmpSel);

                                                                    let tmpcolors = [...clusterColors];
                                                                    tmpcolors = tmpcolors.slice(0, tmpcolors.length -1);
                                                                    setClusterColors(tmpcolors);
                                                                }}></Icon>
                                                        </div>
                                                    </li>)
                                                })}
                                            </ul>
                                        </div>
                                        :
                                        ""
                                }
                            </Callout>
                            
                            {
                                selectedPoints && selectedPoints.length > 0 ?
                                    <div>
                                        <Divider />
                                        <span>Selection &nbsp;
                                            <Tooltip2 content="save this selection of cells" openOnTargetFocus={false}>
                                                <Icon icon="help"></Icon>
                                            </Tooltip2>
                                        </span>
                                        <div className='selection-container'>
                                            <span>{selectedPoints.length} cells selected</span>
                                            <div className='selection-button-container'>
                                                <Button small={true} intent='primary'
                                                    onClick={savePoints}>Save</Button>
                                                <Button small={true}
                                                    onClick={clearPoints}>Clear</Button>
                                            </div>
                                        </div>
                                    </div>
                                    :
                                    ""
                            }
                        </div>
                    }
                    {showGradient ?
                        <div className='right-sidebar-slider'>
                            <Divider />
                            <Callout>
                                <span>Customize Gradient &nbsp;
                                    <Tooltip2 content="Use the slider to adjust the color gradient of the plot. Useful when data is skewed
                                by either a few lowly or highly expressed cells" openOnTargetFocus={false}>
                                        <Icon icon="help"></Icon>
                                    </Tooltip2>
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
                                        <span>{Math.round(exprMinMax[0])}</span>&nbsp;
                                        <div
                                            style={{
                                                backgroundImage: `linear-gradient(to right, #F5F8FA ${(sliderMinMax[0] - exprMinMax[0]) * 100 / (exprMinMax[1] - exprMinMax[0])}%, ${((sliderMinMax[1] + sliderMinMax[0] - (2 * exprMinMax[0]))) * 100 / (2 * (exprMinMax[1] - exprMinMax[0]))}%, #2965CC ${(100 - (exprMinMax[1] - sliderMinMax[1]) * 100 / (exprMinMax[1] - exprMinMax[0]))}%)`,
                                                width: '175px', height: '15px',
                                            }}></div>&nbsp;
                                        <span>{Math.round(exprMinMax[1])}</span>
                                    </div>
                                    <div className='dim-range-slider'>
                                        <RangeSlider
                                            min={Math.round(exprMinMax[0])}
                                            max={Math.round(exprMinMax[1])}
                                            stepSize={Math.round(exprMinMax[1] - exprMinMax[0]) / 25}
                                            onChange={(range) => { setSliderMinMax(range) }}
                                            value={[Math.round(sliderMinMax[0]), Math.round(sliderMinMax[1])]}
                                            vertical={false}
                                        />
                                    </div>
                                </div>
                            </Callout>
                        </div>
                        :
                        ""
                    }
                </div>
            </div>
        </div>
    );
};

export default DimPlot;