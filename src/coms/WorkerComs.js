export const workerComs = (msg) => {
    console.log(msg);

    const payload = msg.data;

    // TODO: logger in a central place
    // self._logger(payload);

    if (payload.type == "load_DIMS") {

        // var cont = document.getElementById("load-data-stats");
        // cont.innerHTML = payload.resp;

    } else if (payload.type == "qc_DIMS") {

        // var cont = document.getElementById("load-data-qc-stats");
        // cont.innerHTML = payload.resp;

    } else if (payload.type == "tsne_DATA" || payload.type == "tsne_iter") {
            // setTimeout(() => {
            // const payload = msg.data;
            // console.log(payload);
            return {...payload.type, payload}
        }
    // else if (payload.type == "qc_DATA") {
    //     // 
    //     ["sums", "detected", "proportion"].forEach(key => {
    //         var cont = document.getElementById("qc_charts");
    //         const eid = `qc_${key}`;
    //         var threshold = payload.resp["thresholds"][key];
    //         var vec = Object.values(payload.resp[key]);

    //         if (key != "proportion") {
    //             // vec = vec.map((m) => Math.log2(m + 1));
    //             // threshold = Math.log2(threshold + 1)
    //         } else {
    //             threshold = Math.min([threshold, 100]);
    //         }

    //         if (!cont.querySelector("#" + eid)) {
    //             var elem = document.createElement("div");
    //             elem.id = eid;
    //             // elem.className = "uk-width-auto";
    //             cont.appendChild(elem);

    //             var plot = new boxPlot(elem, elem.id, {});
    //             plot.threshold = threshold;

    //             self.qcBoxPlots[eid] = plot;

    //             elem.addEventListener("threshold", (e) => {
    //                 window.app.worker.postMessage({
    //                     "type": "setQCThresholds",
    //                     "input": [
    //                         self.qcBoxPlots['qc_sums'].threshold,
    //                         self.qcBoxPlots['qc_detected'].threshold,
    //                         Math.min([self.qcBoxPlots['qc_proportion'].threshold], 100)
    //                     ], // sums, detected & threshold 
    //                     "msg": "not much to pass"
    //                 });
    //             })

    //             var plot = self.qcBoxPlots[eid];
    //             plot.threshold = threshold;

    //             var pData = {
    //                 "y": vec,
    //                 "x": key != "proportion" ? "log-" + key : key,
    //                 "range": payload.resp["ranges"][key]
    //             };

    //             var xlabel = key;
    //             plot.draw(pData, "", 'x', 'y', threshold, xlabel);
    //         }
    //     });
    // } else if (payload.type == "fSelection_DATA") {
    //     const payload = msg.data;

    //     // var genes = payload.resp["genes"]
    //     // if (!genes) {
    //     //     genes = [];
    //     //     for (var i=0; i < Object.values(payload.resp["means"]).length; i++) {
    //     //         genes.push("gene" + i);
    //     //     }
    //     // }

    //     // var x = Object.values(payload.resp["means"]),
    //     // y = Object.values(payload.resp["vars"]);

    //     // if (!self.fSelViz) {
    //     //     var cont = document.getElementById("fsel_charts");
    //     //     cont.innerHTML = "";

    //     //     var elem = document.createElement("div");
    //     //     elem.class = ".fSel"
    //     //     elem.style.width = "4750px";
    //     //     elem.style.height = "475px";
    //     //     cont.appendChild(elem);

    //     //     const visualization = new WebGLVis(elem);
    //     //     visualization.addToDom();
    //     //     visualization.setSpecification({
    //     //         defaultData: {
    //     //             "x": x,
    //     //             "y": y
    //     //         },
    //     //         tracks: [
    //     //             {
    //     //                 "mark": "point",
    //     //                 "x": {
    //     //                     "attribute": "x",
    //     //                     "type": "quantitative",
    //     //                     "domain": [Math.min(...x), Math.max(...x)]
    //     //                 },
    //     //                 "y": {
    //     //                     "attribute": "y",
    //     //                     "type": "quantitative",
    //     //                     "domain": [Math.min(...y), Math.max(...y)]
    //     //                 },
    //     //                 "size": { "value": 2 },
    //     //                 "opacity": { "value": 0.65 }
    //     //             },
    //     //         ],
    //     //     });

    //     //     self.fSelViz = visualization;
    //     // } else {
    //     //     self.fSelViz.setSpecification({
    //     //         defaultData: {
    //     //             "x": x,
    //     //             "y": y,
    //     //         },
    //     //         tracks: [
    //     //             {
    //     //                 "mark": "point",
    //     //                 "x": {
    //     //                     "attribute": "x",
    //     //                     "type": "quantitative",
    //     //                     "domain": [Math.min(...x), Math.max(...y)]
    //     //                 },
    //     //                 "y": {
    //     //                     "attribute": "y",
    //     //                     "type": "quantitative",
    //     //                     "domain": [Math.min(...x), Math.max(...y)]
    //     //                 },
    //     //                 "size": { "value": 2 },
    //     //                 "opacity": { "value": 0.65 }
    //     //             },
    //     //         ],
    //     //     });
    //     // }

    //     // plotly version - not great
    //     var x = [];
    //     var key = "var_exp";
    //     var cont = document.getElementById("fsel_charts");
    //     cont.innerHTML = "";
    //     if (cont.querySelector(`fsel_${key}`)) {
    //         cont.querySelector(`fsel_${key}`).remove();
    //     }
    //     var elem = document.createElement("div");
    //     elem.id = `fsel_${key}`;
    //     cont.appendChild(elem);

    //     var genes = payload.resp["genes"]
    //     if (!genes) {
    //         genes = [];
    //         for (var i = 0; i < Object.values(payload.resp["means"]).length; i++) {
    //             genes.push("gene" + i);
    //         }
    //     }

    //     var data = [
    //         {
    //             x: Object.values(payload.resp["means"]),
    //             y: Object.values(payload.resp["vars"]),
    //             text: genes,
    //             mode: "markers",
    //             type: 'scatter'
    //         }
    //     ];

    //     var layout = {
    //         title: "means vs variance",
    //         autosize: true,
    //         width: 500,
    //         height: 500,
    //     }

    //     Plotly.newPlot(elem.id, data, layout, { responsive: true });
    // } else if (payload.type == "pca_DATA") {

    //     const payload = msg.data;
    //     var x = [];
    //     var key = "var_exp";
    //     var cont = document.getElementById("pca_charts");
    //     cont.innerHTML = "";
    //     if (cont.querySelector(`pca_${key}`)) {
    //         cont.querySelector(`pca_${key}`).remove();
    //     }
    //     var elem = document.createElement("div");
    //     elem.id = `pca_${key}`;
    //     cont.appendChild(elem);

    //     for (var i = 0; i < Object.keys(payload.resp[key]).length; i++) {
    //         x.push("PC" + (i + 1));
    //     }

    //     var data = [
    //         {
    //             x: x,
    //             y: Object.values(payload.resp[key]),
    //             type: 'bar'
    //         }
    //     ];

    //     var layout = {
    //         title: "% variance explained",
    //         autosize: false,
    //         width: 300,
    //         height: 450,
    //     }

    //     Plotly.newPlot(elem.id, data, layout, { responsive: true });
    // } else if (payload.type == "tsne_DATA" || payload.type == "tsne_iter") {
    //     // setTimeout(() => {
    //     const payload = msg.data;
    //     // console.log(payload);

    //     if (!self.cluster_mappings) {
    //         self.cluster_mappings = Object.values(payload.resp["clusters"]);
    //         self.cluster_count = Math.max(...self.cluster_mappings);
    //         self.cluster_colors = randomColor({ luminosity: 'dark', count: self.cluster_count + 1 });
    //         self.cluster_colors_gradients = [];
    //         for (var i = 0; i < self.cluster_count + 1; i++) {
    //             var gradient = new Rainbow();
    //             gradient.setSpectrum("grey", self.cluster_colors[i]);
    //             gradient.setNumberRange(0, self.tsne_cluster_iterations);
    //             self.cluster_colors_gradients.push(gradient);
    //         }
    //     }

    //     var tsne1 = [], tsne2 = [], sample = [];
    //     // var payload_vals = Object.values(payload.resp["tsne"]);
    //     var tsne1 = Object.values(payload.resp["tsne1"]);
    //     var tsne2 = Object.values(payload.resp["tsne2"]);

    //     self.final_cluster_colors_array =
    //         self.cluster_mappings.map(x => "#" + self.cluster_colors_gradients[x].colorAt(payload.resp["iteration"]));

    //     var iter = parseInt(payload.resp["iteration"]);
    //     var y0 = 400 / self.tsne_cluster_iterations;
    //     var y1 = -1.43; // Math.max(y0 * (self.tsne_cluster_iterations - iter), 2);

    //     if (!self.tsneViz) {
    //         var cont = document.getElementById("tsne_charts");
    //         cont.innerHTML = "";

    //         var elem = document.createElement("div");
    //         elem.class = ".tsne"
    //         elem.style.width = "500px";
    //         elem.style.height = "500px";
    //         cont.appendChild(elem);

    //         const visualization = new WebGLVis(elem);
    //         visualization.addToDom();
    //         visualization.setSpecification({
    //             defaultData: {
    //                 "tsne1": tsne1,
    //                 "tsne2": tsne2,
    //                 // "sample": sample,
    //                 "colors": self.final_cluster_colors_array
    //             },
    //             "labels": [
    //                 {
    //                     "y": y1,
    //                     "x": 0,
    //                     "text": "Iteration " + iter,
    //                     "fixedX": true
    //                 }
    //             ],
    //             xAxis: 'none',
    //             yAxis: 'none',
    //             tracks: [
    //                 {
    //                     "mark": "point",
    //                     "x": {
    //                         "attribute": "tsne1",
    //                         "type": "quantitative",
    //                         "domain": [Math.min(...tsne1), Math.max(...tsne1)]
    //                     },
    //                     "y": {
    //                         "attribute": "tsne2",
    //                         "type": "quantitative",
    //                         "domain": [Math.min(...tsne2), Math.max(...tsne2)]
    //                     },
    //                     "color": {
    //                         // "value": "blue",
    //                         "attribute": "colors",
    //                         "type": "inline"
    //                     },
    //                     "size": { "value": 2 },
    //                     "opacity": { "value": 0.65 }
    //                 },
    //             ],
    //         });

    //         self.tsneViz = visualization;
    //     } else {
    //         self.tsneViz.setSpecification({
    //             defaultData: {
    //                 "tsne1": tsne1,
    //                 "tsne2": tsne2,
    //                 // "sample": sample,
    //                 "colors": self.final_cluster_colors_array
    //             },
    //             "labels": [
    //                 {
    //                     "y": y1,
    //                     "x": 0,
    //                     "text": "Iteration " + payload.resp["iteration"],
    //                     "fixedX": true
    //                 }
    //             ],
    //             xAxis: 'none',
    //             yAxis: 'none',
    //             tracks: [
    //                 {
    //                     "mark": "point",
    //                     "x": {
    //                         "attribute": "tsne1",
    //                         "type": "quantitative",
    //                         "domain": [Math.min(...tsne1), Math.max(...tsne1)]
    //                     },
    //                     "y": {
    //                         "attribute": "tsne2",
    //                         "type": "quantitative",
    //                         "domain": [Math.min(...tsne2), Math.max(...tsne2)]
    //                     },
    //                     "color": {
    //                         // "value": "blue",
    //                         "attribute": "colors",
    //                         "type": "inline"
    //                     },
    //                     "size": { "value": 2 },
    //                     "opacity": { "value": 0.65 }
    //                 },
    //             ],
    //         });
    //     }

    // } else if (payload.type == "cluster_DATA") {
    //     const payload = msg.data;
    //     var x = {};
    //     var key = "clusters";
    //     var cont = document.getElementById("clus_charts");

    //     var elem = document.createElement("div");
    //     elem.id = `cluster_${key}`;
    //     cont.appendChild(elem);

    //     for (var i = 0; i < Object.values(payload.resp[key]).length; i++) {
    //         var clus = Object.values(payload.resp[key])[i];
    //         if ("CLUS_" + clus in x) {
    //             x["CLUS_" + clus]++;
    //         } else {
    //             x["CLUS_" + clus] = 0;
    //         }
    //     }

    //     self._cluster_size = Object.keys(x).length;
    //     var data = [
    //         {
    //             x: Object.keys(x),
    //             y: Object.values(x),
    //             type: 'bar'
    //         }
    //     ];

    //     var layout = {
    //         title: "Cells per cluster",
    //         autosize: false,
    //         width: 300,
    //         height: 450,
    //     }

    //     Plotly.newPlot(elem.id, data, layout);
    // } else if (payload.type == "markerGene_DATA") {
    //     var container = document.getElementById("mg_charts");
    //     container.style.display = "block";

    //     var selectCont = document.getElementById("mg_clus_selection");
    //     var select = document.createElement("select");
    //     select.id = "md-cluster-select";

    //     for (var i = 0; i < self._cluster_size; i++) {
    //         var option = document.createElement("option");
    //         option.value = i;
    //         // if (i==0) {
    //         //     option.selected = "selected";
    //         // }
    //         option.text = "CLUS_" + i;
    //         select.add(option);
    //     }

    //     selectCont.appendChild(select);

    //     select.addEventListener('change', (event) => {
    //         const cluster = event.target.value;

    //         self.worker.postMessage({
    //             "type": "getMarkersForCluster",
    //             "input": [parseInt(cluster)],
    //             "msg": "not much to pass"
    //         });
    //     });
    // } else if (payload.type == "setMarkersForCluster") {

    //     var cont = document.getElementById("mg_top_markers");
    //     cont.innerHTML = "";
    //     // console.log(payload.msg);

    //     var text = payload.resp["cohen"].map(x => "GENE_" + x).join(" , ");
    //     cont.innerHTML = "Top Markers : " + text;

    // }
    // // show/hide elements in muuri based on status
    // else if (payload.type == "load_DONE") {
    //     var elem = document.querySelector(".item-loadData");
    //     var melem = grid.getItem(elem);
    //     grid.show([melem]);
    //     grid.refreshItems().layout();
    // } else if (payload.type == "qc_DONE") {
    //     var elem = document.querySelector(".item-qc");
    //     var melem = grid.getItem(elem);
    //     grid.show([melem]);
    //     grid.refreshItems().layout();
    // } else if (payload.type == "fSelection_DONE") {
    //     var elem = document.querySelector(".item-fSelection");
    //     var melem = grid.getItem(elem);
    //     grid.show([melem]);
    //     grid.refreshItems().layout();
    // } else if (payload.type == "pca_DONE") {
    //     var elem = document.querySelector(".item-pca");
    //     var melem = grid.getItem(elem);
    //     grid.show([melem]);
    //     grid.refreshItems().layout();
    // } else if (payload.type == "cluster_DONE") {
    //     var elem = document.querySelector(".item-cluster");
    //     var melem = grid.getItem(elem);
    //     grid.show([melem]);
    //     grid.refreshItems().layout();
    // } else if (payload.type == "tsne_DONE") {
    //     var elem = document.querySelector(".item-tsne");
    //     var melem = grid.getItem(elem);
    //     grid.show([melem]);
    //     grid.refreshItems().layout();
    // } else if (payload.type == "markerGene_DONE") {
    //     var elem = document.querySelector(".item-markerGene");
    //     var melem = grid.getItem(elem);
    //     grid.show([melem]);
    //     grid.refreshItems().layout();
    // }
}