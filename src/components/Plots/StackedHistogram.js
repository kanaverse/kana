import { useEffect, useRef } from "react";
import * as d3 from 'd3';

const StackedHistogram = (props) => {
    const container = useRef();

    useEffect(() => {

        let data = props?.data;
        let propwidth = props?.width;
        let color = props?.color;
        let clusters = props?.clusters;

        if (!propwidth) {
            propwidth = 325;
        }

        if (!color) {
            color = "#00B3A4";
        }

        if (!data) return "";

        let containerEl = container.current;
        containerEl.innerHTML = "";

        const margin = { top: 10, right: 30, bottom: 30, left: 40 },
            width = propwidth - margin.left - margin.right,
            height = 150 - margin.top - margin.bottom;

        const svg = d3.select(containerEl)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([0, Math.max(...data)])
            .range([0, width]);

        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(d3.axisBottom(x));

        const histogram = d3.histogram()
            .value((d) => { return d; })  
            .domain(x.domain())  
            .thresholds(x.ticks(25)); 
            
        const bins = histogram(data);
        const allCells = histogram(data.filter((d, i)=> { return clusters?.[i] === 0 }));
        const clusterCells = histogram(data.filter((d, i) => { return clusters?.[i] === 1 }));

        const y = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(bins, (d) => { return d.length; })]);

        // svg.append("g")
        //     .call(d3.axisLeft(y));

        svg.selectAll("rectAll")
            .data(allCells)
            .join("rect")
            .attr("x", 1)
            .attr("transform", (d) => { return `translate(${x(d.x0)} , ${y(d.length)})` })
            .attr("width", (d) => { return x(d.x1) - x(d.x0) - 1; })
            .attr("height", (d) => { return height - y(d.length); })
            .style("fill", "#D3D3D3")
            .style("opacity", 0.6)

        svg.selectAll("rectCluster")
            .data(clusterCells)
            .enter()
            .append("rect")
            .attr("x", 1)
            .attr("transform", (d) => { return `translate(${x(d.x0)}, ${y(d.length)})` })
            .attr("width", (d) => { return x(d.x1) - x(d.x0) - 1; })
            .attr("height", (d) => { return height - y(d.length); })
            .style("fill", color)
            .style("opacity", 0.6)

        svg.append("circle").attr("cx", width - 50).attr("cy", 5).attr("r", 3).style("fill", "#D3D3D3")
        svg.append("circle").attr("cx", width - 50).attr("cy", 15).attr("r", 3).style("fill", color)
        svg.append("text").attr("x", width - 40).attr("y", 5).text("all cells").style("font-size", "10px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", width - 40).attr("y", 15).text("this cluster").style("font-size", "10px").attr("alignment-baseline", "middle")
    }, []);

    return (
        <div ref={container}></div>
    );
};

export default StackedHistogram;