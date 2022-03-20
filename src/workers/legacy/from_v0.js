import * as scran from "scran.js";

function recoverTypedArrays(object) {
    if (Array.isArray(object)) {
        for (var i = 0; i < object.length; i++) {
            object[i] = recoverTypedArrays(object[i]);
        }
    } else if (object instanceof Object) {
        if ("_TypedArray_class" in object) {
            var cls = object[["_TypedArray_class"]];
            var vals = object[["_TypedArray_values"]];
            switch (cls) {
                case "Uint8Array":
                    object = new Uint8Array(vals.length);
                    break;
                case "Int8Array":
                    object = new Int8Array(vals.length);
                    break;
                case "Uint8Array":
                    object = new Uint8Array(vals.length);
                    break;
                case "Uint16Array":
                    object = new Uint16Array(vals.length);
                    break;
                case "Int16Array":
                    object = new Int16Array(vals.length);
                    break;
                case "Uint32Array":
                    object = new Uint32Array(vals.length);
                    break;
                case "Int32Array":
                    object = new Int32Array(vals.length);
                    break;
                case "Uint64Array":
                    object = new Uint64Array(vals.length);
                    break;
                case "Int64Array":
                    object = new Int64Array(vals.length);
                    break;
                case "Float32Array":
                    object = new Float32Array(vals.length);
                    break;
                case "Float64Array":
                    object = new Float64Array(vals.length);
                    break;
                default:
                    throw "unrecognized TypedArray class '" + cls;
            }
            object.set(vals);
        } else {
            for (const [key, element] of Object.entries(object)) {
                object[key] = recoverTypedArrays(element);
            }
        }
    } 
    return object;
}

export function convertFromVersion0(state, newfile) {
    let fhandle = scran.createNewHDF5File(newfile);

    // Storing inputs.
    {
        let ghandle = fhandle.createGroup("inputs");
        let params = state.inputs.parameters;
        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("format", "String", [], params.type);

        let fihandle = phandle.createGroup("files")
        for (const [index, info] of params.files.entries()) {
            let xhandle = fihandle.createGroup(String(index));
            xhandle.writeDataSet("type", "String", [], info.type);
            xhandle.writeDataSet("name", "String", [], info.name);

            if (info.buffer instanceof Object) { // i.e., embedded
                xhandle.writeDataSet("offset", "Uint32", [], info.buffer.offset);
                xhandle.writeDataSet("size", "Uint32", [], info.buffer.size);
            } else { // i.e. KanaDB links.
                xhandle.writeDataSet("id", "String", [], info.buffer);
            }
        }

        // Only storing the number of cells and genes. If we want the 
        // barcode annotations, we might as well just read from the source.
        let chandle = ghandle.createGroup("results");
        let contents = state.inputs.contents;
        let ngenes = Object.values(contents.genes)[0].length;
        chandle.writeDataSet("dimensions", "Int32", null, [ngenes, contents.num_cells]);

        // Unfortunately the v0 didn't contain enough information to 
        // easily reproduce the permutations, so we just save the already-permuted genes here.
        let gehandle = chandle.createGroup("genes");
        for (const [key, val] of Object.entries(contents.genes)) {
            gehandle.writeDataSet(key, "String", null, val);
        }
    }

    // Storing quality control. This consolidates elements from 
    // several steps in v0 for simplicity.
    {
        let ghandle = fhandle.createGroup("quality_control");
        let phandle = ghandle.createGroup("parameters");

        let mparams = state.quality_control_metrics.parameters;
        phandle.writeDataSet("use_mito_default", "Uint8", [], Number(mparams.use_mito_default));
        phandle.writeDataSet("mito_prefix", "String", [], mparams.mito_prefix);

        let tparams = state.quality_control_thresholds.parameters;
        phandle.writeDataSet("nmads", "Float64", [], tparams.nmads);

        // Saving all the contents.
        let chandle = ghandle.createGroup("results");

        let mhandle = chandle.createGroup("metrics");
        let mcontents = recoverTypedArrays(state.quality_control_metrics.contents);
        mhandle.writeDataSet("sums", "Float64", null, mcontents.sums);
        mhandle.writeDataSet("detected", "Int32", null, mcontents.detected);
        mhandle.writeDataSet("proportion", "Float64", null, mcontents.proportion);

        // Converting the thresholds into arrays to handle multi-batch analyses.
        let thandle = chandle.createGroup("thresholds");
        let tcontents = recoverTypedArrays(state.quality_control_thresholds.contents);
        for (const x of [ "sums", "detected", "proportion" ]) {
            thandle.writeDataSet(x, "Float64", null, [tcontents[x]]);
        }

        let disc = tcontents.discards;
        chandle.writeDataSet("discards", "Uint8", null, disc);

        // Don't bother saving 'retained', we'll get that from 'discards'.
    }

    // Normalization just needs a group but it doesn't actually have any information right now.
    {
        let ghandle = fhandle.createGroup("normalization");
        ghandle.createGroup("parameters");
        ghandle.createGroup("results");
    }

    // Feature selection.
    {
        let ghandle = fhandle.createGroup("feature_selection");

        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("span", "Float64", [], state.feature_selection.parameters.span);

        let chandle = ghandle.createGroup("results");
        let contents = recoverTypedArrays(state.feature_selection.contents);
        for (const x of [ "means", "vars", "fitted", "resids" ]) {
            chandle.writeDataSet(x, "Float64", null, contents[x]);
        }
    }

    // PCA.
    {
        let ghandle = fhandle.createGroup("pca");

        let phandle = ghandle.createGroup("parameters");
        let params = state.pca.parameters;
        for (const x of [ "num_hvgs", "num_pcs" ]) {
            phandle.writeDataSet(x, "Int32", null, params[x]);
        }

        let chandle = ghandle.createGroup("results");
        let contents = recoverTypedArrays(state.pca.contents);

        let ve = contents.var_exp;
        chandle.writeDataSet("var_exp", "Float64", null, ve);

        // Save as a matrix.
        let npcs = ve.length;
        let ncells = contents.pcs.length / npcs;
        chandle.writeDataSet("pcs", "Float64", [ncells, npcs], contents.pcs); // transposed in HDF5.
    }

    // Neighbor index.
    {
        let ghandle = fhandle.createGroup("neighbor_index");
        let phandle = ghandle.createGroup("parameters");
        let params = state.pca.parameters;
        phandle.writeDataSet("approximate", "Uint8", [], Number(params.approximate));

        ghandle.createGroup("results");
    }

    // t-SNE details.
    {
        let ghandle = fhandle.createGroup("tsne");

        let phandle = ghandle.createGroup("parameters");
        let params = state.tsne.parameters;
        phandle.writeDataSet("perplexity", "Float64", [], params.perplexity);
        phandle.writeDataSet("iterations", "Int32", [], params.iterations);
        phandle.writeDataSet("animate", "Uint8", [], params.animate);

        let chandle = ghandle.createGroup("results");
        let contents = recoverTypedArrays(state.tsne.contents);
        chandle.writeDataSet("x", "Float64", null, contents.x);
        chandle.writeDataSet("y", "Float64", null, contents.y);

        // Don't bother saving the number of iterations.
    }

    // UMAP details.
    {
        let ghandle = fhandle.createGroup("umap");

        let phandle = ghandle.createGroup("parameters");
        let params = state.umap.parameters;
        phandle.writeDataSet("num_neighbors", "Int32", [], params.num_neighbors);
        phandle.writeDataSet("num_epochs", "Int32", [], params.num_epochs);
        phandle.writeDataSet("min_dist", "Float64", [], params.min_dist);
        phandle.writeDataSet("animate", "Uint8", [], Number(params.animate));

        let chandle = ghandle.createGroup("results");
        let contents = recoverTypedArrays(state.umap.contents);
        chandle.writeDataSet("x", "Float64", null, contents.x);
        chandle.writeDataSet("y", "Float64", null, contents.y);

        // Don't bother saving the number of iterations.
    }

    // K-means.
    {
        let ghandle = fhandle.createGroup("kmeans_cluster");
        let phandle = ghandle.createGroup("parameters");

        let dhandle = phandle.createDataSet("k", "Int32", []);
        if ("kmeans_cluster" in state) {
            let params = state.kmeans_cluster.parameters;
            dhandle.write(params.k);
        } else {
            dhandle.write(10);
        }

        let chandle = ghandle.createGroup("results");
        let contents = recoverTypedArrays(state.kmeans_cluster.contents);
        if ("kmeans_cluster" in state) {
            chandle.writeDataSet("clusters", "Int32", null, contents.clusters);
        }
    }

    // SNN graph clustering. This consolidates details from several steps in v0.
    {
        let ghandle = fhandle.createGroup("snn_graph_cluster");

        let phandle = ghandle.createGroup("parameters");
        let find_params = state.snn_find_neighbors.parameters;
        phandle.writeDataSet("k", "Int32", [], find_params.k);

        let build_params = state.snn_build_graph.parameters;
        phandle.writeDataSet("scheme", "String", [], ["rank", "number", "jaccard"][build_params.scheme]);

        let cluster_params = state.snn_cluster_graph.parameters;
        phandle.writeDataSet("resolution", "Float64", [], cluster_params.resolution);

        let chandle = ghandle.createGroup("results");
        let contents = recoverTypedArrays(state.snn_cluster_graph.contents);
        chandle.writeDataSet("clusters", "Int32", null, contents.clusters);
    }

    // Choose clustering.
    {
        let ghandle = fhandle.createGroup("choose_clustering");
        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("method", "String", [], state.choose_clustering.parameters.method);
    }

    // Marker detection.
    {
        let ghandle = fhandle.createGroup("marker_detection");
        ghandle.createGroup("parameters");

        let chandle = ghandle.createGroup("results");
        let rhandle = chandle.createGroup("clusters");
        let results = state.marker_detection.contents;
        for (const [index, val] of results.entries()) {
            let ihandle = rhandle.createGroup(String(index));
            let current = recoverTypedArrays(val);

            for (const x of [ "means", "detected" ]) {
                ihandle.writeDataSet(x, "Float64", null, current[x]);
            }

            for (const i of [ "lfc", "delta_detected", "auc", "cohen" ]) {
                let rankings = current[i];
                let rhandle = ihandle.createGroup(i);

                for (const j of [ "min", "mean", "min-rank" ]) {
                    let name = (j == "min-rank" ? "min_rank" : j);
                    rhandle.writeDataSet(name, "Float64", null, rankings[j]);
                }
            }
        }
    }

    // Custom markers.
    {
        let ghandle = fhandle.createGroup("custom_selections");

        let phandle = ghandle.createGroup("parameters");
        let shandle = phandle.createGroup("selections");
        let params = state.custom_marker_management.parameters;
        for (const [key, val] of Object.entries(params.selections)) {
            shandle.writeDataSet(String(key), "Int32", null, val);
        }

        let chandle = ghandle.createGroup("results");
        let rhandle = chandle.createGroup("markers");
        for (const [key, val] of Object.entries(state.custom_marker_management.contents.results)) {
            let ihandle = rhandle.createGroup(String(key));
            let current = recoverTypedArrays(val);

            for (const x of [ "means", "detected" ]) {
                ihandle.writeDataSet(x, "Float64", null, current[x]);
            }

            for (const i of [ "lfc", "delta_detected", "auc", "cohen" ]) {
                ihandle.writeDataSet(i, "Float64", null, current[i]["mean"]);
            }
        }
    }

}
