import React, { useEffect, useContext, useState, useMemo } from 'react';
import { Button, H4, H5, Select, SelectProps, Collapse, Pre, Label, InputGroup, Card, Elevation } from "@blueprintjs/core";
import DataGrid, { RowRendererProps } from 'react-data-grid';
import { Virtuoso } from 'react-virtuoso';

import { AppContext } from '../../context/AppContext';
import Histogram from '../Plots/Histogram';
import './markers.css';

import Row from './Row';

const MarkerPlot = () => {

    const { clusterData, selectedClusterSummary,
        selectedCluster, setSelectedCluster, geneExpData } = useContext(AppContext);
    const [clusSel, setClusSel] = useState(null);
    const [recs, setRecs] = useState(null);
    const [sortColumns, setSortColumns] = useState([{
        columnKey: 'cohen',
        direction: 'DSC'
    }]);
    const [searchInput, setSearchInput] = useState(null);
    const [recExp, setRecExp] = useState([]);

    useEffect(() => {
        let records = [];
        if (selectedClusterSummary) {
            selectedClusterSummary.means.forEach((x, i) => {
                records.push({
                    "gene": Array.isArray(selectedClusterSummary?.genes) ? selectedClusterSummary?.genes?.[i] : `Gene ${i + 1}`,
                    "mean": x,
                    // "auc": selectedClusterSummary?.auc?.[i],
                    "cohen": selectedClusterSummary?.cohen?.[i],
                    "detected": selectedClusterSummary?.detected?.[i],
                    "expanded": false,
                })
            });

            setRecs(records);
        }
    }, [selectedClusterSummary]);

    // const components = useMemo(() => {
    //     return {
    //         Item: ({ children, ...props }) => {
    //             return (
    //                 <Card interactive={false} {...props} elevation={Elevation.TWO}>
    //                     {children}
    //                 </Card>
    //             );
    //         },
    //     };
    // }, []);

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
        if (sortColumns.length === 0) return recs;

        if (!Array.isArray(recs)) return recs;

        let sortedRows = [...recs];
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
    }, [recs, sortColumns, searchInput]);

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
                recs ?
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
                                        <Card className='row-card' interactive={false} {...props} elevation={0}>
                                            {children}
                                        </Card>
                                    );
                                },
                                Header: (() => {
                                    return (
                                        <div className='row-container'
                                            style={{ paddingLeft: '10px', paddingRight: '10px' }}>
                                            <H5>Gene </H5>
                                            {/* <H5>Scores</H5> */}
                                            <H5>Actions</H5>
                                        </div>
                                    )
                                })
                            }}
                            className='marker-list'
                            style={{ height: '1000px' }}
                            totalCount={sortedRows.length}
                            data={sortedRows}
                            itemContent={index => {
                                const row = sortedRows[index];
                                const rowexp = recExp?.[index];
                                const rowExpr = geneExpData?.[index];

                                return (
                                    <div className='row-container'>
                                        <div>
                                            <H5>{row.gene}</H5>
                                            <span>Cohen: {row.cohen.toFixed(4)}, Mean: {row.mean.toFixed(4)}, Detected: {row.detected}</span>
                                            <Collapse isOpen={rowexp}>
                                                <Histogram data={rowExpr} />
                                            </Collapse>
                                        </div>
                                        <Button icon={'plus'} small={true} fill={false}
                                            className='row-action' fill={false}
                                            onClick={() => {
                                                let tmp = [...recExp];
                                                tmp[index] = !tmp[index];
                                                setRecExp(tmp);
                                            }}
                                        >
                                        </Button>
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