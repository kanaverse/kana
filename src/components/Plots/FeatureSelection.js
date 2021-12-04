import { XYPlot, VerticalBarSeries, XAxis, YAxis } from 'react-vis';

const FeatureSelectionPlot = (props) => {

    let data = props?.data;

    console.log("data in fselectionplot", data);

    if (!data) return "";

    let x = {};
    const data_vals =  Object.values(data);
    for (var i = 0; i < data_vals?.length; i++) {
        var clus = data_vals[i];
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

export default FeatureSelectionPlot;