import { getMinMax } from "./utils";

export const SVGDimPlot = (color, embeddata) => {
  const { x, y } = embeddata;

  // translate to new coordinates
  const xMinMax = getMinMax(x);
  const yMinMax = getMinMax(y);

  const new_min = 10,
    new_max = 490;

  function translateX(val) {
    let nval =
      ((val - xMinMax[0]) / (xMinMax[1] - xMinMax[0])) * (new_max - new_min) +
      new_min;

    return String(nval);
  }

  function translateY(val) {
    let nval =
      ((val - yMinMax[0]) / (yMinMax[1] - yMinMax[0])) * (new_max - new_min) +
      new_min;

    return String(nval);
  }

  let circles = [];
  x.forEach((x, i) => {
    circles.push(
      `<circle cx="${translateX(x)}" cy="${translateY(
        y[i]
      )}" r="2" style="fill: ${color[i]}"></circle>`
    );
  });

  return `
    <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
    ${circles.join("\n")}
    </svg>
  `;
};
