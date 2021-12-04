import { XYPlot, VerticalBarSeries, XAxis, YAxis } from 'react-vis';

const BarPlot = (props) => {

    let data = props?.pca?.var_exp;

    if (!data) return "";

    let chart_data = [];
    Object.values(data)?.forEach((x, i) => {
        chart_data.push({
            x: i,
            y: x * 100
        });
    });

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

export default BarPlot;