import React, { useEffect, useContext, useState, useMemo } from 'react';
import { Button, H4, Icon, Select, SelectProps, Collapse, Pre, Label, InputGroup, Card, Elevation } from "@blueprintjs/core";
import DataGrid, { RowRendererProps } from 'react-data-grid';
import { Virtuoso } from 'react-virtuoso';

import { AppContext } from '../../context/AppContext';
import Histogram from '../Plots/Histogram';
import './markers.css';

import Row from './Row';

const MarkerPlot = () => {

    const { clusterData, selectedClusterSummary, setSelectedClusterSummary,
        selectedCluster, setSelectedCluster, geneExprData,
        setGeneExprData, setReqGene, clusterColors, gene, setGene } = useContext(AppContext);
    const [clusSel, setClusSel] = useState(null);
    // const [recs, setRecs] = useState(null);
    const [sortColumns, setSortColumns] = useState([{
        columnKey: 'cohen',
        direction: 'DSC'
    }]);
    const [searchInput, setSearchInput] = useState(null);
    // const [recExp, setRecExp] = useState({});

    // useEffect(() => {
    //     // let records = {};
    //     if (selectedClusterSummary) {
    //         // selectedClusterSummary.means.forEach((x, i) => {
    //         //     let tgene = Array.isArray(selectedClusterSummary?.genes) ? selectedClusterSummary?.genes?.[i] : `Gene ${i + 1}`;
    //         //     records[tgene] = {
    //         //         "gene": tgene,
    //         //         "mean": x,
    //         //         // "auc": selectedClusterSummary?.auc?.[i],
    //         //         "cohen": selectedClusterSummary?.cohen?.[i],
    //         //         "detected": selectedClusterSummary?.detected?.[i],
    //         //         "expanded": false,
    //         //         "expr": null,
    //         //     }
    //         // });

    //         setRecs(selectedClusterSummary);
    //     }
    // }, [selectedClusterSummary]);

    const columns = [
        { key: 'gene', name: 'Gene', sortable: true },
        { key: 'mean', name: 'Mean', sortable: true },
        // { key: 'auc', name: 'AUC' },
        { key: 'cohen', name: 'Cohen', sortable: true },
        { key: 'detected', name: 'Detected', sortable: true },
    ];

    const getComparator = (sortColumn) => {
        switch (sortColumn) {
            case 'gene':
                return (a, b) => {
                    return a[sortColumn].localeCompare(b[sortColumn]);
                };
            case 'mean':
            case 'cohen':
            case 'detected':
            case 'gene':
                return (a, b) => {
                    return a[sortColumn] - b[sortColumn];
                };
            default:
                throw new Error(`unsupported sortColumn: "${sortColumn}"`);
        }
    }

    const sortedRows = useMemo(() => {
        console.log("sortedRows");

        if (!selectedClusterSummary) return selectedClusterSummary;

        let trecs = Object.values(selectedClusterSummary);
        if (sortColumns.length === 0) return trecs;

        if (trecs.length == 0) return trecs;
        // if (!Array.isArray(recs)) return recs;

        let sortedRows = [...trecs];
        sortedRows.sort((a, b) => {
            for (const sort of sortColumns) {
                const comparator = getComparator(sort.columnKey);
                const compResult = comparator(a, b);
                if (compResult !== 0) {
                    return sort.direction === 'ASC' ? compResult : -compResult;
                }
            }
            return 0;
        });

        if (!searchInput || searchInput == "") return sortedRows;

        sortedRows = sortedRows.filter((x) => x["gene"].indexOf(searchInput) != -1);
        return sortedRows;
    }, [selectedClusterSummary, sortColumns, searchInput]);

    useEffect(() => {
        if (clusterData?.clusters) {
            let max_clusters = Math.max(...clusterData.clusters);

            let clus = [];
            for (let i = 0; i < max_clusters; i++) {
                clus.push(i);
            }

            setClusSel(clus);
            setSelectedCluster(0);
        }
    }, [clusterData]);

    return (
        <div className='marker-container'>
            <H4>Marker Genes</H4>
            {
                clusSel ?
                    <select
                        onChange={(x) => setSelectedCluster(parseInt(x.currentTarget?.value.replace("Cluster ", "")) - 1)}
                    >
                        {
                            clusSel.map((x, i) => (
                                <option key={i}>Cluster {x + 1}</option>
                            ))
                        }
                    </select>
                    : ""
            }
            {/* {
                recs &&
                <Histogram data={selectedClusterSummary.means} />
            }
            {
                recs &&
                <Histogram data={selectedClusterSummary.cohen} />
            }
            {
                recs &&
                <Histogram data={selectedClusterSummary.detected} />
            } */}
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
                            <Label>sort by
                                <select
                                    onChange={(x) => {
                                        setSortColumns([{
                                            columnKey: x.currentTarget.value,
                                            direction: 'DSC'
                                        }])
                                    }}>
                                    <option>mean</option>
                                    <option selected>cohen</option>
                                </select>
                            </Label>
                        </div>
                        <Virtuoso
                            components={{
                                Item: ({ children, ...props }) => {
                                    return (
                                        // <Card className='row-card' interactive={false} {...props} elevation={0}>
                                        //     {children}
                                        // </Card>
                                        <div className='row-card' {...props}>
                                            {children}
                                        </div>
                                    );
                                },
                                // Header: (() => {
                                //     return (
                                //         <div className='row-container'
                                //             style={{ paddingLeft: '10px', paddingRight: '10px' }}>
                                //             <H5>Gene </H5>
                                //             {/* <H5>Scores</H5> */}
                                //             <H5>Actions</H5>
                                //         </div>
                                //     )
                                // })
                            }}
                            className='marker-list'
                            style={{ minHeight: '800px' }}
                            totalCount={sortedRows.length}
                            // data={sortedRows}
                            itemContent={index => {
                                const row = sortedRows[index];
                                const rowexp = row.expanded;
                                const rowExpr = row.expr; //geneExprData[row.gene];

                                return (
                                    <div>
                                        <div className='row-container'>
                                            {/* <div> */}
                                            <span>{row.gene}</span>
                                            <span>Cohen: {row.cohen.toFixed(4)}, AUC</span>
                                            <span>Mean: {row.mean.toFixed(4)}, Detected: {row.detected}</span>
                                            {/* </div> */}
                                            <div className='row-action'>
                                                <Button icon={rowexp ? 'minus' : 'plus'} small={true} fill={false}
                                                    className='row-action' fill={false}
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
                                                    className='row-action' fill={false}
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
                                                    <Icon icon={'tint'} small={true} fill={false}
                                                        fill={false}
                                                        color={row.gene === gene ? clusterColors[selectedCluster] : ''}
                                                    ></Icon>
                                                </Button>
                                            </div>
                                        </div>
                                        <Collapse isOpen={rowexp}>
                                            This will show a histogram
                                            <Histogram data={rowExpr} color={clusterColors[selectedCluster]} />
                                        </Collapse>
                                    </div>
                                )
                            }}
                        // itemContent={index => <Row index={index} row={sortedRows[index]} />}
                        />
                    </div>
                    : ""
            }
        </div>
    );
};

export default MarkerPlot;
