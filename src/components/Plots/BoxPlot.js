import { useEffect, useRef, useContext, useState } from 'react';
import { ControlGroup, Button, HTMLSelect, InputGroup, Icon } from "@blueprintjs/core";
import { Classes, Popover2 } from "@blueprintjs/popover2";

import { AppContext } from '../../context/AppContext';

import * as d3 from "d3";

const BoxPlot = (props) => {
    const elem = useRef();

    const { qcData, qcThreshold, setQcThreshold } = useContext(AppContext);
    const id = props["label"];
    const data = props?.data;
    const dimy= 'y';
    const dimx = 'x';
    const xlabel = props["label"];
    var threshold = props["threshold"];

    useEffect(() => {
        console.log("first run");

        var container = elem.current;
        container.style.height = 225+ "px";
        container.style.width = 250 + "px";
        container.insertAdjacentHTML('beforeend', '<svg id="svg-' + id + `" class="visualization" width="275px" height="225px"><style type="text/css"></style><defs></defs></svg>`);
    }, []);

    useEffect(() => {
        console.log("data came back");

        console.log("boxplot props", props);

        var container = elem.current;
        // data, key, dimx, dimy, threshold, xlabel

        var svg = d3.select('#svg-' + id);

        var chartContent = svg.append('g').attr('class', 'chart-content');
        var legend = svg.append('g').attr('class', 'chart-legend');

        var circleRadius = 0.3;
        var gap = 0.001;
        var gridSquareSize = Math.max(Math.floor(circleRadius), 1);

        var margins = {
            top: 10,
            right: 10,
            bottom: 30,
            left: 60
        };

        var width = 250 - 50;
        var height = 225 - 50;

        var minY = props["range"][0];
        var maxY = props["range"][1];
        var maxX = Math.max(...props["data"]);
        var minX = -maxX;

        var xScale = d3.scaleLinear()
            .domain([minX, maxX])
            .range([0, (width - margins.left - margins.right)])
            .nice();
        var yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([height - margins.top - margins.bottom, 0])
            .nice();

        svg.selectAll('.xAxis').remove();
        svg.selectAll('.yAxis').remove();

        var xLabelsPadded = [xlabel];
        // uniqueValues.forEach(function (n) { xLabelsPadded.push(n); });
        drawAxes(xScale, yScale, xLabelsPadded.length, 7, chartContent, width, height, margins, undefined, undefined, xLabelsPadded, undefined, undefined)

        var itemsGroup = chartContent.select('.items');

        if (itemsGroup.empty()) {
            itemsGroup = chartContent.append('g').attr('class', 'items');
            var selectedGroup = itemsGroup.append('g').attr('class', 'selected');
            itemsGroup.append('g').attr('class', 'hovered');
            selectedGroup.append('g').attr('class', 'hovered');
        }

        var selection = itemsGroup.select(".violin").remove();

        var b = minY;
        var m = (maxY - b)/100;

        itemsGroup.append("path")
            .data([props["data"]])
            .attr("class", "violinp")
            .attr("d", d3.line()
                .x(function (d, i) { return margins.left + xScale(props["data"][i]); })
                .y(function (d, i) { return margins.top + yScale((m * i) + b); }))
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("fill", "blue")
            .attr("fill-opacity", 0.6);

        itemsGroup.append("path")
            .data([props["data"]])
            .attr("class", "violinn")
            .attr("d", d3.line()
            .x(function (d, i) { return margins.left + xScale(-props["data"][i]); })
            .y(function (d, i) { return margins.top + yScale((m * i) + b); }))
            .attr("stroke", "blue")
            .attr("stroke-width", 2)
            .attr("fill", "blue")
            .attr("fill-opacity", 0.6);

        function dragstarted(event) {
            const line = d3.select(this).classed("dragging", true);

            event.on("drag", dragged).on("end", ended);

            function dragged(event, d) {
                line.attr("y1", event.y).attr("y2", event.y);
            }

            function ended() {
                line.classed("dragging", false);
                threshold = yScale.invert(parseInt(line.attr("y1")) - margins.top);
                // (m * yScale.invert(parseInt(line.attr("y1")))) + b;
                // yScale.invert();

                const event = new CustomEvent('threshold',
                    {
                        bubbles: true,
                        detail: {
                            "threshold": yScale.invert(parseInt(line.attr("y1")) - margins.top)
                            // (m * yScale.invert(parseInt(line.attr("y1")))) + b
                            //yScale.invert(parseInt(line.attr("y1")))
                        }
                    });

                container.dispatchEvent(event);
            }
        }

        //drag line;
        var drag = d3.drag()
            .on('start', dragstarted);

        itemsGroup
            .selectAll(".threshold").remove();

        var line = itemsGroup
            .append("line")
            .attr("class", "threshold")
            .attr("x1", margins.left + xScale(-maxX))
            .attr("y1", margins.top + yScale(threshold))
            .attr("x2", margins.left + xScale(maxX))
            .attr("y2", margins.top + yScale(threshold))
            .attr("stroke-width", 5)
            .attr("stroke", "Orange")
            .on("mouseover", function () {
                var lines = d3.select(this);
                line.attr("stroke", "black");
                lines.attr("stroke-width", "8");
            })
            .on("mouseout", function () {
                var lines = d3.select(this);
                line.attr("stroke", "Orange");
                lines.attr("stroke-width", "5");
            })
            .call(drag);

    }, [qcData]);

    const drawAxes = function(xScale, yScale, xTicks, yTicks, svg, width, height, margins, xAxisFormat, yAxisFormat, xLabels, yLabels, xLabelsBtTicks, yLabelsBtTicks) {
        var axesGroup = svg.select('.axes'),
            xAxisGrid = axesGroup.select('.xAxis-grid'),
            yAxisGrid = axesGroup.select('.yAxis-grid'),
            xAxisLine = axesGroup.select('.xAxis-line'),
            yAxisLine = axesGroup.select('.yAxis-line');

        if (axesGroup.empty()) { axesGroup = svg.append('g').attr('class', 'axes'); }

        if (xAxisGrid.empty()) { xAxisGrid = axesGroup.append('g').attr('class', 'xAxis xAxis-grid'); }
        if (yAxisGrid.empty()) { yAxisGrid = axesGroup.append('g').attr('class', 'yAxis yAxis-grid'); }
        if (xAxisLine.empty()) { xAxisLine = axesGroup.append('g').attr('class', 'xAxis xAxis-line'); }
        if (yAxisLine.empty()) { yAxisLine = axesGroup.append('g').attr('class', 'yAxis yAxis-line'); }

        if (xScale) {
            // Draw X-axis grid lines
            xAxisGrid
                .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')')
                .selectAll('line.x')
                .data(xScale.ticks(xTicks))
                .enter().append('line')
                .attr('x1', xScale)
                .attr('x2', xScale)
                .attr('y1', 0)
                .attr('y2', height - margins.top - margins.bottom)
                .style('stroke', '#eeeeee')
                .style('shape-rendering', 'crispEdges');

            var xAxisTickFormat = xAxisFormat ||
                ((xLabels) ?
                    function (i) { return xLabels[i]; } :
                    function (x) {
                        var format = d3.format('s');
                        var rounded = Math.round(x * 1000) / 1000;
                        return format(rounded);
                    });

            var xAxis = d3.axisBottom(xScale)
                .ticks(xTicks)
                .tickFormat(xAxisTickFormat);

            xAxisLine
                .attr('transform', 'translate(' + margins.left + ', ' + (height - margins.bottom) + ')')
                .call(xAxis);

            if (xLabels) {
                var xTransform = 'rotate(-90)';
                if (xLabelsBtTicks) { xTransform += 'translate(0,' + (xScale(0.5) - xScale(0)) + ')'; }
                xAxisLine
                    .selectAll('text')
                    .style('text-anchor', 'end')
                    .attr('dx', '-.8em')
                    .attr('dy', '-0.5em')
                    .attr('transform', xTransform);
            }
        }

        if (yScale) {
            // Draw Y-axis grid lines
            yAxisGrid
                .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')')
                .selectAll('line.y')
                .data(yScale.ticks(yTicks - 1))
                .enter().append('line')
                .attr('x1', 0)
                .attr('x2', width - margins.left - margins.right)
                .attr('y1', yScale)
                .attr('y2', yScale)
                .style('stroke', '#eeeeee')
                .style('shape-rendering', 'crispEdges');

            var yAxisTickFormat = (yLabels) ? function (i) { return yLabels[i]; } :
                function (y) {
                    var format = d3.format('s');
                    var rounded = Math.round(y * 1000) / 1000;
                    return format(rounded);
                };

            var yAxis = d3.axisLeft(yScale)
                .ticks(yTicks - 1);
            // .tickFormat(yAxisTickFormat);

            yAxisLine
                .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')')
                .call(yAxis);
        }
    }

    return (
        <div ref={elem}></div>
    );
};

export default BoxPlot;