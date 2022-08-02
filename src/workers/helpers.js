export function extractBuffers(object, store) {
    if (!object) {
        return;
    }

    if (Array.isArray(object)) {
        for (const element of object) {
            extractBuffers(element, store);
        }
    } else if (object.constructor == Object) {
        for (const [key, element] of Object.entries(object)) {
            extractBuffers(element, store);
        }
    } else if (ArrayBuffer.isView(object)) {
        if (!(object.buffer instanceof ArrayBuffer)) {
            throw "only ArrayBuffers should be in the message payload";
        }
        store.push(object.buffer);
    }
}

export function postAttempt(step) {
    postMessage({
        type: `${step}_START`
    });
}

export function postSuccess(step, info) {
    if (typeof info == "undefined") {
        postMessage({
            type: `${step}_CACHE`
        });
    } else {
        var transferable = [];
        extractBuffers(info, transferable);
        postMessage({
            type: `${step}_DATA`,
            resp: info
        }, transferable);
    }
}

export function postError(type, err, fatal) {
    postMessage({
        type: `${type}_ERROR`,
        resp: {
            reason: err.toString(),
            fatal: fatal
        },
    });
}


