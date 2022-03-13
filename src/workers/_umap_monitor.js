import * as vizutils from "./_utils_viz_parent.js";
import * as index from "./_neighbor_index.js";
import * as utils from "./_utils.js";

var cache = { "counter": 0, "promises": {} };
var parameters = {};
var worker = null;

export function initialize() {
    worker = new Worker(new URL("./umap.worker.js", import.meta.url), { type: "module" });
    cache.initialized = vizutils.initializeWorker(worker, cache);
}

export var changed = false;

function core(num_neighbors, num_epochs, min_dist, reneighbor) {
    var nn_out = null;
    if (reneighbor) {
        nn_out = vizutils.computeNeighbors(args.num_neighbors);
    }

    let args = {
        "num_neighbors": num_neighbors,
        "num_epochs": num_epochs,
        "min_dist": min_dist,
        "animate": animate
    };

    // This returns a promise but the message itself is sent synchronously,
    // which is important to ensure that the UMAP runs in its worker in
    // parallel with other analysis steps. Do NOT put the runWithNeighbors
    // call in a .then() as this may defer the message sending until 
    // the current thread is completely done processing.
    cache.run = vizutils.runWithNeighbors(worker, args, nn_out, cache);
    return;
}

export function compute(num_neighbors, num_epochs, min_dist) {
    changed = false;

    let reneighbor = false;
    if (index.changed || parameters.num_neighbors != num_neighbors) {
        reneighbor = true;
    }

    if (reneighbor || num_epochs != parameters.num_epochs || min_dist != parameters.min_dist) {
        core(num_neighbors, num_epochs, min_dist, reneighbor);
        parameters.num_epochs = num_epochs;
        parameters.min_dist = min_dist;
        parameters.num_neighbors = num_neighbors;
    }

    if (changed) {
        reloaded = null;
    }

    return;
}

async function getResults(copy)  {
    if (!("run" in cache)) {
        let output = {
            x: reloaded.x;
            y: reloaded.y;
        };
        utils.copyVectors(output);
        output.iterations = parameters.num_epochs;
        return output;
    } else {
        // Vectors that we get from the worker are inherently
        // copied, so no need to do anything extra here.
        await cache.run;
        return sendTask(worker, { "cmd": "FETCH" }, cache);
    }
}

export function results() {
    return getResults(true);
}

export async function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("umap");

    {
        let phandle = ghandle.createGroup("parameters");
        phandle.createDataSet("num_neighbors", "Int32", [], parameters.num_neighbors);
        phandle.writeDataSet("num_epochs", "Int32", [], parameters.num_epochs);
        phandle.writeDataSet("min_dist", "Float64", [], parameters.min_dist);
        phandle.createDataSet("animate", "Uint8", [], Number(parameters.animate));
    }

    {
        let res = await getResults(false);
        let rhandle = ghandle.createGroup("results");
        rhandle.writeDataSet("x", "Float64", [res.x.length], res.x);
        rhandle.writeDataSet("y", "Float64", [res.y.length], res.y);
    }

    return;
}

export function unserialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.openGroup("umap");

    {
        let phandle = ghandle.openGroup("parameters");
        parameters = {
            perplexity: phandle.openDataSet("perplexity", { load: true }).values[0],
            iterations: phandle.openDataSet("iterations", { load: true }).values[0],
            animate: phandle.openDataSet("animate", { load: true }).values[0] > 0
        };
    }

    {
        let rhandle = ghandle.openGroup("results");
        reloaded = {
            x: rhandle.openDataSet("x", { load: true }).values,
            y: rhandle.openDataSet("y", { load: true }).values
        };
    }

    return;
}

export function animate() {
    if ("reloaded" in cache) {
        // We need to reneighbor because we haven't sent the neighbors across yet.
        core(parameters.num_neighbors, parameters.num_epochs, parameters.min_dist, true, true);
  
        // Mimicking the response from the re-run.
        return cache.run
            .then(contents => { 
                return {
                    "type": "umap_rerun",
                    "data": { "status": "SUCCESS" }
                };
            });
    } else {
        return vizutils.sendTask(worker, { "cmd": "RERUN" }, cache);
    }
}
