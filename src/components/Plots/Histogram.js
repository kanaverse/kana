import { useEffect, useRef } from "react";
import * as d3 from "d3";

const Histogram = (props) => {
  const container = useRef();

  useEffect(() => {
    let data = props?.data;
    let propwidth = props?.width;
    let propheight = props?.height;
    let color = props?.color;

    if (!propwidth) {
      propwidth = 325;
    }

    if (!propheight) {
      propheight = 150;
    }

    if (!color) {
      color = "#00B3A4";
    }

    if (!data) return "";

    let containerEl = container.current;
    containerEl.innerHTML = "";

    const margin = { top: 5, right: 5, bottom: 5, left: 5 },
      width = propwidth - margin.left - margin.right,
      height = propheight - margin.top - margin.bottom;

    const svg = d3
      .select(containerEl)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([0, Math.max(...data)])
      .range([0, width]);

    svg
      .append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x));

    const histogram = d3
      .histogram()
      .value((d) => {
        return d;
      })
      .domain(x.domain())
      .thresholds(x.ticks(25));

    const bins = histogram(data);

    const y = d3.scaleLinear().range([height, 0]);

    y.domain([
      0,
      d3.max(bins, (d) => {
        return d.length;
      }),
    ]);

    // Hide y-axis
    // svg.append("g")
    //     .call(d3.axisLeft(y));

    svg
      .selectAll("rect")
      .data(bins)
      .join("rect")
      .attr("x", 1)
      .attr("transform", (d) => {
        return `translate(${x(d.x0)} , ${y(d.length)})`;
      })
      .attr("width", (d) => {
        return x(d.x1) - x(d.x0) - 1;
      })
      .attr("height", (d) => {
        return height - y(d.length);
      })
      .style("fill", color);
  }, [props?.data]);

  return <div ref={container}></div>;
};

export default Histogram;
