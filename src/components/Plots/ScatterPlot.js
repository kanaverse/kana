import { ScatterGL } from 'scatter-gl';
import { useEffect, useRef, useContext, useState } from 'react';
import { ControlGroup, Button, Icon, ButtonGroup, Callout } from "@blueprintjs/core";

import { AppContext } from '../../context/AppContext';
import getMinMax from './utils';

import Rainbow from './rainbowvis';

import "./ScatterPlot.css";

const DimPlot = () => {
    const container = useRef();
    const [scatterplot, setScatterplot] = useState(null);
    const [clusHighlight, setClusHighlight] = useState(null);
    // const scoreColors = ["#F6F6F6", "#3399FF"];
    const { plotRedDims, redDims, defaultRedDims, setDefaultRedDims, clusterData,
        tsneData, umapData, setPlotRedDims, clusterColors,
        gene, selectedClusterSummary } = useContext(AppContext);

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
                    if (hoverIndex === i) {
                        return 'red';
                    }

                    if(clusHighlight != null && clusHighlight !== cluster_mappings[i]) {
                        return '#D3D3D3';
                    }

                    if (gene && Array.isArray(selectedClusterSummary?.[gene]?.expr)) {
                        let exprMinMax = getMinMax(selectedClusterSummary[gene].expr);

                        let colorGradients = cluster_colors.map(x => {
                            var gradient = new Rainbow();
                            gradient.setSpectrum('#D3D3D3', x);
                            let val = exprMinMax[1] === 0 ? 0.01 : exprMinMax[1];
                            gradient.setNumberRange(0, val);
                            return gradient;
                        });

                        return "#" + colorGradients[cluster_mappings[i]].colorAt(selectedClusterSummary?.[gene]?.expr?.[i])
                    }

                    return cluster_colors[cluster_mappings[i]];
                });
            }
        }
    }, [plotRedDims, selectedClusterSummary, gene, clusHighlight]);

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
                <Callout title="CLUSTERS" icon="circle-arrow-left">
                    <ul>
                        {clusterColors?.map((x, i) => {
                            return (<li key={i} 
                                className={clusHighlight == i ? 'legend-highlight': ''}
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
            </div>
        </div>
    );
};

export default DimPlot;