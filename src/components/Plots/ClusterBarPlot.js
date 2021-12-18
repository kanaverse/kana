import { XYPlot, VerticalBarSeries, XAxis, YAxis } from 'react-vis';

const ClusterBarPlot = (props) => {

    let data = props?.data?.clusters;

    if (!data) return "";

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
            x: i,
            y: z
        });
    });

    console.log("clusters", chart_data)

    return (
        <XYPlot
            width={275}
            height={250}>
            <VerticalBarSeries
                data={chart_data}
                style={{}}
            />
            <XAxis />
            <YAxis />
        </XYPlot>
    );
};

export default ClusterBarPlot;