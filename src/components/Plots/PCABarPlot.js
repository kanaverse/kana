import BarPlot from './BarPlot';

const PCABarPlot = (props) => {

    let data = props?.pca?.var_exp;

    if (!data) return "";

    let chart_data = [];
    Object.values(data)?.forEach((x, i) => {
        chart_data.push({
            key: i+1,
            value: x * 100
        });
    });

    return (
        <BarPlot data={chart_data} />
    );
};

export default PCABarPlot;