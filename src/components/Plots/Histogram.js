import { useEffect, useRef } from "react";
import * as d3 from 'd3';
import { H4 } from "@blueprintjs/core";

const Histogram = (props) => {
    const container = useRef();

    useEffect(() => {

        let data = props?.data;

        let title = props?.title;
    
        if (!data) return "";

        let containerEl = container.current;

        // if (!containerEl) return "";

        containerEl.innerHTML = "";

        // var telem = document.createElement("h4");
        // telem.text = title;
        // containerEl.appendChild(telem);

        const margin = { top: 10, right: 30, bottom: 30, left: 40 },
            width = 275 - margin.left - margin.right,
            height = 150 - margin.top - margin.bottom;

        const svg = d3.select(containerEl)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                `translate(${margin.left},${margin.top})`);

        // X axis: scale and draw:
        const x = d3.scaleLinear()
            .domain([0, Math.max(...data)])
            .range([0, width]);

        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x));

        const histogram = d3.histogram()
            .value(function (d) { return d; })
            .domain(x.domain())
            .thresholds(x.ticks(25));

        const bins = histogram(data);

        const y = d3.scaleLinear()
            .range([height, 0]);

        y.domain([0, d3.max(bins, function (d) { return d.length; })]);

        svg.append("g")
            .call(d3.axisLeft(y));

        svg.selectAll("rect")
            .data(bins)
            .join("rect")
            .attr("x", 1)
            .attr("transform", function (d) { return `translate(${x(d.x0)} , ${y(d.length)})` })
            .attr("width", function (d) { return x(d.x1) - x(d.x0) - 1 })
            .attr("height", function (d) { return height - y(d.length); })
            .style("fill", "#69b3a2")
    }, []);

    return (
        <div ref={container}></div>
    );
};

export default Histogram;