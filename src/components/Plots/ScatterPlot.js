import { ScatterGL } from 'scatter-gl';
import { useEffect, useRef, useContext, useState } from 'react';
import { ControlGroup, Button, HTMLSelect, InputGroup, Icon, ButtonGroup } from "@blueprintjs/core";
import { Classes, Popover2 } from "@blueprintjs/popover2";

import { AppContext } from '../../context/AppContext';

import { randomColor } from 'randomcolor';
import "./ScatterPlot.css";

const DimPlot = () => {
    const container = useRef();
    const [scatterplot, setScatterplot] = useState(null);

    const { plotRedDims, redDims, defaultRedDims, setDefaultRedDims, clusterData,
        tsneData, umapData, setPlotRedDims } = useContext(AppContext);

    useEffect(() => {
        console.log("tsne data changed");

        const containerEl = container.current;

        if (containerEl) {

            let tmp_scatterplot = scatterplot;

            if (!tmp_scatterplot) {
                const containerEl = container.current;

                containerEl.style.width = "90%";
                containerEl.style.height = "90%";

                let lastSelectedPoints = [];

                tmp_scatterplot = new ScatterGL(containerEl, {
                    onClick: (point) => {
                        console.log(`click ${point}`);
                    },
                    onHover: (point) => {
                        console.log(`hover ${point}`);
                    },
                    onSelect: (points) => {
                        let message = '';
                        if (points.length === 0 && lastSelectedPoints.length === 0) {
                            message = 'no selection';
                        } else if (points.length === 0 && lastSelectedPoints.length > 0) {
                            message = 'deselected';
                        } else if (points.length === 1) {
                            message = `selected ${points}`;
                        } else {
                            message = `selected ${points.length} points`;
                        }
                        console.log(message);
                    },
                    orbitControls: {
                        zoomSpeed: 1.25,
                    },
                });

                tmp_scatterplot.setPanMode();
                setScatterplot(tmp_scatterplot);
            }

            if (plotRedDims?.plot) {

                // if (!self.cluster_mappings) {
                let cluster_mappings = plotRedDims?.clusters;
                let cluster_count = Math.max(...cluster_mappings);
                const cluster_colors = randomColor({ luminosity: 'dark', count: cluster_count + 1 });

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

                    return cluster_colors[dataset.metadata.clusters[i]];
                });
            }
        }
    }, [plotRedDims]);

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
                iconOnly={false}
                large={false}
                minimal={false}
                vertical={true}
                className='left-sidebar'
            >
                <Button className='dim-button'
                    disabled={redDims.indexOf("TSNE") == -1}
                    onClick={() => setDefaultRedDims("TSNE")}
                    intent={defaultRedDims == "TSNE" ? "primary" : ""}
                >
                    <Icon icon="database"></Icon>
                    <br />
                    <span>TSNE</span>
                </Button>
                <Button className='dim-button'
                    disabled={redDims.indexOf("UMAP") == -1}
                    onClick={() => setDefaultRedDims("UMAP")}
                    intent={defaultRedDims == "UMAP" ? "primary" : ""}
                >
                    <Icon icon="database"></Icon><br />
                    <span>UMAP</span>
                </Button>
            </ButtonGroup>
            <ControlGroup className="top-header" fill={false} vertical={false}>
                {/* <div className="bp3-html-select .modifier">
                    <select>
                        {redDims.length == 0 ?
                            <option selected>Change reduced dimension...</option> :
                            <option>Change reduced dimension...</option>}
                        {redDims.map(x => {
                            return <option selected={x == defaultRedDims}
                                key={x} value={x}>Dimension: {x}</option>
                        })}
                    </select>
                </div> */}
                <Button>Play t-SNE Interactively</Button>
                <Button>Color Plot by Metadata</Button>
                <Button>What else ?</Button>
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
        </div>
    );
};

export default DimPlot;