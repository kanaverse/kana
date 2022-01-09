import React, { useEffect, useContext, useState, useMemo } from 'react';
import {
    Button, H4, H5, Icon, Collapse, InputGroup, Text,
    RangeSlider, Tag, HTMLSelect, Classes, Card, Elevation
} from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { Virtuoso } from 'react-virtuoso';
import * as d3 from 'd3';

import { AppContext } from '../../context/AppContext';
import StackedHistogram from '../Plots/StackedHistogram';

import Cell from '../Plots/Cell.js';
import HeatmapCell from '../Plots/HeatmapCell';
import './markers.css';

const MarkerPlot = () => {

    const {
        genesInfo, clusterData, selectedClusterSummary, setSelectedClusterSummary,
        selectedCluster, setSelectedCluster, setClusterRank,
        setReqGene, clusterColors, gene, setGene, selectedClusterIndex,
        customSelection, geneColSel, setGeneColSel } = useContext(AppContext);

    // what cluster is selected
    const [clusSel, setClusSel] = useState(null);
    // binary vector for stacked histogram plots, this cluster (1) vs others (0)
    const [clusArrayStacked, setClusArrayStacked] = useState(null);
    // gene search
    const [searchInput, setSearchInput] = useState(null);

    // ranges for various marker stats
    const [meanMinMax, setMeanMinMax] = useState(null);
    const [deltaMinMax, setDeltaMinMax] = useState(null);
    const [lfcMinMax, setLfcMinMax] = useState(null);
    const [detectedMinMax, setDetectedMinMax] = useState(null);
    const [minMaxs, setMinMaxs] = useState(null);

    // stores range filters from UI
    const [markerFilter, setMarkerFilter] = useState({});
    // records to show after filtering
    const [prosRecords, setProsRecords] = useState(null);

    // scale to use for detected on expression bar
    const detectedScale = d3.interpolateRdYlBu; //d3.interpolateRdBu;
    // d3.scaleSequential()
    // .domain([0, 1])
    // .range(["red", "blue"])
    // .interpolate(d3.interpolateHcl);

    // if a cluster changes, its summary data is requested from the worker
    // pre-process results for UI
    useEffect(() => {
        if (!selectedClusterSummary) return selectedClusterSummary;

        let trecs = selectedClusterSummary;

        if (trecs.length === 0) return trecs;

        let tmpmeans = trecs.map(x => x?.mean);
        let tmeanMinMax = d3.extent(tmpmeans)
        let tmeanval = tmeanMinMax[1] === 0 ? 0.01 : tmeanMinMax[1];
        setMeanMinMax([parseFloat(tmeanMinMax[0].toFixed(2)), parseFloat(tmeanval.toFixed(2))]);

        let tmpdeltas = trecs.map(x => x?.delta);
        let tdeltaMinMax = d3.extent(tmpdeltas)
        let tdeltaval = tdeltaMinMax[1] === 0 ? 0.01 : tdeltaMinMax[1];
        setDeltaMinMax([parseFloat(tdeltaMinMax[0].toFixed(2)), parseFloat(tdeltaval.toFixed(2))]);

        let tmplfcs = trecs.map(x => x?.lfc);
        let tlfcsMinMax = d3.extent(tmplfcs)
        let tlfcsval = tlfcsMinMax[1] === 0 ? 0.01 : tlfcsMinMax[1];
        setLfcMinMax([parseFloat(tlfcsMinMax[0].toFixed(2)), parseFloat(tlfcsval.toFixed(2))]);

        let tmpdetects = trecs.map(x => x?.detected);
        let tdetectsMinMax = d3.extent(tmpdetects)
        let tdetecval = tdetectsMinMax[1] === 0 ? 0.01 : tdetectsMinMax[1];
        setDetectedMinMax([parseFloat(tdetectsMinMax[0].toFixed(2)), parseFloat(tdetecval.toFixed(2))]);

        setMinMaxs({
            "lfc": [parseFloat(tlfcsMinMax[0].toFixed(2)), parseFloat(tlfcsval.toFixed(2))],
            "mean": [parseFloat(tmeanMinMax[0].toFixed(2)), parseFloat(tmeanval.toFixed(2))],
            "detected": [parseFloat(tdetectsMinMax[0].toFixed(2)), parseFloat(tdetecval.toFixed(2))],
            "delta": [parseFloat(tdeltaMinMax[0].toFixed(2)), parseFloat(tdeltaval.toFixed(2))],
        });

        let sortedRows = [...trecs];

        setMarkerFilter({
            "lfc": [0, parseFloat(tlfcsval.toFixed(2))],
            "delta": [0, parseFloat(tdeltaval.toFixed(2))]
        });

        setProsRecords(sortedRows);

    }, [selectedClusterSummary]);

    // genes to show, hook for filters and input
    const sortedRows = useMemo(() => {

        if (!prosRecords) return [];

        let sortedRows = prosRecords;
        if (markerFilter) {
            for (let key in markerFilter) {
                let range = markerFilter[key];
                if (range[0] === minMaxs[key][0] && range[1] === minMaxs[key][1]) continue;
                sortedRows = sortedRows.filter((x) => x[key] >= range[0] && x[key] <= range[1]);
            }
        }

        if (!searchInput || searchInput === "") return sortedRows;

        sortedRows = sortedRows.filter((x) => genesInfo[geneColSel][x.gene].toLowerCase().indexOf(searchInput.toLowerCase()) !== -1);
        return sortedRows;
    }, [prosRecords, searchInput, markerFilter]);

    // update clusters when custom selection is made in the UI
    useEffect(() => {
        if (clusterData?.clusters) {
            let max_clusters = Math.max(...clusterData.clusters);

            let clus = [];
            for (let i = 0; i < max_clusters + 1; i++) {
                clus.push(i + 1);
            }

            clus = clus.concat(Object.keys(customSelection));

            setClusSel(clus);
            if (selectedCluster === null) {
                setSelectedCluster(0);
            }
        }
    }, [clusterData, customSelection, selectedCluster]);

    // hook for figure out this vs other cells for stacked histograms
    useEffect(() => {
        var clusArray = [];
        if (String(selectedCluster).startsWith("cs")) {
            clusterData?.clusters?.forEach((x, i) => customSelection[selectedCluster].includes(i) ? clusArray.push(1) : clusArray.push(0));
        } else {
            clusterData?.clusters?.forEach(x => x === selectedCluster ? clusArray.push(1) : clusArray.push(0));
        }
        setClusArrayStacked(clusArray);
    }, [selectedCluster]);

    const handleMarkerFilter = (val, key) => {

        let tmp = { ...markerFilter };
        tmp[key] = val;
        setMarkerFilter(tmp);
    }

    const createColorScale = (lower, upper) => {
        if (lower > 0) {
            return `linear-gradient(to right, yellow 0%, red 100%)`;
        } else if (upper < 0) {
            return `linear-gradient(to right, blue 0%, yellow 100%)`;
        } else {
            var limit = 0;
            if (lower < 0) {
                limit = -lower;
            }
            if (upper > 0 && upper > limit) {
                limit = upper;
            }
            var scaler = d3.scaleSequential(d3.interpolateRdYlBu).domain([limit, -limit]);

            var leftcol = scaler(lower);
            var rightcol = scaler(upper);
            var midprop = Math.round(-lower / (upper - lower) * 100);
            return `linear-gradient(to right, ${leftcol} 0%, yellow ${midprop}%, ${rightcol} 100%)`;
        }
    };

    return (
        <div className='marker-container'>
            <Popover2
                popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                hasBackdrop={false}
                interactionKind="hover"
                placement='left'
                hoverOpenDelay={500}
                modifiers={{
                    arrow: { enabled: true },
                    flip: { enabled: true },
                    preventOverflow: { enabled: true },
                }}
                content={
                    <Card style={{
                        width: '450px'
                    }} elevation={Elevation.ZERO}
                    >
                        <p>This panel shows the marker genes that are upregulated in the cluster of interest compared to some or all of the other clusters.
                            Hopefully, this allows us to assign some kind of biological meaning to each cluster based on the functions of the top markers.</p>
                        <p>Several ranking schemes are available depending on how we quantify the strength of the upregulation.</p>
                    </Card>
                }
            >
                <H4 style={{
                    textDecoration: "underline",
                    cursor: "help"
                }}>Marker Genes</H4>
            </Popover2>
            {
                clusSel ?
                    <HTMLSelect
                        onChange={(x) => {
                            let tmpselection = x.currentTarget?.value;
                            if (tmpselection.startsWith("Cluster")) {
                                tmpselection = parseInt(tmpselection.replace("Cluster ", "")) - 1
                            } else if (tmpselection.startsWith("Custom")) {
                                tmpselection = tmpselection.replace("Custom Selection ", "")
                            }
                            setSelectedCluster(tmpselection);

                            setMarkerFilter({});
                            setGene(null);
                        }}>
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
                            <span style={{
                                textDecoration: "underline",
                                cursor: "help"
                            }}>
                                <Popover2
                                    popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                                    hasBackdrop={false}
                                    interactionKind="hover"
                                    placement='left'
                                    hoverOpenDelay={50}
                                    modifiers={{
                                        arrow: { enabled: true },
                                        flip: { enabled: true },
                                        preventOverflow: { enabled: true },
                                    }}
                                    content={
                                        <Card style={{
                                            width: '450px'
                                        }} elevation={Elevation.ZERO}
                                        >
                                            <p>Choose the effect size and summary statistic to use for ranking markers. For each gene, effect sizes are computed by pairwise comparisons between clusters:</p>
                                            <ul>
                                                <li><strong><em>Cohen's d</em></strong> is the ratio of the log-fold change to the average standard deviation between two clusters.</li>
                                                <li>The area under the curve (<strong><em>AUC</em></strong>) is the probability that a randomly chosen observation from one cluster is greater than a randomly chosen observation from another cluster.</li>
                                                <li>The log-fold change (<strong><em>lfc</em></strong>) is the difference in the mean log-expression between two clusters.</li>
                                                <li>The <strong><em>Δ-detected</em></strong> is the difference in the detected proportions between two clusters.</li>
                                            </ul>
                                            <p>For each cluster, the effect sizes from the comparisons to all other clusters are summarized into a single statistic for ranking purposes:</p>
                                            <ul>
                                                <li><strong><em>mean</em></strong> uses the mean effect sizes from all pairwise comparisons. This generally provides a good compromise between exclusitivity and robustness.</li>
                                                <li><strong><em>min</em></strong> uses the minimum effect size from all pairwise comparisons. This promotes markers that are exclusively expressed in the chosen cluster, but will perform poorly if no such genes exist.</li>
                                                <li><strong><em>min-rank</em></strong> ranks genes according to their best rank in each of the individual pairwise comparisons. This is the most robust as the combination of top-ranked genes will always be able to distinguish the chosen cluster from the other clusters, but may not give high rankings to exclusive genes.</li>
                                            </ul>
                                        </Card>
                                    }
                                >
                                    <Icon intent="warning" icon="sort" style={{
                                        paddingRight: '5px'
                                    }}></Icon>
                                </Popover2>
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
                                        <span>
                                            <HTMLSelect large={false} minimal={true} defaultValue={geneColSel}
                                                onChange={(nval, val) => setGeneColSel(nval?.currentTarget?.value)}>
                                                {
                                                    Object.keys(genesInfo).map((x, i) => (
                                                        <option key={i}>{x}</option>
                                                    ))
                                                }
                                            </HTMLSelect>
                                        </span>
                                        <Popover2
                                            popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                                            hasBackdrop={false}
                                            interactionKind="hover"
                                            placement='auto'
                                            hoverOpenDelay={50}
                                            modifiers={{
                                                arrow: { enabled: true },
                                                flip: { enabled: true },
                                                preventOverflow: { enabled: true },
                                            }}
                                            content={
                                                <Card style={{
                                                    width: '250px'
                                                }} elevation={Elevation.ZERO}>
                                                    <p>Log-fold change in mean expression between cells inside and outside the cluster.</p>
                                                    <p>Use the color scale below to apply a filter on this statistic.</p>
                                                </Card>
                                            }>
                                            <span style={{
                                                textDecoration: "underline",
                                                cursor: "help"
                                            }}>
                                                Log-FC
                                            </span>
                                        </Popover2>
                                        <Popover2
                                            popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                                            hasBackdrop={false}
                                            interactionKind="hover"
                                            placement='auto'
                                            hoverOpenDelay={50}
                                            modifiers={{
                                                arrow: { enabled: true },
                                                flip: { enabled: true },
                                                preventOverflow: { enabled: true },
                                            }}
                                            content={
                                                <Card style={{
                                                    width: '250px'
                                                }} elevation={Elevation.ZERO}>
                                                    <p>
                                                        Difference in the proportion of detected genes inside and outside the cluster.</p>
                                                    <p>Use the color scale below to apply a filter on this statistic.</p>
                                                </Card>}>
                                            <span style={{
                                                textDecoration: "underline",
                                                cursor: "help"
                                            }}>
                                                Δ-detected
                                            </span>
                                        </Popover2>
                                        <Popover2
                                            popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                                            hasBackdrop={false}
                                            interactionKind="hover"
                                            placement='auto'
                                            hoverOpenDelay={50}
                                            modifiers={{
                                                arrow: { enabled: true },
                                                flip: { enabled: true },
                                                preventOverflow: { enabled: true },
                                            }}
                                            content={
                                                <Card style={{
                                                    width: '250px'
                                                }} elevation={Elevation.ZERO}>
                                                    <p>The intensity of color represents the mean expression of the gene in this cluster,
                                                        while the length of the bar represents the percentage of cells in which any expression is detected.
                                                    </p>
                                                </Card>}>
                                            <span style={{
                                                textDecoration: "underline",
                                                cursor: "help"
                                            }}>
                                                Expression
                                            </span>
                                        </Popover2>
                                    </div>)
                                }
                            }}
                            className='marker-list'
                            totalCount={sortedRows.length}
                            itemContent={index => {
                                const row = sortedRows[index];
                                const rowexp = row.expanded;
                                const rowExpr = row.expr;

                                return (
                                    <div>
                                        <div className='row-container'>
                                            <span style={{
                                                color: row.gene === gene ?
                                                    String(selectedCluster).startsWith("cs") ? clusterColors[Math.max(...clusterData?.clusters) + parseInt(selectedCluster.replace("cs", ""))] : clusterColors[selectedCluster]
                                                    : 'black'
                                            }}
                                                className={row.gene === gene ? 'marker-gene-title-selected' : 'marker-gene-title'}>{genesInfo[geneColSel][row.gene]}</span>
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
                                                                    <th scope="col">{genesInfo[geneColSel][row.gene]}</th>
                                                                    <th scope="col">This cluster</th>
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
                                                    }>
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
                                                                    <th scope="col">{genesInfo[geneColSel][row.gene]}</th>
                                                                    <th scope="col">This cluster</th>
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
                                                    }>
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
                                                                    <th scope="col">{genesInfo[geneColSel][row.gene]}</th>
                                                                    <th scope="col">This cluster</th>
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
                                                    }>
                                                    <Cell minmax={meanMinMax} colorscale={detectedScale}
                                                        score={row.mean} colorscore={row.detected}
                                                    />
                                                </Popover2>}
                                            <div className='row-action'>
                                                <Button icon={rowexp ? 'minus' : 'plus'} small={true} fill={false}
                                                    className='row-action'
                                                    onClick={() => {
                                                        let tmp = [...selectedClusterSummary];
                                                        var gindex = selectedClusterIndex[row.gene];
                                                        tmp[gindex].expanded = !tmp[gindex].expanded;
                                                        setSelectedClusterSummary(tmp);
                                                        if (!rowExpr && tmp[gindex].expanded) {
                                                            setReqGene(row.gene);
                                                        } else {
                                                            setReqGene(null);
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
                                                        color={row.gene === gene ?
                                                            String(selectedCluster).startsWith("cs") ? clusterColors[Math.max(...clusterData?.clusters) + parseInt(selectedCluster.replace("cs", ""))] : clusterColors[selectedCluster]
                                                            : ''}
                                                    ></Icon>
                                                </Button>
                                            </div>
                                        </div>
                                        <Collapse isOpen={rowexp}>
                                            {/* <Histogram data={rowExpr} color={clusterColors[selectedCluster]} /> */}
                                            {rowExpr && <StackedHistogram data={rowExpr}
                                                color={String(selectedCluster).startsWith("cs") ? clusterColors[Math.max(...clusterData?.clusters) + parseInt(selectedCluster.replace("cs", ""))] : clusterColors[selectedCluster]}
                                                clusterlabel={String(selectedCluster).startsWith("cs") ? `Custom Selection ${selectedCluster}` : `Cluster ${parseInt(selectedCluster + 1)}`}
                                                clusters={clusArrayStacked} />}
                                        </Collapse>
                                    </div>
                                )
                            }}
                        />
                        <div className='marker-footer'>
                            <H5>
                                <Popover2
                                    popoverClassName={Classes.POPOVER2_CONTENT_SIZING}
                                    hasBackdrop={false}
                                    interactionKind="hover"
                                    placement='left'
                                    hoverOpenDelay={500}
                                    modifiers={{
                                        arrow: { enabled: true },
                                        flip: { enabled: true },
                                        preventOverflow: { enabled: true },
                                    }}
                                    content={
                                        <Card style={{
                                            width: '450px'
                                        }} elevation={Elevation.ZERO}
                                        >
                                            <p>Filter the set of marker genes according to various statistics.
                                                For example, this can be used to apply a minimum threshold on the <strong><em>log-fold change</em></strong> or <strong><em>Δ-detected</em></strong>, to focus on genes with strong upregulation;
                                                or to apply a maximum threshold on the expression, to remove constitutively expressed genes.</p>
                                            <p>Note that this does not change the relative ordering in the table above.</p>
                                        </Card>
                                    }
                                >
                                    <Text style={{
                                        textDecoration: "underline",
                                        cursor: "help"
                                    }}>Filter Markers</Text>
                                </Popover2>
                            </H5>

                            <div className='marker-filter-container'>
                                <Tag className="marker-filter-container-tag" minimal={true} intent='primary'>Log-FC</Tag>
                                {/* <Histogram data={lfcs} height={35} minmax={lfcMinMax}/> */}
                                {lfcMinMax &&
                                    <div className='marker-slider-container'>
                                        <div className='marker-filter-gradient'>
                                            <div
                                                style={{
                                                    backgroundImage: createColorScale(lfcMinMax[0], lfcMinMax[1]),
                                                    width: '100%', height: '5px',
                                                }}></div>&nbsp;
                                        </div>
                                        <RangeSlider
                                            className='marker-filter-slider'
                                            min={lfcMinMax[0]}
                                            max={lfcMinMax[1]}
                                            labelValues={lfcMinMax}
                                            stepSize={parseFloat((Math.abs(lfcMinMax[1] - lfcMinMax[0]) / 20).toFixed(2))}
                                            onChange={(val) => handleMarkerFilter(val, "lfc")}
                                            value={markerFilter?.["lfc"] ? markerFilter?.["lfc"] : [0, lfcMinMax[1]]}
                                            vertical={false}
                                        />
                                    </div>}
                            </div>

                            <div className='marker-filter-container'>
                                <Tag className="marker-filter-container-tag" minimal={true} intent='primary'>Δ-detected</Tag>
                                {/* <Histogram data={deltas} height={35} color="#4580E6" minmax={deltaMinMax} /> */}
                                {deltaMinMax &&
                                    <div className='marker-slider-container'>
                                        <div className='marker-filter-gradient'>
                                            <div
                                                style={{
                                                    backgroundImage: createColorScale(deltaMinMax[0], deltaMinMax[1]),
                                                    width: '100%', height: '5px',
                                                }}></div>&nbsp;
                                        </div>
                                        <RangeSlider
                                            className='marker-filter-slider'
                                            min={deltaMinMax[0]}
                                            max={deltaMinMax[1]}
                                            labelValues={deltaMinMax}
                                            stepSize={parseFloat((Math.abs(deltaMinMax[1] - deltaMinMax[0]) / 20).toFixed(2))}
                                            onChange={(val) => handleMarkerFilter(val, "delta")}
                                            value={markerFilter?.["delta"] ? markerFilter?.["delta"] : [0, deltaMinMax[1]]}
                                            vertical={false}
                                        />
                                    </div>}
                            </div>

                            <div className='marker-filter-container'>
                                <Tag className="marker-filter-container-tag" minimal={true} intent='primary'>Expression (mean)</Tag>
                                {/* <Histogram data={means} height={35} minmax={meanMinMax} /> */}
                                {meanMinMax &&
                                    <div className='marker-slider-container'>
                                        <div className='marker-filter-gradient'>
                                            <div
                                                style={{
                                                    backgroundImage: `linear-gradient(to right, #F5F8FA, #2965CC)`,
                                                    width: '100%', height: '5px',
                                                }}></div>&nbsp;
                                        </div>
                                        <RangeSlider
                                            className='marker-filter-slider'
                                            min={meanMinMax[0]}
                                            max={meanMinMax[1]}
                                            labelValues={meanMinMax}
                                            stepSize={parseFloat((Math.abs(meanMinMax[1] - meanMinMax[0]) / 20).toFixed(2))}
                                            onChange={(val) => handleMarkerFilter(val, "mean")}
                                            value={markerFilter?.["mean"] ? markerFilter?.["mean"] : meanMinMax}
                                            vertical={false}
                                        />
                                    </div>}
                            </div>

                            <div className='marker-filter-container'>
                                <Tag className="marker-filter-container-tag" minimal={true} intent='primary'>Expression (detected)</Tag>
                                {/* <Histogram data={detects} height={35} minmax={detectedMinMax} /> */}
                                {detectedMinMax &&
                                    <div className='marker-slider-container'>
                                        {/* <div className='marker-filter-gradient'>
                                            <div
                                                style={{
                                                    backgroundImage: `linear-gradient(to right, yellow 33%, red 50%, blue 100%)`,
                                                    width: '100%', height: '5px',
                                                }}></div>&nbsp;
                                        </div> */}
                                        <RangeSlider
                                            className='marker-filter-slider'
                                            min={detectedMinMax[0]}
                                            max={detectedMinMax[1]}
                                            labelValues={detectedMinMax}
                                            stepSize={parseFloat((Math.abs(detectedMinMax[1] - detectedMinMax[0]) / 20).toFixed(2))}
                                            onChange={(val) => handleMarkerFilter(val, "detected")}
                                            value={markerFilter?.["detected"] ? markerFilter?.["detected"] : detectedMinMax}
                                            vertical={false}
                                        />
                                    </div>}
                            </div>
                        </div>
                    </div>
                    : ""
            }
        </div>
    );
};

export default React.memo(MarkerPlot);
