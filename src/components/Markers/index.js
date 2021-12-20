import { useEffect, useContext, useState, useMemo } from 'react';
import { Button, H4, Select, SelectProps, Collapse, Pre, Label } from "@blueprintjs/core";
import DataGrid, { RowRendererProps } from 'react-data-grid';
import { Virtuoso } from 'react-virtuoso';

import { AppContext } from '../../context/AppContext';
import Histogram from '../Plots/Histogram';
import './markers.css';

import Row from './Row';

const MarkerPlot = () => {

    const { clusterData, selectedClusterSummary,
        selectedCluster, setSelectedCluster } = useContext(AppContext);
    const [clusSel, setClusSel] = useState(null);
    const [recs, setRecs] = useState(null);
    const [sortColumns, setSortColumns] = useState([{
        columnKey: 'mean',
        direction: 'DSC'
    }]);

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
                })
            });

            setRecs(records);
        }
    }, [selectedClusterSummary]);

    const columns = [
        { key: 'gene', name: 'Gene', sortable: true },
        { key: 'mean', name: 'Mean', sortable: true },
        // { key: 'auc', name: 'AUC' },
        { key: 'cohen', name: 'Cohen', sortable: true },
        { key: 'detected', name: 'Detected', sortable: true },
        // {
        //     key: 'action',
        //     name: 'Actions',
        //     width: 40,
        //     formatter({ row, onRowChange, isCellSelected }) {
        //         return (
        //             <SelectCellFormatter
        //                 value={row.available}
        //                 onChange={() => {
        //                     onRowChange({ ...row, available: !row.available });
        //                 }}
        //                 onClick={stopPropagation}
        //                 isCellSelected={isCellSelected}
        //             />
        //         );
        //     },
        // }
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

        const sortedRows = [...recs];
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
        return sortedRows;
    }, [recs, sortColumns]);

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
                            <Label>sort by
                                <select
                                onChange={(x) => {
                                    setSortColumns([{
                                        columnKey: x.currentTarget.value,
                                        direction: 'DSC'
                                    }])
                                }}>
                                    <option>mean</option>
                                    <option>cohen</option>
                                </select>
                            </Label>
                        </div>
                        <Virtuoso
                            className='marker-list'
                            style={{ height: '500px' }}
                            totalCount={sortedRows.length}
                            itemContent={index => <Row index={index} row={sortedRows[index]} />}
                        />
                    </div>
                    : ""
                // <DataGrid columns={columns} rows={sortedRows}
                //     sortColumns={sortColumns}
                //     onSortColumnsChange={setSortColumns}
                //     rowRenderer={MyRowRenderer}
                // />
            }
        </div>
    );
};

export default MarkerPlot;