import React, { useEffect, useContext, useState, useMemo } from 'react';
import {
    Button, H4, H5, Icon, Collapse, Label, InputGroup,
    RangeSlider, Tag, HTMLSelect, Classes, Card, Elevation
} from "@blueprintjs/core";
import { Tooltip2, Popover2 } from "@blueprintjs/popover2";
import { Virtuoso } from 'react-virtuoso';
import * as d3 from 'd3';

import { AppContext } from '../../context/AppContext';
import StackedHistogram from '../Plots/StackedHistogram';
import Histogram from '../Plots/Histogram';

import Cell from '../Plots/Cell.js';
import HeatmapCell from '../Plots/HeatmapCell';

import './markers.css';

const MarkerPlot = () => {

    const { clusterData, selectedClusterSummary, setSelectedClusterSummary,
        selectedCluster, setSelectedCluster, setClusterRank,
        setReqGene, clusterColors, gene, setGene,
        customSelection } = useContext(AppContext);

    const [clusSel, setClusSel] = useState(null);
    const [clusArrayStacked, setClusArrayStacked] = useState(null);
    const [searchInput, setSearchInput] = useState(null);
    const [meanMinMax, setMeanMinMax] = useState(null);
    const [deltaMinMax, setDeltaMinMax] = useState(null);
    const [lfcMinMax, setLfcMinMax] = useState(null);
    const [detectedMinMax, setDetectedMinMax] = useState(null);
    const [minMaxs, setMinMaxs] = useState(null);

    const [means, setMeans] = useState(null);
    const [deltas, setDeltas] = useState(null);
    const [lfcs, setLfcs] = useState(null);
    const [detects, setDetects] = useState(null);

    const [markerFilter, setMarkerFilter] = useState({});
    const [prosRecords, setProsRecords] = useState(null);

    const [lfcColorScale, setLfcColorScale] = useState(null);
    const [deltaColorScale, setDeltaColorScale] = useState(null);

    const detectedScale = d3.interpolateRdYlBu; //d3.interpolateRdBu;
    // d3.scaleSequential()
    // .domain([0, 1])
    // .range(["red", "blue"])
    // .interpolate(d3.interpolateHcl);

    useEffect(() => {
        if (!selectedClusterSummary) return selectedClusterSummary;

        let trecs = Object.values(selectedClusterSummary);

        if (trecs.length === 0) return trecs;

        let tmpmeans = trecs.map(x => x?.mean);
        // setMeanMinMax(getMinMax(tmpmeans));
        let tmeanMinMax = d3.extent(tmpmeans)
        let tmeanval = tmeanMinMax[1] === 0 ? 0.01 : tmeanMinMax[1];
        setMeanMinMax([parseFloat(tmeanMinMax[0].toFixed(2)), parseFloat(tmeanval.toFixed(2))]);
        setMeans(tmpmeans);

        let tmpdeltas = trecs.map(x => x?.delta);
        // setDeltaMinMax(getMinMax(tmpdeltas));
        let tdeltaMinMax = d3.extent(tmpdeltas)
        let tdeltaval = tdeltaMinMax[1] === 0 ? 0.01 : tdeltaMinMax[1];
        setDeltaMinMax([parseFloat(tdeltaMinMax[0].toFixed(2)), parseFloat(tdeltaval.toFixed(2))]);
        // setDeltaMinMax(d3.extent(tmpdeltas));
        setDeltas(tmpdeltas);

        // if (tdeltaMinMax?.length == 2) {
        //     // var deltagradient = new Rainbow();
        //     // deltagradient.setSpectrum('#e41a1c', "#377eb8", "#4daf4a");
        //     // deltagradient.setNumberRange(...deltaMinMax);
        //     // setDeltaColorScale(deltagradient);
        //     const detectedScale = d3.scaleSequential(d3.interpolateRdBu)
        //         .range([parseFloat(tdeltaMinMax[0].toFixed(2)), 0, parseFloat(tdeltaMinMax[1].toFixed(2))]);
        //     setDeltaColorScale(detectedScale);
        // }

        let tmplfcs = trecs.map(x => x?.lfc);
        // setLfcMinMax(getMinMax(tmplfcs));
        // setLfcMinMax(d3.extent(tmplfcs));
        let tlfcsMinMax = d3.extent(tmplfcs)
        let tlfcsval = tlfcsMinMax[1] === 0 ? 0.01 : tlfcsMinMax[1];
        setLfcMinMax([parseFloat(tlfcsMinMax[0].toFixed(2)), parseFloat(tlfcsval.toFixed(2))]);
        setLfcs(tmplfcs);

        // if (tlfcsMinMax?.length === 2) {
        //     // var lfcgradient = new Rainbow();
        //     // lfcgradient.setSpectrum('#e41a1c', "#377eb8", "#4daf4a");
        //     // lfcgradient.setNumberRange(...lfcMinMax);
        //     // setLfcColorScale(lfcgradient);
        //     const detectedScale = d3.scaleSequential(d3.interpolateRdBu)
        //         .range([parseFloat(tlfcsMinMax[0].toFixed(2)), 0, parseFloat(tlfcsMinMax[1].toFixed(2))]);
        //     setLfcColorScale(detectedScale);
        // }

        let tmpdetects = trecs.map(x => x?.detected);
        // setDetectedMinMax(getMinMax(tmpdetects));
        // setDetectedMinMax(d3.extent(tmpdetects));
        let tdetectsMinMax = d3.extent(tmpdetects)
        let tdetecval = tdetectsMinMax[1] === 0 ? 0.01 : tdetectsMinMax[1];
        setDetectedMinMax([parseFloat(tdetectsMinMax[0].toFixed(2)), parseFloat(tdetecval.toFixed(2))]);
        setDetects(tmpdetects);

        setMinMaxs({
            "lfc": [parseFloat(tlfcsMinMax[0].toFixed(2)), parseFloat(tlfcsval.toFixed(2))],
            "mean": [parseFloat(tmeanMinMax[0].toFixed(2)), parseFloat(tmeanval.toFixed(2))],
            "detected": [parseFloat(tdetectsMinMax[0].toFixed(2)), parseFloat(tdetecval.toFixed(2))],
            "delta": [parseFloat(tdeltaMinMax[0].toFixed(2)), parseFloat(tdeltaval.toFixed(2))],
        });

        let sortedRows = [...trecs];

        setProsRecords(sortedRows);

    }, [selectedClusterSummary]);

    // useEffect(() => {
    //     if (lfcMinMax?.length === 2) {
    //         // var lfcgradient = new Rainbow();
    //         // lfcgradient.setSpectrum('#e41a1c', "#377eb8", "#4daf4a");
    //         // lfcgradient.setNumberRange(...lfcMinMax);
    //         // setLfcColorScale(lfcgradient);
    //         const detectedScale = d3.scaleSequential(d3.interpolateRdBu)
    //             .range([lfcMinMax[0], 0, lfcMinMax[1]]);
    //         setLfcColorScale(detectedScale);
    //     }
    // }, [lfcMinMax]);

    // useEffect(() => {
    //     if (deltaMinMax?.length == 2) {
    //         // var deltagradient = new Rainbow();
    //         // deltagradient.setSpectrum('#e41a1c', "#377eb8", "#4daf4a");
    //         // deltagradient.setNumberRange(...deltaMinMax);
    //         // setDeltaColorScale(deltagradient);
    //         const detectedScale = d3.scaleSequential(d3.interpolateRdBu)
    //             .range([deltaMinMax[0], 0, deltaMinMax[1]]);
    //         setDeltaColorScale(detectedScale);
    //     }
    // }, [deltaMinMax]);

    const sortedRows = useMemo(() => {

        if (!prosRecords) return [];

        let sortedRows = prosRecords;
        if (markerFilter) {
            for (let key in markerFilter) {
                let range = markerFilter[key];
                if (range[0] == minMaxs[key][0] && range[1] == minMaxs[key][1]) continue;
                sortedRows = sortedRows.filter((x) => x[key] >= range[0] && x[key] <= range[1]);
            }
        }

        if (!searchInput || searchInput === "") return sortedRows;

        sortedRows = sortedRows.filter((x) => x["gene"].toLowerCase().indexOf(searchInput.toLowerCase()) !== -1);
        return sortedRows;
    }, [prosRecords, searchInput, markerFilter]);

    useEffect(() => {
        if (clusterData?.clusters) {
            let max_clusters = Math.max(...clusterData.clusters);

            let clus = [];
            for (let i = 0; i < max_clusters + 1; i++) {
                clus.push(i + 1);
            }

            clus = clus.concat(Object.keys(customSelection));

            setClusSel(clus);
            setSelectedCluster(0);

            let clusArray = []
            clusterData?.clusters?.forEach(x => x === 0 ? clusArray.push(1) : clusArray.push(0));
            setClusArrayStacked(clusArray);
        }
    }, [clusterData, customSelection]);

    useEffect(() => {
        let clusArray = []
        clusterData?.clusters?.forEach(x => x === selectedCluster ? clusArray.push(1) : clusArray.push(0));
        setClusArrayStacked(clusArray);
    }, [selectedCluster]);

    const handleMarkerFilter = (val, key) => {

        let tmp = { ...markerFilter };
        tmp[key] = val;
        setMarkerFilter(tmp);
    }

    return (
        <div className='marker-container'>
            <H4>Marker Genes</H4>
            {
                clusSel ?
                    <HTMLSelect
                        onChange={(x) => {
                            setGene(null);
                            let tmpselection = x.currentTarget?.value;
                            if (tmpselection.startsWith("Cluster")) {
                                tmpselection = parseInt(tmpselection.replace("Cluster ", "")) - 1
                            } else if (tmpselection.startsWith("Custom")) {
                                tmpselection = tmpselection.replace("Custom Selection ", "")
                            }
                            setSelectedCluster(tmpselection);
                        }}
                    >
                        {
                            clusSel.map((x, i) => (
                                <option key={i}>{String(x).startsWith("cs") ? "Custom Selection" : "Cluster"} {x}</option>
                            ))
                        }
                    </HTMLSelect>
                    : ""
            }
            {
                selectedClusterSummary ?
                    <div className='marker-table'>
                        <div className='marker-header'>
                            <InputGroup
                                leftIcon="search"
                                small={true}
                                placeholder="Search gene..."
                                type={"text"}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                            <span>
                                <Icon icon="sort" style={{
                                    paddingRight: '5px'
                                }}></Icon>
                                <HTMLSelect
                                    onChange={(x) => {
                                        setClusterRank(x.currentTarget.value);
                                    }} defaultValue={"cohen-min-rank"}>
                                    <option>cohen-min</option>
                                    <option>cohen-mean</option>
                                    <option>cohen-min-rank</option>
                                    <option>auc-min</option>
                                    <option>auc-mean</option>
                                    <option>auc-min-rank</option>
                                    <option>lfc-min</option>
                                    <option>lfc-mean</option>
                                    <option>lfc-min-rank</option>
                                    <option>delta-d-min</option>
                                    <option>delta-d-mean</option>
                                    <option>delta-d-min-rank</option>
                                </HTMLSelect>
                            </span>
                        </div>
                        <Virtuoso
                            components={{
                                Item: ({ children, ...props }) => {
                                    return (
                                        <div className='row-card' {...props}>
                                            {children}
                                        </div>
                                    );
                                },
                                Header: () => {
                                    return (<div className='row-container row-header'>
                                        <span>Gene</span>
                                        <span>Log-FC</span>
                                        <span>Δ-detected</span>
                                        <span>Expression &nbsp;
                                            <Tooltip2 content="bar represents the mean expression of the gene and the color gradient represents detected." openOnTargetFocus={false}>
                                                <Icon size={12} icon="help"></Icon>
                                            </Tooltip2>
                                        </span>
                                        <span></span>
                                    </div>)
                                }
                            }}
                            className='marker-list'
                            totalCount={sortedRows.length}
                            itemContent={index => {
                                const row = sortedRows[index];
                                const rowexp = row.expanded;
                                const rowExpr = row.expr; //geneExprData[row.gene];

                                return (
                                    <div>
                                        <div className='row-container'>
                                            <span>{row.gene}</span>
                                            {/* <span>Cohen: {row.cohen.toFixed(4)}, AUC</span> */}
                                            {/* {<Cell minmax={lfcMinMax}
                                                score={row.lfc} color="#F5498B"
                                            />}
                                            {<Cell minmax={deltaMinMax}
                                                score={row.delta} color="#4580E6"
                                            />} */}
                                            {
                                                <Popover2
                                                    popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                                                    hasBackdrop={false}
                                                    interactionKind="hover"
                                                    placement='auto'
                                                    hoverOpenDelay={500}
                                                    modifiers={{
                                                        arrow: { enabled: true },
                                                        flip: { enabled: true },
                                                        preventOverflow: { enabled: true },
                                                    }}
                                                    content={
                                                        <Card elevation={Elevation.ZERO}>
                                                            <table>
                                                                <tr>
                                                                    <td></td>
                                                                    <th scope="col">{row.gene}</th>
                                                                    <th scope="col">Overall</th>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Log-FC</th>
                                                                    <td>{row.lfc.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{lfcMinMax[0].toFixed(2)}, {lfcMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Δ-detected</th>
                                                                    <td>{row.delta.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{deltaMinMax[0].toFixed(2)}, {deltaMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Detected</th>
                                                                    <td>{row.detected.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{detectedMinMax[0].toFixed(2)}, {detectedMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Expression</th>
                                                                    <td>{row.mean.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{meanMinMax[0].toFixed(2)}, {meanMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                            </table>
                                                        </Card>
                                                    }
                                                >
                                                    <HeatmapCell minmax={lfcMinMax} colorscale={d3.interpolateRdBu} score={row.lfc} />
                                                </Popover2>
                                            }
                                            {
                                                <Popover2
                                                    popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                                                    hasBackdrop={false}
                                                    interactionKind="hover"
                                                    placement='auto'
                                                    hoverOpenDelay={500}
                                                    modifiers={{
                                                        arrow: { enabled: true },
                                                        flip: { enabled: true },
                                                        preventOverflow: { enabled: true },
                                                    }}
                                                    content={
                                                        <Card elevation={Elevation.ZERO}>
                                                            <table>
                                                                <tr>
                                                                    <td></td>
                                                                    <th scope="col">{row.gene}</th>
                                                                    <th scope="col">Overall</th>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Δ-detected</th>
                                                                    <td>{row.delta.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{deltaMinMax[0].toFixed(2)}, {deltaMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Detected</th>
                                                                    <td>{row.detected.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{detectedMinMax[0].toFixed(2)}, {detectedMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Log-FC</th>
                                                                    <td>{row.lfc.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{lfcMinMax[0].toFixed(2)}, {lfcMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Expression</th>
                                                                    <td>{row.mean.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{meanMinMax[0].toFixed(2)}, {meanMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                            </table>
                                                        </Card>
                                                    }
                                                >
                                                    <HeatmapCell minmax={deltaMinMax} colorscale={d3.interpolateRdBu} score={row.delta} />
                                                </Popover2>}
                                            {
                                                <Popover2
                                                    popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                                                    hasBackdrop={false}
                                                    interactionKind="hover"
                                                    placement='auto'
                                                    hoverOpenDelay={500}
                                                    modifiers={{
                                                        arrow: { enabled: true },
                                                        flip: { enabled: true },
                                                        preventOverflow: { enabled: true },
                                                    }}
                                                    content={
                                                        <Card elevation={Elevation.ZERO}>
                                                            <table>
                                                                <tr>
                                                                    <td></td>
                                                                    <th scope="col">{row.gene}</th>
                                                                    <th scope="col">Overall</th>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Expression</th>
                                                                    <td>{row.mean.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{meanMinMax[0].toFixed(2)}, {meanMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Log-FC</th>
                                                                    <td>{row.lfc.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{lfcMinMax[0].toFixed(2)}, {lfcMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Δ-detected</th>
                                                                    <td>{row.delta.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{deltaMinMax[0].toFixed(2)}, {deltaMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                                <tr>
                                                                    <th scope="row">Detected</th>
                                                                    <td>{row.detected.toFixed(2)}</td>
                                                                    <td style={{ fontStyle: 'italic' }}>∈ [{detectedMinMax[0].toFixed(2)}, {detectedMinMax[1].toFixed(2)}]</td>
                                                                </tr>
                                                            </table>
                                                        </Card>
                                                    }
                                                >
                                                    <Cell minmax={meanMinMax} colorscale={detectedScale}
                                                        score={row.mean} colorscore={row.detected}
                                                    />
                                                </Popover2>}
                                            {/* {<Cell minmax={[0,1]}
                                                score={row.detected} color={detectedScale(row.detected)}
                                            />} */}
                                            <div className='row-action'>
                                                <Button icon={rowexp ? 'minus' : 'plus'} small={true} fill={false}
                                                    className='row-action'
                                                    onClick={() => {
                                                        let tmp = { ...selectedClusterSummary };
                                                        tmp[row.gene].expanded = !tmp[row.gene].expanded;
                                                        setSelectedClusterSummary(tmp);

                                                        if (!rowExpr) {
                                                            setReqGene(row.gene);
                                                        }
                                                    }}
                                                >
                                                </Button>
                                                <Button small={true} fill={false}
                                                    className='row-action'
                                                    onClick={() => {
                                                        if (row.gene === gene) {
                                                            setGene(null);
                                                        } else {
                                                            setGene(row.gene);
                                                            if (!rowExpr) {
                                                                setReqGene(row.gene);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Icon icon={'tint'}
                                                        color={row.gene === gene ? clusterColors[selectedCluster] : ''}
                                                    ></Icon>
                                                </Button>
                                            </div>
                                        </div>
                                        <Collapse isOpen={rowexp}>
                                            {/* <Histogram data={rowExpr} color={clusterColors[selectedCluster]} /> */}
                                            {clusArrayStacked && <StackedHistogram data={rowExpr}
                                                color={clusterColors[selectedCluster]}
                                                clusters={clusArrayStacked} />}
                                        </Collapse>
                                    </div>
                                )
                            }}
                        />
                        <div className='marker-footer'>
                            <H5 className='marker-footer-title'>Filter Markers</H5>

                            <div className='marker-filter-container'>
                                <Tag className="marker-filter-container-tag" minimal={true} intent='primary'>Log-FC</Tag>
                                <Histogram data={lfcs} height={35} color="#F5498B" />
                                <div className='marker-filter-slider'>
                                    {lfcMinMax && <RangeSlider
                                        min={lfcMinMax[0]}
                                        max={lfcMinMax[1]}
                                        stepSize={Math.round(lfcMinMax[1] - lfcMinMax[0]) / 25}
                                        onChange={(val) => handleMarkerFilter(val, "lfc")}
                                        value={markerFilter?.["lfc"] ? markerFilter?.["lfc"] : lfcMinMax}
                                        vertical={false}
                                    />}
                                </div>
                            </div>

                            <div className='marker-filter-container'>
                                <Tag className="marker-filter-container-tag" minimal={true} intent='primary'>Δ-detected</Tag>
                                <Histogram data={deltas} height={35} color="#4580E6" />
                                <div className='marker-filter-slider'>
                                    {deltaMinMax && <RangeSlider
                                        min={deltaMinMax[0]}
                                        max={deltaMinMax[1]}
                                        stepSize={Math.round(deltaMinMax[1] - deltaMinMax[0]) / 25}
                                        onChange={(val) => handleMarkerFilter(val, "delta")}
                                        value={markerFilter?.["delta"] ? markerFilter?.["delta"] : deltaMinMax}
                                        vertical={false}
                                    />}
                                </div>
                            </div>

                            <div className='marker-filter-container'>
                                <Tag className="marker-filter-container-tag" minimal={true} intent='primary'>Mean</Tag>
                                <Histogram data={means} height={35} />
                                <div className='marker-filter-slider'>
                                    {meanMinMax && <RangeSlider
                                        min={meanMinMax[0]}
                                        max={meanMinMax[1]}
                                        stepSize={Math.round(meanMinMax[1] - meanMinMax[0]) / 25}
                                        onChange={(val) => handleMarkerFilter(val, "mean")}
                                        value={markerFilter?.["mean"] ? markerFilter?.["mean"] : meanMinMax}
                                        vertical={false}
                                    />}
                                </div>
                            </div>

                            <div className='marker-filter-container'>
                                <Tag className="marker-filter-container-tag" minimal={true} intent='primary'>Detected</Tag>
                                <Histogram data={detects} height={35} />
                                <div className='marker-filter-slider'>
                                    {detectedMinMax && <RangeSlider
                                        min={detectedMinMax[0]}
                                        max={detectedMinMax[1]}
                                        stepSize={Math.round(detectedMinMax[1] - detectedMinMax[0]) / 25}
                                        onChange={(val) => handleMarkerFilter(val, "detected")}
                                        value={markerFilter?.["detected"] ? markerFilter?.["detected"] : detectedMinMax}
                                        vertical={false}
                                    />}
                                </div>
                            </div>
                            {/* <Label>AUC</Label>
                            <div className='marker-filter-container'></div>
                            <Label>Cohen</Label>
                            <div className='marker-filter-container'></div> */}
                        </div>
                    </div>
                    : ""
            }
        </div>
    );
};

export default MarkerPlot;
