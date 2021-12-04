import { ScatterGL } from 'scatter-gl';
import { useEffect, useRef, useContext, useState } from 'react';
import { ControlGroup, Button, HTMLSelect, InputGroup, Icon } from "@blueprintjs/core";
import { Classes, Popover2 } from "@blueprintjs/popover2";

import { AppContext } from '../../context/AppContext';

import { randomColor } from 'randomcolor';
import "./ScatterPlot.css";

const DimPlot = () => {
    const container = useRef();
    const [scatterplot, setScatterplot] = useState(null);

    const { plotRedDims, redDims, defaultRedDims } = useContext(AppContext);

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
                });

                tmp_scatterplot.setPanMode();
                setScatterplot(tmp_scatterplot);
            }

            if (plotRedDims?.plot) {

                // if (!self.cluster_mappings) {
                let cluster_mappings = Object.values(plotRedDims?.clusters);
                let cluster_count = Math.max(...cluster_mappings);
                const cluster_colors = randomColor({ luminosity: 'dark', count: cluster_count + 1 });

                let points = plotRedDims?.plot.x.map((x, i) => [plotRedDims?.plot.x[i], plotRedDims?.plot.y[i]]);
                let metadata = {
                    clusters: Object.values(plotRedDims?.clusters)
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

    return (
        <div className="scatter-plot">
            <ControlGroup className="scatter-plot-control" fill={false} vertical={false}>
                <div className="bp3-html-select .modifier">
                    <select>
                        {redDims.length == 0 ?
                            <option selected>Change reduced dimension...</option> :
                            <option>Change reduced dimension...</option>}
                        {redDims.map(x => {
                            return <option selected={x == defaultRedDims}
                                key={x} value={x}>Dimension: {x}</option>
                        })}
                    </select>
                </div>
                <Button>Play t-SNE Interactively</Button>
                <Button>Color Plot by Metadata</Button>
                <Button>What else ?</Button>
            </ControlGroup>
            {
                plotRedDims?.plot ?
                    <div ref={container} ></div> :
                    <span>Running Analysis, please wait...</span>
            }
        </div>
    );
};

export default DimPlot;