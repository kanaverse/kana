import { ScatterGL } from 'scatter-gl';
import { useEffect, useRef, useContext, useState } from 'react';
import { ControlGroup, Button, HTMLSelect, InputGroup } from "@blueprintjs/core";
import { Classes, Popover2 } from "@blueprintjs/popover2";

import { AppContext } from '../../context/AppContext';

import { randomColor } from 'randomcolor';

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

                containerEl.style.width = "100%";
                containerEl.style.height = "100%";

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
        <>
            {console.log(redDims)}
            <ControlGroup vertical={false}>
                <div className="bp3-html-select .modifier">
                    <select>
                        {redDims.length == 0 ?
                            <option selected>Change reduced dimension...</option> :
                            <option>Change reduced dimension...</option>}
                        {redDims.map(x => {
                            { console.log("x", x) }
                            { console.log("defaultRedDims", defaultRedDims) }
                            return <option selected={x == defaultRedDims}
                                key={x} value={x}>{x}</option>
                        })}
                    </select>
                    {/* <span class="bp3-icon bp3-icon-double-caret-vertical"></span> */}
                </div>
                {/* <Button icon="geosearch"></Button> */}
                {/* <InputGroup placeholder="Search for a Gene" /> */}
                {/* <Popover2
                    interactionKind="click"
                    popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                    placement="bottom"
                    content={
                        <div>
                            <h5>Color visualization by </h5>
                            <p>...</p>
                            <Button className={Classes.POPOVER2_DISMISS} text="Dismiss" />
                        </div>
                    }
                    renderTarget={({ isOpen, ref, ...targetProps }) => (
                        <Button {...targetProps} elementRef={ref} intent="primary" text="Popover target" />
                    )}
                /> */}
            </ControlGroup>
            {
                plotRedDims?.plot ?
                    <div ref={container} ></div> :
                    <span>Running Analysis, please wait...</span>
            }
        </>
    );
};

export default DimPlot;