import * as pako from "pako";
import * as d3 from "d3-dsv";
import * as scran from "scran.js";

export function extractHDF5Strings(handle, name) {
    if (!(name in handle.children)) {
        return null;
    }

    if (handle.children[name] !== "DataSet") {
        return null;
    }

    let content = handle.open(name);
    if (content.type !== "String") {
        return null;
    }

    return content.load();
}

export function readDSVFromBuffer(content, fname, delim = "\t") {
    var ext = fname.name.split('.').pop();

    if (ext == "gz") {
        content = pako.ungzip(content);
    }

    const dec = new TextDecoder();
    let decoded = dec.decode(content);
    const tsv = d3.dsvFormat(delim);
    let parsed = tsv.parseRows(decoded);

    return parsed;
}
