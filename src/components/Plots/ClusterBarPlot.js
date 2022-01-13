import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../context/AppContext';
import BarPlot from './BarPlot';

const ClusterBarPlot = (props) => {

    const [chartData, setChartData] = useState(null);

    const { datasetName } = useContext(AppContext);

    useEffect(() => {
        let data = props?.data?.clusters;

        if (!data) return;

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
    }, [props?.data, props?.clusterColors]);

    return (
        props?.clusterColors && chartData &&
        <BarPlot
            filename={datasetName.split(" ").join("_") + "_clusters.png"}
            data={chartData} color={props?.clusterColors} />
    );
};

export default React.memo(ClusterBarPlot);