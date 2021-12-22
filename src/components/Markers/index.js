import React, { useEffect, useContext, useState, useMemo } from 'react';
import { Button, H4, Icon, Collapse, Label, InputGroup } from "@blueprintjs/core";
import { Virtuoso } from 'react-virtuoso';

import { AppContext } from '../../context/AppContext';
import Histogram from '../Plots/Histogram';
import StackedHistogram from '../Plots/StackedHistogram';

import './markers.css';

const MarkerPlot = () => {

    const { clusterData, selectedClusterSummary, setSelectedClusterSummary,
        selectedCluster, setSelectedCluster, 
         setReqGene, clusterColors, gene, setGene } = useContext(AppContext);
    const [clusSel, setClusSel] = useState(null);
    const [clusArrayStacked, setClusArrayStacked] = useState(null);
    const [sortColumns, setSortColumns] = useState([{
        columnKey: 'cohen',
        direction: 'DSC'
    }]);
    const [searchInput, setSearchInput] = useState(null);

    // const columns = [
    //     { key: 'gene', name: 'Gene', sortable: true },
    //     { key: 'mean', name: 'Mean', sortable: true },
    //     // { key: 'auc', name: 'AUC' },
    //     { key: 'cohen', name: 'Cohen', sortable: true },
    //     { key: 'detected', name: 'Detected', sortable: true },
    // ];

    const getComparator = (sortColumn) => {
        switch (sortColumn) {
            case 'gene':
                return (a, b) => {
                    return a[sortColumn].localeCompare(b[sortColumn]);
                };
            case 'mean':
            case 'cohen':
            case 'detected':
                return (a, b) => {
                    return a[sortColumn] - b[sortColumn];
                };
            default:
                throw new Error(`unsupported sortColumn: "${sortColumn}"`);
        }
    }

    const sortedRows = useMemo(() => {
        if (!selectedClusterSummary) return selectedClusterSummary;

        let trecs = Object.values(selectedClusterSummary);
        if (sortColumns.length === 0) return trecs;

        if (trecs.length === 0) return trecs;

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

        if (!searchInput || searchInput === "") return sortedRows;

        sortedRows = sortedRows.filter((x) => x["gene"].indexOf(searchInput) !== -1);
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

            let clusArray = []
            clusterData?.clusters?.forEach(x => x === 0 ? clusArray.push(1) : clusArray.push(0));
            setClusArrayStacked(clusArray);
        }
    }, [clusterData]);

    useEffect(() => {
        let clusArray = []
        clusterData?.clusters?.forEach(x => x === selectedCluster ? clusArray.push(1) : clusArray.push(0));
        setClusArrayStacked(clusArray);
    }, [selectedCluster])

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
                                    }} value="cohen">
                                    <option>mean</option>
                                    <option>cohen</option>
                                </select>
                            </Label>
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
                            }}
                            className='marker-list'
                            style={{ minHeight: '800px' }}
                            totalCount={sortedRows.length}
                            itemContent={index => {
                                const row = sortedRows[index];
                                const rowexp = row.expanded;
                                const rowExpr = row.expr; //geneExprData[row.gene];

                                return (
                                    <div>
                                        <div className='row-container'>
                                            <span>{row.gene}</span>
                                            <span>Cohen: {row.cohen.toFixed(4)}, AUC</span>
                                            <span>Mean: {row.mean.toFixed(4)}, Detected: {row.detected}</span>
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
                                                    <Icon icon={'tint'} small={true} fill={false}
                                                        color={row.gene === gene ? clusterColors[selectedCluster] : ''}
                                                    ></Icon>
                                                </Button>
                                            </div>
                                        </div>
                                        <Collapse isOpen={rowexp}>
                                            This will show a histogram
                                            <Histogram data={rowExpr} color={clusterColors[selectedCluster]} />
                                            {clusArrayStacked && <StackedHistogram data={rowExpr} 
                                                color={clusterColors[selectedCluster]} 
                                                clusters={clusArrayStacked}/> }
                                        </Collapse>
                                    </div>
                                )
                            }}
                        />
                    </div>
                    : ""
            }
        </div>
    );
};

export default MarkerPlot;
