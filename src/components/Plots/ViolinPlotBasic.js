import React, { useEffect, useRef } from "react";
import * as d3 from 'd3';

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

        let containerEl = container.current;
        containerEl.innerHTML = "";

        const margin = { top: 10, right: 30, bottom: 30, left: 40 },
            width = propwidth - margin.left - margin.right,
            height = 200 - margin.top - margin.bottom;

        const svg = d3.select(containerEl)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                `translate(${margin.left},${margin.top})`);

        var y = d3.scaleLinear()
            .domain(props?.range)
            .range([height, 0]).nice();

        svg.append("g").call(
            d3.axisLeft(y)
                .tickFormat(function (d) {
                    return props?.transform === "log" ? d3.format(".2s")(Math.pow(2, d)) : d3.format(".2s")(d * 100);
                }));

        var x = d3.scaleBand()
            .range([0, width])
            .domain([props?.showLabel])
            .padding(0.05)

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))

        var histogram = d3.bin()
            .domain(y.domain())
            .thresholds(y.ticks(10))
            .value(d => d)

        let bins = histogram(data);
        var max_bin = d3.max(bins, (d) => { return d.length; })

        var xNum = d3.scaleLinear()
            .range([0, x.bandwidth()])
            .domain([-1, 1]);

        svg
            .selectAll("violins")
            .data([props?.label])
            .enter()
            .append("g")
            .attr("transform", (d) => { return ("translate(" + x(d) + " ,0)") })
            .append("path")
            .datum(() => { return bins })
            .style("stroke", "none")
            .style("fill", color)
            .attr("d", d3.area()
                .x0((d) => { return (xNum(-d.length / max_bin)) })
                .x1((d) => { return (xNum(d.length / max_bin)) })
                .y((d) => { return (y(d.x0)) })
                .curve(d3.curveBasis)
            );

        svg
            .selectAll("threshold")
            .data([props?.threshold])
            .enter()
            .append("line")
            .attr("transform", () => { return ("translate(" + x(props?.label) + " ,0)") })
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
    }, []);

    return (
        <div ref={container}></div>
    );
};

export default React.memo(ViolinPlotBasic);