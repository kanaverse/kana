import { ScatterGL } from 'scatter-gl';
import React, { useEffect, useRef, useContext, useState } from 'react';
import {
    ControlGroup, Button, Icon, ButtonGroup, Callout, RangeSlider,
    Divider, Label, Tag, HTMLSelect
} from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";

import { AppContext } from '../../context/AppContext';
import { getMinMax } from './utils';

import Rainbow from './rainbowvis';
import { randomColor } from 'randomcolor';
import { palette } from './utils';

import "./DimPlot.css";
import { AppToaster } from "../Spinners/AppToaster";

const DimPlot = (props) => {
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
    // first render ?
    const [renderCount, setRenderCount] = useState(true);

    const { genesInfo, geneColSel, annotationCols, annotationObj } = useContext(AppContext);

    // keeps track of what points were selected in lasso selections
    const [selectedPoints, setSelectedPoints] = useState(null);
    // set mode for plot
    const [plotMode, setPlotMode] = useState('PAN');

    // selected colorBy
    const [colorByAnotation, setColorByAnnotation] = useState("clusters");

    // dim plot color mappins & groups
    const [plotColorMappings, setPlotColorMappings] = useState(null);
    const [plotGroups, setPlotGroups] = useState(null);
    const [plotFactors, setPlotFactors] = useState(null);

    const max = getMinMax(props?.clusterData.clusters)[1];

    // if either gene or expression changes, compute gradients and min/max
    useEffect(() => {
        if (props?.gene === null) {
            setShowGradient(false);
            setGradient(null);
        }

        let index = props?.selectedClusterIndex?.[props?.gene];
        let expr = props?.selectedClusterSummary?.[index]?.expr;

        if (expr) {
            let exprMinMax = getMinMax(expr);
            let val = exprMinMax[1] === 0 ? 0.01 : exprMinMax[1];
            let tmpgradient = new Rainbow();
            tmpgradient.setSpectrum('#F5F8FA', "#2965CC");
            tmpgradient.setNumberRange(0, val);
            if (exprMinMax[0] !== exprMinMax[1]) {
                setShowGradient(true);
                setSliderMinMax([0, val]);
                setExprMinMax([0, val]);
            } else {
                setShowGradient(false);
                AppToaster.show({ icon: "warning-sign", intent: "warning", message: `${genesInfo[geneColSel][props?.gene]} is not expressed in any cell (mean = 0)` })
            }
            setGradient(tmpgradient);
        }
    }, [props?.selectedClusterIndex?.[props?.gene],
    props?.selectedClusterSummary?.[props?.selectedClusterIndex?.[props?.gene]]?.expr,
    props?.gene]);

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

            if (props?.showAnimation) {
                data = props?.animateData;
            } else {
                if (props?.defaultRedDims === "TSNE") {
                    data = props?.tsneData;
                } else if (props?.defaultRedDims === "UMAP") {
                    data = props?.umapData;
                }
            }

            // if dimensions are available
            if (data && plotFactors && plotColorMappings) {

                const cluster_mappings = plotFactors;
                const cluster_colors = plotColorMappings;

                let points = []
                data.x.forEach((x, i) => {
                    points.push([x, data.y[i]]);
                });

                let metadata = {
                    // clusters: cluster_mappings
                };
                const dataset = new ScatterGL.Dataset(points, metadata);

                if (renderCount) {
                    tmp_scatterplot.render(dataset);
                    setRenderCount(false);
                } else {
                    tmp_scatterplot.updateDataset(dataset);
                }

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
                            if (!props?.customSelection[clusHighlight].includes(i)) return '#D3D3D3';
                        }
                    }

                    if (props?.gene !== null) {
                        let index = props?.selectedClusterIndex?.[props?.gene];
                        let expr = props?.selectedClusterSummary?.[index]?.expr;

                        if (Array.isArray(expr)) {
                            return "#" + gradient.colorAt(expr?.[i]);
                            // if we want per cell gradient 
                            // let colorGradients = cluster_colors.map(x => {
                            //     var gradient = new Rainbow();
                            //     gradient.setSpectrum('#D3D3D3', x);
                            //     let val = exprMinMax[1] === 0 ? 0.01 : exprMinMax[1];
                            //     gradient.setNumberRange(0, val);
                            //     return gradient;
                            // });

                            // return "#" + colorGradients[cluster_mappings[i]].colorAt(props?.selectedClusterSummary?.[gene]?.expr?.[i])
                        }
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
    }, [props?.tsneData, props?.umapData, props?.animateData, props?.defaultRedDims,
        gradient, clusHighlight, plotColorMappings, plotGroups, plotFactors]);

    useEffect(() => {
        if (colorByAnotation.toLowerCase() == "clusters") {

            setPlotColorMappings(props?.clusterColors);
            let clus_names = [];
            for (let i = 0; i < max; i++) {
                clus_names.push(`Cluster ${i + 1}`);
            }
            setPlotGroups(clus_names);
            setPlotFactors(props?.clusterData?.clusters);
        } else {
            if (!(colorByAnotation in annotationObj)) {
                props?.setReqAnnotation(colorByAnotation);
            } else {
                let tmp = annotationObj[colorByAnotation];
                setPlotGroups(tmp.index);

                let cluster_colors;
                if (tmp.index.length > Object.keys(palette).length) {
                    cluster_colors = randomColor({ luminosity: 'dark', count: tmp.index.length + 1 });
                } else {
                    cluster_colors = palette[tmp.index.length.toString()];
                }
                setPlotColorMappings(cluster_colors);
                setPlotFactors(tmp.factor);
            }
        }

    }, [colorByAnotation, annotationObj, props?.clusterData,]);

    const setInteraction = (x) => {
        if (x === "SELECT") {
            scatterplot.setSelectMode();
            setPlotMode("SELECT");
        } else {
            scatterplot.setPanMode();
            setPlotMode("PAN");
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
        let tmpcolor = [...props?.clusterColors];
        tmpcolor.push(color[0]);
        props?.setClusterColors(tmpcolor);

        let cid = Object.keys(props?.customSelection).length;
        let tmpSelection = { ...props?.customSelection };
        tmpSelection[`cs${cid + 1}`] = selectedPoints;
        props?.setCustomSelection(tmpSelection);

        setSelectedPoints(null);
        scatterplot.select(null);
    }

    function handleSaveEmbedding() {
        const containerEl = container.current;
        if (containerEl) {
            // preserve drawing buffers is false, so render and capture state right away
            scatterplot.renderScatterPlot();
            const iData = scatterplot.scatterPlot.renderer.domElement.toDataURL();

            let tmp = [...props?.savedPlot];

            tmp.push({
                "image": iData,
                "config": {
                    "cluster": props?.selectedCluster,
                    "gene": props?.gene,
                    "highlight": clusHighlight,
                    "embedding": props?.defaultRedDims
                }
            });

            props?.setSavedPlot(tmp);
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
                    disabled={props?.redDims.indexOf("TSNE") === -1}
                    onClick={() => props?.setDefaultRedDims("TSNE")}
                    intent={props?.defaultRedDims === "TSNE" ? "primary" : ""}
                >
                    <Icon icon="heatmap"></Icon>
                    <br />
                    <span>t-SNE</span>
                </Button>
                <Button className='dim-button'
                    disabled={props?.redDims.indexOf("UMAP") === -1}
                    onClick={() => props?.setDefaultRedDims("UMAP")}
                    intent={props?.defaultRedDims === "UMAP" ? "primary" : ""}
                >
                    <Icon icon="heatmap"></Icon><br />
                    <span>UMAP</span>
                </Button>
                <Button className='dim-button'
                    disabled={true}
                >
                    <Icon icon="heat-grid"></Icon>
                    <br />
                    <span>HEATMAP (coming soon)</span>
                </Button>
            </ButtonGroup>
            <div className="top-header">
                <ControlGroup fill={false} vertical={false}
                    style={{
                        marginRight: '4px'
                    }}>
                    <Tooltip2 content="Interactively visualize embeddings">
                        <Button icon="play"
                            onClick={() => {
                                props?.setShowAnimation(true);
                                props?.setTriggerAnimation(true);
                            }}>Animate</Button>
                    </Tooltip2>
                    <Tooltip2 content="Save this embedding">
                        <Button icon="inheritance"
                            onClick={handleSaveEmbedding}>Save</Button>
                    </Tooltip2>
                </ControlGroup>
                <ControlGroup fill={false} vertical={false}>
                    <Button active={plotMode === "PAN"}
                        intent={plotMode === "PAN" ? "primary" : "none"}
                        icon="hand-up" onClick={x => setInteraction("PAN")}>Pan</Button>
                    <Button active={plotMode === "SELECT"}
                        intent={plotMode === "SELECT" ? "primary" : "none"}
                        icon="widget" onClick={x => setInteraction("SELECT")}>Selection</Button>
                </ControlGroup>
            </div>
            {
                props?.showAnimation ?
                    <Label className='iter'>Iteration: {props?.animateData?.iteration}</Label>
                    : ""
            }
            <div className='dim-plot'>
                {
                    props?.defaultRedDims ?
                        <div ref={container} ></div> :
                        "Choose an Embedding... or Embeddings are being computed..."
                }
            </div>
            <div className='right-sidebar'>
                {
                    <div className='right-sidebar-cluster'>
                        <Callout>
                            <p>NOTE: Clusters identified by Kana can be found under <strong>CLUSTERS</strong></p>
                            <HTMLSelect large={false} minimal={true} defaultValue={"CLUSTERS"}
                                onChange={(nval, val) => setColorByAnnotation(nval?.currentTarget?.value)}>
                                {
                                    annotationCols.map((x, i) => (
                                        <option key={i}>{x}</option>
                                    ))
                                }
                            </HTMLSelect>
                            <ul>
                                {
                                    plotGroups && plotGroups.map((x, i) => {
                                        return (
                                            <li key={i}
                                                className={clusHighlight === i ? 'legend-highlight' : ''}
                                                style={{ color: plotColorMappings[i] }}
                                                onClick={() => {
                                                    if (i === clusHighlight) {
                                                        setClusHighlight(null);
                                                    } else {
                                                        setClusHighlight(i);
                                                    }
                                                }}
                                            > {x ? x : "NA"} </li>
                                        )
                                    })
                                }
                                {/* {props?.clusterColors?.map((x, i) => {
                                        return i < props?.clusterColors.length - Object.keys(props?.customSelection).length ?
                                            (<li key={i}
                                                className={clusHighlight === i ? 'legend-highlight' : ''}
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
                                    })} */}
                            </ul>
                        </Callout>
                        {
                            (Object.keys(props?.customSelection).length > 0 || (selectedPoints && selectedPoints.length > 0)) ?
                                <Callout title="CUSTOM SELECTIONS">
                                    <div
                                        style={{
                                            paddingTop: '5px'
                                        }}>
                                        <ul>
                                            {Object.keys(props?.customSelection)?.map((x, i) => {
                                                return (<li key={x}
                                                    className={clusHighlight === x ? 'legend-highlight' : ''}
                                                    style={{ color: props?.clusterColors[getMinMax(props?.clusterData.clusters)[1] + 1 + i] }}
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
                                                                let tmpSel = { ...props?.customSelection };
                                                                delete tmpSel[x];
                                                                props?.setCustomSelection(tmpSel);

                                                                let tmpcolors = [...props?.clusterColors];
                                                                tmpcolors = tmpcolors.slice(0, tmpcolors.length - 1);
                                                                props?.setClusterColors(tmpcolors);

                                                                props?.setDelCustomSelection(x);

                                                                if (clusHighlight === x) {
                                                                    setClusHighlight(null);
                                                                }
                                                            }}></Icon>
                                                    </div>
                                                </li>)
                                            })}
                                        </ul>
                                    </div>
                                    {
                                        selectedPoints && selectedPoints.length > 0 ?
                                            <div>
                                                <Divider />
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
                                </Callout>
                                :
                                ""
                        }
                    </div>
                }
                {showGradient ?
                    <div className='right-sidebar-slider'>
                        <Callout>
                            <span>Gradient for <Tag
                                minimal={true}
                                intent='primary' onRemove={() => {
                                    props?.setGene(null);
                                }}>{genesInfo[geneColSel][props?.gene]}</Tag>&nbsp;
                                <Tooltip2 content="Use the slider to adjust the color gradient of the plot. Useful when data is skewed
                                by either a few lowly or highly expressed cells" openOnTargetFocus={false}>
                                    <Icon icon="help"></Icon>
                                </Tooltip2>
                            </span>
                            <div className='dim-slider-container'>
                                <div className='dim-slider-gradient'>
                                    {/* <span>{Math.round(exprMinMax[0])}</span>&nbsp; */}
                                    <div
                                        style={{
                                            backgroundImage: `linear-gradient(to right, #F5F8FA ${(sliderMinMax[0] - exprMinMax[0]) * 100 / (exprMinMax[1] - exprMinMax[0])}%, ${((sliderMinMax[1] + sliderMinMax[0] - (2 * exprMinMax[0]))) * 100 / (2 * (exprMinMax[1] - exprMinMax[0]))}%, #2965CC ${(100 - (exprMinMax[1] - sliderMinMax[1]) * 100 / (exprMinMax[1] - exprMinMax[0]))}%)`,
                                            width: '175px', height: '15px',
                                        }}></div>&nbsp;
                                    {/* <span>{Math.round(exprMinMax[1])}</span> */}
                                </div>
                                <div className='dim-range-slider'>
                                    <RangeSlider
                                        min={Math.round(exprMinMax[0])}
                                        max={Math.round(exprMinMax[1])}
                                        stepSize={Math.round(exprMinMax[1] - exprMinMax[0]) / 10}
                                        labelValues={[Math.round(exprMinMax[0]), Math.round(exprMinMax[1])]}
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
    );
};

export default React.memo(DimPlot);
