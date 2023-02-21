import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { saveSVG } from "./utils.js";
import { Button } from "@blueprintjs/core";

const ViolinPlotBasic = (props) => {
  const container = useRef();

  useEffect(() => {
    let data = props?.rdata;
    let propwidth = props?.width;
    let color = props?.color;

    if (!propwidth) {
      propwidth = 200;
    }

    if (!color) {
      color = "#00B3A4";
    }

    if (!data) return "";

    let transform = props?.dataTransform;
    let range = props?.range;
    let threshold = props?.threshold;

    if (transform === "log") {
      data = data.map((x) => Math.log2(x + 1));
      range = range.map((x) => Math.log2(x + 1));
      threshold = Math.log2(threshold + 1);
    }

    let containerEl = container.current;
    containerEl.innerHTML = "";

    let baseHeight = 200;
    // try {
    //     console.log(containerEl.parentNode.parentNode.parentNode.parentNode.parentNode);
    //     baseHeight = Math.min(200, containerEl.parentNode.parentNode.parentNode.parentNode.parentNode.clientHeight);
    // } catch (error) {
    //     console.info("cannot find parent height in barplot");
    // }

    const margin = { top: 10, right: 30, bottom: 30, left: 40 },
      width = propwidth - margin.left - margin.right,
      height = baseHeight - margin.top - margin.bottom;

    const svg = d3
      .select(containerEl)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    var y = d3.scaleLinear().domain(range).range([height, 0]).nice();

    svg.append("g").call(
      d3.axisLeft(y).tickFormat(function (d) {
        return transform === "log"
          ? d3.format(props?.transform)(Math.pow(2, d))
          : d3.format(props?.transform)(d);
      })
    );

    var x = d3
      .scaleBand()
      .range([0, width])
      .domain([props?.showLabel])
      .padding(0.05);

    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    var histogram = d3
      .bin()
      .domain(y.domain())
      .thresholds(transform === "log" ? y.ticks(10) : y.ticks(40))
      .value((d) => d);

    let bins = histogram(data);
    var max_bin = d3.max(bins, (d) => {
      return d.length;
    });

    var xNum = d3.scaleLinear().range([0, x.bandwidth()]).domain([-1, 1]);

    svg
      .selectAll("violins")
      .data([props?.label])
      .enter()
      .append("g")
      .attr("transform", (d) => {
        return "translate(" + x(d) + " ,0)";
      })
      .append("path")
      .datum(() => {
        return bins;
      })
      .style("stroke", "none")
      .style("fill", color)
      .attr(
        "d",
        d3
          .area()
          .x0((d) => {
            return xNum(-d.length / max_bin);
          })
          .x1((d) => {
            return xNum(d.length / max_bin);
          })
          .y((d) => {
            return y(d.x0);
          })
          .curve(transform === "log" ? d3.curveBasis : d3.curveCatmullRom)
      );

    if (threshold) {
      svg
        .selectAll("threshold")
        .data([threshold])
        .enter()
        .append("line")
        .attr("transform", () => {
          return "translate(" + x(props?.label) + " ,0)";
        })
        .attr("class", "threshold")
        .attr("x1", 5)
        .attr("y1", (d) => y(d))
        .attr("x2", x.bandwidth() - 5)
        .attr("y2", (d) => y(d))
        .attr("stroke-width", 2)
        .attr("stroke", "Orange")
        .on("mouseover", function () {
          var lines = d3.select(this);
          lines.attr("stroke", "black");
          lines.attr("stroke-width", "8");
        })
        .on("mouseout", function () {
          var lines = d3.select(this);
          lines.attr("stroke", "Orange");
          lines.attr("stroke-width", "5");
        });
    }
  }, [props]);

  return (
    <div className="imgplot-container">
      {/* <Button small={true} className="imgplot-save" icon="download"
                onClick={() => {
                    saveSVG(d3.select(container.current.querySelector("svg")).node(),
                        2 * 325, 2 * 200, props?.filename);
                }}>Download</Button> */}
      <div ref={container}></div>
    </div>
  );
};

export default React.memo(ViolinPlotBasic);
