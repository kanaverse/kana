import { randomColor } from 'randomcolor';
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import BarPlot from './BarPlot';

const ClusterBarPlot = (props) => {

    const [chartData, setChartData] = useState(null);

    const { clusterColors, setClusterColors, datasetName } = useContext(AppContext);

    useEffect(() => {
        let data = props?.data?.clusters;

        if (!data) return;
        
        let cluster_count = Math.max(...data) + 1;
        let cluster_colors = null;
        if (cluster_count > Object.keys(palette).length) {
            cluster_colors = randomColor({ luminosity: 'dark', count: cluster_count + 1 });
        } else {
            cluster_colors = palette[cluster_count.toString()];
        }
        setClusterColors(cluster_colors);

        let x = {};
        for (var i = 0; i < data?.length; i++) {
            var clus = data[i];
            if ("CLUS_" + clus in x) {
                x["CLUS_" + clus]++;
            } else {
                x["CLUS_" + clus] = 0;
            }
        }
    
        let chart_data = [];
        Object.values(x)?.forEach((z, i) => {
            chart_data.push({
                key: i + 1,
                value: z
            });
        });

        setChartData(chart_data);
    }, [props?.data]);

    const palette = {
        1: ['#1b9e77'],
        2: ['#1b9e77', '#d95f02'],
        3: ['#1b9e77', '#d95f02', '#7570b3'],
        4: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a'],
        5: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e'],
        6: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02'],
        7: [
            '#1b9e77',
            '#d95f02',
            '#7570b3',
            '#e7298a',
            '#66a61e',
            '#e6ab02',
            '#a6761d',
        ],
        8: [
            '#1b9e77',
            '#d95f02',
            '#7570b3',
            '#e7298a',
            '#66a61e',
            '#e6ab02',
            '#a6761d',
            '#666666',
        ],
        9: [
            '#a6cee3',
            '#1f78b4',
            '#b2df8a',
            '#33a02c',
            '#fb9a99',
            '#e31a1c',
            '#fdbf6f',
            '#ff7f00',
            '#cab2d6',
        ],
        10: [
            '#a6cee3',
            '#1f78b4',
            '#b2df8a',
            '#33a02c',
            '#fb9a99',
            '#e31a1c',
            '#fdbf6f',
            '#ff7f00',
            '#cab2d6',
            '#6a3d9a',
        ],
        11: [
            '#a6cee3',
            '#1f78b4',
            '#b2df8a',
            '#33a02c',
            '#fb9a99',
            '#e31a1c',
            '#fdbf6f',
            '#ff7f00',
            '#cab2d6',
            '#6a3d9a',
            '#ffff99',
        ],
        12: [
            '#a6cee3',
            '#1f78b4',
            '#b2df8a',
            '#33a02c',
            '#fb9a99',
            '#e31a1c',
            '#fdbf6f',
            '#ff7f00',
            '#cab2d6',
            '#6a3d9a',
            '#ffff99',
            '#b15928',
        ],
    };

    return (
        clusterColors && <BarPlot filename={datasetName.split(" ").join("_") + "_clusters.png"} data={chartData} color={clusterColors} />
    );
};

export default React.memo(ClusterBarPlot);