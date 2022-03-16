import * as scran from "scran.js";
import * as vizutils from "./_utils_viz_parent.js";
import * as index from "./_neighbor_index.js";
import * as utils from "./_utils.js";

var cache = { "counter": 0, "promises": {} };
var parameters = {};
var worker = null;
var reloaded = null;

export function initialize() {
    worker = new Worker(new URL("./tsne.worker.js", import.meta.url), { type: "module" });
    return vizutils.initializeWorker(worker, cache);
}

export var changed = false;

function core(perplexity, iterations, animate, reneighbor) {
    var nn_out = null;
    if (reneighbor) {
        var k = scran.perplexityToNeighbors(perplexity);
        nn_out = vizutils.computeNeighbors(k);
    }

    let args = {
        "perplexity": perplexity,
        "iterations": iterations,
        "animate": animate
    };

    // This returns a promise but the message itself is sent synchronously,
    // which is important to ensure that the t-SNE runs in its worker in
    // parallel with other analysis steps. Do NOT put the runWithNeighbors
    // call in a .then() as this may defer the message sending until 
    // the current thread is completely done processing.
    cache.run = vizutils.runWithNeighbors(worker, args, nn_out, cache);
    return;
}

export function compute(perplexity, iterations, animate) {
    changed = false;

    let reneighbor = false;
    if (index.changed || perplexity != parameters.perplexity) {
        reneighbor = true;
    }

    if (reneighbor || iterations != parameters.iterations) {
        core(perplexity, iterations, animate, reneighbor);
        parameters.perplexity = perplexity;
        parameters.iterations = iterations;
        parameters.animate = animate;
        changed = true;
    }

    if (changed) {
        reloaded = null;
    }

    return;
}

async function getResults(copy)  {
    if (!("run" in cache)) {
        let output = {
            x: reloaded.x,
            y: reloaded.y
        };
        utils.copyVectors(output, copy);
        output.iterations = parameters.iterations;
        return output;
    } else {
        // Vectors that we get from the worker are inherently
        // copied, so no need to do anything extra here.
        await cache.run;
        return vizutils.sendTask(worker, { "cmd": "FETCH" }, cache);
    }
}

export function results() {
    return getResults(true);
}

export async function serialize(path) {
    let fhandle = new scran.H5File(path);
    let ghandle = fhandle.createGroup("tsne");

    {
        let phandle = ghandle.createGroup("parameters");
        phandle.writeDataSet("perplexity", "Float64", [], parameters.perplexity);
        phandle.createDataSet("iterations", "Int32", [], parameters.iterations);
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
    let ghandle = fhandle.open("tsne");

    {
        let phandle = ghandle.open("parameters");
        parameters = {
            perplexity: phandle.open("perplexity", { load: true }).values[0],
            iterations: phandle.open("iterations", { load: true }).values[0],
            animate: phandle.open("animate", { load: true }).values[0] > 0
        };
    }

    {
        let rhandle = ghandle.open("results");
        reloaded = {
            x: rhandle.open("x", { load: true }).values,
            y: rhandle.open("y", { load: true }).values
        };
    }

    return { ...parameters };
}

export function animate() {
    if (!("run" in cache)) {
        // We need to reneighbor because we haven't sent the neighbors across yet.
        core(parameters.perplexity, parameters.iterations, true, true);

        // Mimicking the response from the re-run.
        return cache.run
            .then(contents => {
                return {
                    "type": "tsne_rerun",
                    "data": { "status": "SUCCESS" }
                };
            });
    } else {
        return vizutils.sendTask(worker, { "cmd": "RERUN" }, cache);
    }
}
