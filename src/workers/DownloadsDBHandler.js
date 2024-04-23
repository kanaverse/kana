var DownloadsDB;
var init = null;

export function initialize() {
  if (init === null) {
    init = new Promise((resolve, reject) => {
      // initialize database on worker creation
      DownloadsDB = indexedDB.open("DownloadsDB", 3);

      DownloadsDB.onupgradeneeded = (e) => {
        var DownloadsDBClient = e.target.result;

        // Currently purging all existing stores when the version is updated.
        // At some point we may add a more sophisticated upgrade mechanism.
        try {
          DownloadsDBClient.deleteObjectStore("downloads");
        } catch (e) {}

        DownloadsDBClient.createObjectStore("downloads", { keyPath: "url" });
      };

      DownloadsDB.onsuccess = () => {
        resolve(null);
      };

      DownloadsDB.onerror = () => {
        reject("failed to initialize DownloadsDB");
      };
    });
  }

  return init;
}

async function fetchWithProgress(url, startFun, iterFun, endFun, params=null) {
  let res;
  if (params == null) {
    res = await fetch(url);
  } else {
    res = await fetch(url, params);
  }

  if (!res.ok) {
    throw new Error("oops, failed to download '" + url + "'");
  }

  const cl = res.headers.get("content-length"); // WARNING: this might be NULL!
  const id = startFun(cl);

  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    total += value.length;
    iterFun(id, total);
  }

  let output = new Uint8Array(total);
  let start = 0;
  for (const x of chunks) {
    output.set(x, start);
    start += x.length;
  }

  endFun(id, total);
  return output;
}

async function fetchWrapper(url, params = null) {
  try {
    const out = await fetchWithProgress(
      url,
      (cl) => {
        postMessage({
          type: `DOWNLOAD for url: ` + String(url),
          download: "START",
          url: String(url),
          total_bytes: String(cl),
          msg: "Total size is " + String(cl) + " bytes!",
        });
        return url;
      },
      (id, sofar) => {
        postMessage({
          type: `DOWNLOAD for url: ` + String(url),
          download: "PROGRESS",
          url: String(url),
          downloaded_bytes: String(sofar),
          msg: "Progress so far, got " + String(sofar) + " bytes!",
        });
      },
      (id, total) => {
        postMessage({
          type: `DOWNLOAD for url: ` + String(url),
          download: "COMPLETE",
          url: String(url),
          msg: "Finished, got " + String(total) + " bytes!",
        });
      },
      params
    );

    return out;
  } catch (error) {
    // console.log("oops error", error)
    postMessage({
      type: `DOWNLOAD for url: ` + String(url),
      download: "START",
      url: String(url),
      total_bytes: 100,
    });

    let req;
    if (params == null) {
      req = fetch(url);
    } else {
      req = fetch(url, params);
    }

    var res = await req;
    if (!res.ok) {
      throw new Error("failed to download '" + url + "' (" + res.status + ")");
    }
    var buffer = await res.arrayBuffer();

    postMessage({
      type: `DOWNLOAD for url: ` + String(url),
      download: "COMPLETE",
      url: String(url),
    });
    return new Uint8Array(buffer);
  }
}

export async function get(url, params = null, force = false) {
  await init;

  if (!force) {
    let trans = DownloadsDB.result.transaction(["downloads"], "readonly");
    let download_store = trans.objectStore("downloads");

    var data_check = new Promise((resolve, reject) => {
      var already = download_store.get(url);
      already.onsuccess = event => {
        if (already.result !== undefined) {
          resolve(already.result.payload);
        } else {
          resolve(null);
        }
      };
      already.onerror = event => {
        reject(`failed to query DownloadsDB for ${url}: ${event.target.errorCode}`);
      };
    });

    var found = await data_check;
    if (found !== null) {
      return found;
    }
  }

  var buffer = await fetchWrapper(url, params)

  // Technically, this isn't quite right, because we need to close the read
  // transaction before opening the write transaction; multiple queries to
  // the same URL from different workers could cause multiple downloads if
  // they each miss each other's read check. But oh well; the auto-commit
  // of IDB transactions means that it's hard to do any better. (Specifically,
  // we can't do an async fetch while the transaction is still open, because
  // it just closes before the fetch is done.)
  let trans = DownloadsDB.result.transaction(["downloads"], "readwrite");

  // The Promise's function should evaluate immediately
  // (see https://stackoverflow.com/questions/35177230/are-promises-lazily-evaluated) 
  // so the callbacks should be attached to the transaction before we return to the event loop.
  let fin = new Promise((resolve, reject) => {
    trans.oncomplete = (event) => {
      resolve(null);
    };
    trans.onerror = (event) => {
      reject(new Error(`transaction error for saving ${url} in DownloadsDB: ${event.target.errorCode}`));
    };
  });

  let download_store = trans.objectStore("downloads");
  let saving = new Promise((resolve, reject) => {
    var putrequest = download_store.put({ url: url, payload: buffer });
    putrequest.onsuccess = event => {
      resolve(true);
    };
    putrequest.onerror = event => {
      reject(new Error(`failed to cache ${url} in DownloadsDB: ${event.target.errorCode}`));
    };
  });

  // Stack all awaits here, AFTER event handlers have been attached.
  await saving;
  await fin;
  return buffer;
}

export async function remove(url) {
  await init;
  let trans = DownloadsDB.result.transaction(["downloads"], "readwrite");
  let fin = new Promise((resolve, reject) => {
    trans.oncomplete = (event) => {
      resolve(null);
    };
    trans.onerror = (event) => {
      reject(new Error(`transaction error for removing ${url} in DownloadsDB: ${event.target.errorCode}`));
    };
  });

  let download_store = trans.objectStore("downloads")
  let removal = new Promise((resolve, reject) => {
    let request = download_store.delete(url);
    request.onsuccess = event => {
      resolve(true);
    };
    request.onerror = event => {
      reject(new Error(`failed to remove ${url} from DownloadsDB: ${event.target.errorCode}`));
    };
  });

  // Only await after attaching event handlers.
  await removal;
  await fin;
  return;
}
