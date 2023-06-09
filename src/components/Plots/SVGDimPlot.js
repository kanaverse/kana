import { getMinMax } from "./utils";

export const SVGDimPlot = (color, embeddata, plabels, pgradient) => {
  const { x, y } = embeddata;

  // translate to new coordinates
  const xMinMax = getMinMax(x);
  const yMinMax = getMinMax(y);

  const new_min = 10,
    new_max_x = 440,
    new_max_y = 490;

  function translateX(val) {
    let nval =
      ((val - xMinMax[0]) / (xMinMax[1] - xMinMax[0])) * (new_max_x - new_min) +
      new_min;

    return String(nval);
  }

  function translateY(val) {
    let nval =
      ((val - yMinMax[0]) / (yMinMax[1] - yMinMax[0])) * (new_max_y - new_min) +
      new_min;

    return String(nval);
  }

  let circles = [];
  x.forEach((x, i) => {
    circles.push(
      `<circle cx="${translateX(x)}" cy="${translateY(
        y[i]
      )}" r="2" style="fill: ${color[i]}" />`
    );
  });

  let legend = [];
  let defs = [];
  if (pgradient) {
    const { factors, slider } = pgradient;

    // defs.push(`linear-gradient(to right, #edc775 ${
    //   ((slider[0] - factors[0]) * 100) / (factors[1] - factors[0])
    // }%, #e09351, #df7e66, #b75347, #6d2f20 ${
    //   100 - ((factors[1] - slider[1]) * 100) / (factors[1] - factors[0])
    // }%)`);

    const minPerc =
        ((slider[0] - factors[0]) * 100) / (factors[1] - factors[0]),
      maxPerc =
        100 - ((factors[1] - slider[1]) * 100) / (factors[1] - factors[0]);

    const binsSize = Math.round((maxPerc - minPerc) / 4);

    defs.push(`
      <linearGradient id="grad" gradientTransform="rotate(90)">
        <stop offset="${minPerc}%" stop-color="#edc775" />
        <stop offset="${minPerc + binsSize}%" stop-color="#e09351" />
        <stop offset="${minPerc + 2 * binsSize}%" stop-color="#df7e66" />
        <stop offset="${minPerc + 3 * binsSize}%" stop-color="#b75347" />
        <stop offset="100%" stop-color="#6d2f20" />
      </linearGradient>
    `);

    legend.push(
      `<rect x="460" y="100" width="35" height="150" 
      style="fill: url(#grad)" />`
    );

    legend.push(`<text x="${460}" y="${90}">${Math.round(factors[0])}</text>`);

    if (slider[0] !== factors[0]) {
      legend.push(
        `<text x="${500}" y="${
          90 + ((minPerc + binsSize) * 150) / 100
        }">custom min: ${Math.round(slider[0])}</text>`
      );
    }

    legend.push(`<text x="${460}" y="${270}">${Math.round(factors[1])}</text>`);

    if (slider[1] !== factors[1]) {
      legend.push(
        `<text x="${500}" y="${
          90 + ((minPerc + 3 * binsSize) * 150) / 100
        }">custom max: ${Math.round(slider[1])}</text>`
      );
    }
  } else if (plabels) {
    const { labels, colors } = plabels;
    labels.forEach((x, i) => {
      legend.push(
        `<text x="${460}" y="${100 + i * 20}" style="fill: ${
          colors[i]
        }">${x}</text>`
      );
    });
  }

  return `
    <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
      ${defs.join("\n")}
      <g>
        ${circles.join("\n")}
      </g>
      <g>
        ${legend.join("\n")}
      </g>
    </svg>
  `;
};
