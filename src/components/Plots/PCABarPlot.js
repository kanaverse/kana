import BarPlot from "./BarPlot";
import React from "react";

const PCABarPlot = (props) => {
  let data = props?.pca;

  if (!data) return "";

  let chart_data = [];
  Object.values(data)?.forEach((x, i) => {
    chart_data.push({
      key: i + 1,
      value: x * 100,
    });
  });

  return <BarPlot filename={props?.title + "_pca.png"} data={chart_data} />;
};

export default React.memo(PCABarPlot);
