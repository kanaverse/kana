var DownloadsDB;
var init = null;

function complete(trans) {
  // The Promise's function should evaluate immediately
  // (see https://stackoverflow.com/questions/35177230/are-promises-lazily-evaluated) 
  // and the callbacks should be attached to the transaction before we return to the event loop.
  return new Promise((resolve, reject) => {
    trans.oncomplete = (event) => {
      resolve(null);
    };
    trans.onerror = (event) => {
      reject(new Error(`DownloadsDB transaction error: ${event.target.errorCode}`));
    };
  });
}

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

export async function list() {
  await init;
  let trans = DownloadsDB.result.transaction(["downloads"], "readonly");
  let fin = complete(trans);

  let download_store = trans.objectStore("downloads");
  let listing = download_store.getAllKeys();

  await fin;
  return listing;
}

export async function get(url, params = null, force = false) {
  await init;

  if (!force) {
    let trans = DownloadsDB.result.transaction(["downloads"], "readonly");
    let fin = complete(trans);

    let download_store = trans.objectStore("downloads");
    var data_check = new Promise((resolve) => {
      var already = download_store.get(url);
      already.onsuccess = function (event) {
        if (already.result !== undefined) {
          resolve(already.result.payload);
        } else {
          resolve(null);
        }
      };
      already.onerror = function (event) {
        resolve(null);
      };
    });

    var found = await data_check;
    await fin;
    if (found !== null) {
      return found;
    }
  }

  var req;
  if (params == null) {
    req = fetch(url);
  } else {
    req = fetch(url, params);
  }

  var res = await req;
  if (!res.ok) {
    throw "failed to download '" + url + "' (" + res.status + ")";
  }
  var buffer = await res.arrayBuffer();

  // Technically, this isn't quite right, because we need to close the read
  // transaction before opening the write transaction; multiple queries to
  // the same URL from different workers could cause multiple downloads if
  // they each miss each other's read check. But oh well; the auto-commit
  // of IDB transactions means that it's hard to do any better. (Specifically,
  // we can't do an async fetch while the transaction is still open, because
  // it just closes before the fetch is done.)
  let trans = DownloadsDB.result.transaction(["downloads"], "readwrite");
  let fin = complete(trans);

  let download_store = trans.objectStore("downloads");
  var data_saving = new Promise((resolve) => {
    var putrequest = download_store.put({ url: url, payload: buffer });
    putrequest.onsuccess = function (event) {
      resolve(true);
    };
    putrequest.onerror = function (event) {
      resolve(false);
    };
  });

  let success = await data_saving;
  await fin;
  if (!success) {
    throw "failed to download resources for '" + url + "'";
  }

  return buffer;
}

export async function remove(url) {
  await init;
  let trans = DownloadsDB.result.transaction(["downloads"], "readwrite");
  let fin = complete(trans);

  let download_store = trans.objectStore("downloads");
  var removal = new Promise((resolve) => {
    let request = download_store.delete(url);
    request.onsuccess = function (event) {
      resolve(true);
    };
    request.onerror = function (event) {
      resolve(false);
    };
  });

  let output = await removal;
  await fin;
  return output;
}
