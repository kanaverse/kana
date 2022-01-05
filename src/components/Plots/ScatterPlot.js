import { ScatterGL } from 'scatter-gl';
import { useEffect, useRef, useContext, useState } from 'react';
import {
    ControlGroup, Button, Icon, ButtonGroup, Callout, RangeSlider,
    Divider,
    Label
} from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";

import { AppContext } from '../../context/AppContext';
import getMinMax from './utils';

import Rainbow from './rainbowvis';
import { randomColor } from 'randomcolor';

import "./ScatterPlot.css";

const DimPlot = () => {
    const container = useRef();

    // ref to the plot object
    const [scatterplot, setScatterplot] = useState(null);
    // set which cluster to highlight, also for custom selections
    const [clusHighlight, setClusHighlight] = useState(null);
    // show a gradient on the plot ?
    const [showGradient, setShowGradient] = useState(false);
    // expression min & max
    const [exprMinMax, setExprMinMax] = useState(null);
    // user selected min and max from UI
    const [sliderMinMax, setSliderMinMax] = useState(exprMinMax);
    // gradient scale
    const [gradient, setGradient] = useState(null);

    const { plotRedDims, redDims, defaultRedDims, setDefaultRedDims, clusterData,
        tsneData, umapData, setPlotRedDims, clusterColors, setClusterColors,
        gene, selectedClusterSummary,
        customSelection, setCustomSelection,
        setDelCustomSelection,
        showAnimation, setTriggerAnimation,
        savedPlot, setSavedPlot, selectedCluster } = useContext(AppContext);

    // keeps track of what points were selected in lasso selections
    const [selectedPoints, setSelectedPoints] = useState(null);
    // set mode for plot
    const [plotMode, setPlotMode] = useState('PAN');

    const max = Math.max(...clusterData?.clusters);

    // if either gene or expression changes, compute gradients and min/max
    useEffect(() => {
        if (gene === null) {
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

    // hook to also react when user changes the slider
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

            // only create the plot object once
            if (!tmp_scatterplot) {
                const containerEl = container.current;

                containerEl.style.width = "95%";
                containerEl.style.height = "95%";

                tmp_scatterplot = new ScatterGL(containerEl, {
                    onSelect: (points) => {
                        if (points.length !== 0) {
                            setSelectedPoints(points);
                        }
                    },
                    orbitControls: {
                        zoomSpeed: 1.25,
                    },
                    styles: {
                        point: {
                            scaleDefault: 1,
                            scaleSelected: 1.25,
                            scaleHover: 1.25,
                        }
                    }
                });

                tmp_scatterplot.setPanMode();
                setScatterplot(tmp_scatterplot);
            }

            let data = null;
            if (defaultRedDims === "TSNE") {
                data = tsneData;
            } else if (defaultRedDims === "UMAP") {
                data = umapData;
            }

            // if dimensions are available
            if (data) {

                let cluster_mappings = clusterData?.clusters;
                const cluster_colors = clusterColors

                let points = []
                data.x.forEach((x, i) => {
                    points.push([x, data.y[i]]);
                });

                let metadata = {
                    clusters: cluster_mappings
                };
                const dataset = new ScatterGL.Dataset(points, metadata);
                tmp_scatterplot.render(dataset);

                // callback for coloring cells on the plot
                // by default chooses the cluster assigned color for the plot
                // if a gradient bar is available, sets gradient 
                // if a cluster is highlighted, grays out all other cells except the cells
                // in the cluster or selection
                // priority of rendering
                // gradient selection > cluster selection > graying out
                // an initial implementation also used a per cluster gradient to color cells
                // by expression, commmented out
                tmp_scatterplot.setPointColorer((i, selectedIndices, hoverIndex) => {

                    if (selectedIndices.has(i)) {
                        return "#30404D";
                    }

                    if (clusHighlight != null) {
                        if (!String(clusHighlight).startsWith("cs")) {
                            if (clusHighlight !== cluster_mappings[i]) return '#D3D3D3';
                        } else {
                            if (!customSelection[clusHighlight].includes(i)) return '#D3D3D3';
                        }
                    }

                    if (gene !== null && Array.isArray(selectedClusterSummary?.[gene]?.expr)) {

                        return "#" + gradient.colorAt(selectedClusterSummary?.[gene]?.expr?.[i]);
                        // if we want per cell gradient 
                        // let colorGradients = cluster_colors.map(x => {
                        //     var gradient = new Rainbow();
                        //     gradient.setSpectrum('#D3D3D3', x);
                        //     let val = exprMinMax[1] === 0 ? 0.01 : exprMinMax[1];
                        //     gradient.setNumberRange(0, val);
                        //     return gradient;
                        // });

                        // return "#" + colorGradients[cluster_mappings[i]].colorAt(selectedClusterSummary?.[gene]?.expr?.[i])
                    }

                    if (clusHighlight != null && String(clusHighlight).startsWith("cs")) {
                        let tmpclus = parseInt(clusHighlight.replace("cs", ""));
                        return cluster_colors[max + tmpclus];
                    } else {
                        return cluster_colors[cluster_mappings[i]];
                    }
                });
            }
        }
    }, [tsneData, umapData, defaultRedDims, gradient, clusHighlight]);

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

    // save use selected selection of cells
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

        setSelectedPoints(null);
        scatterplot.select(null);
    }

    function handleSaveEmbedding() {
        console.log("handleSaveEmbedding");

        const containerEl = container.current;
        if (containerEl) {
            let elem = containerEl.querySelector("canvas");
            // var ctx = elem.getContext('2d');

            const iData = elem.toDataURL();//ctx.getImageData(0, 0, elem.width, elem.height);
            let tmp = [...savedPlot];

            tmp.push({
                "image": iData,
                "config": {
                    "cluster": selectedCluster,
                    "gene": gene,
                    "highlight": clusHighlight,
                    "embedding": defaultRedDims
                }
            });

            setSavedPlot(tmp);
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
            <div className="top-header">
                <ControlGroup fill={false} vertical={false}
                    style={{
                        marginRight: '4px'
                    }}>
                    <Tooltip2 content="Interactively visualize embeddings">
                        <Button icon="play"
                            onClick={() => setTriggerAnimation(true)}>Animate</Button>
                    </Tooltip2>
                    <Tooltip2 content="Save this embedding">
                        <Button icon="inheritance"
                            onClick={handleSaveEmbedding}>Save</Button>
                    </Tooltip2>
                </ControlGroup>
                <ControlGroup fill={false} vertical={false}>
                    <Button active={plotMode == "PAN"}
                        intent={plotMode === "PAN" ? "primary" : "none"}
                        icon="hand-up" onClick={x => setInteraction("PAN")}>Pan</Button>
                    <Button active={plotMode == "SELECT"}
                        intent={plotMode === "SELECT" ? "primary" : "none"}
                        icon="widget" onClick={x => setInteraction("SELECT")}>Selection</Button>
                </ControlGroup>
            </div>
            {
                showAnimation ?
                    <Label className='iter'>Iteration: {defaultRedDims === "TSNE" ? tsneData?.iteration : umapData?.iteration}</Label>
                    : ""
            }
            <div className='dim-plot'>
                {
                    defaultRedDims ?
                        <div ref={container} ></div> :
                        "Choose an Embedding... or Embeddings are being computed..."
                }
            </div>
            <div className='right-sidebar'>
                <div style={{ width: '100%' }}>
                    {
                        <div className='right-sidebar-cluster'>
                            <Callout title="CLUSTERS">
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
                                                                    tmpcolors = tmpcolors.slice(0, tmpcolors.length - 1);
                                                                    setClusterColors(tmpcolors);

                                                                    setDelCustomSelection(x);

                                                                    if (clusHighlight === x) {
                                                                        setClusHighlight(null);
                                                                    }
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
