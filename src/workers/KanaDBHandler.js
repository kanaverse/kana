var kanaDB;
var init = null;

function complete_write(trans) {
  // See comments in DownloadsDB about the validity of wrapping this in a Promise.
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
  init = new Promise((resolve) => {
    // initialize database on worker creation
    kanaDB = indexedDB.open("KanaDB", 2);

    kanaDB.onupgradeneeded = (e) => {
      var kanaDBClient = e.target.result;

      // Currently purging all existing stores when the version is updated.
      // At some point we may add a more sophisticated upgrade mechanism.
      try {
        kanaDBClient.deleteObjectStore("analysis");
      } catch (e) {}
      try {
        kanaDBClient.deleteObjectStore("analysis_meta");
      } catch (e) {}
      try {
        kanaDBClient.deleteObjectStore("file");
      } catch (e) {}
      try {
        kanaDBClient.deleteObjectStore("file_meta");
      } catch (e) {}

      kanaDBClient.createObjectStore("analysis", { keyPath: "id" });
      kanaDBClient.createObjectStore("analysis_meta", { keyPath: "id" });
      kanaDBClient.createObjectStore("file", { keyPath: "id" });
      kanaDBClient.createObjectStore("file_meta", { keyPath: "id" });
    };

    // Send existing stored analyses, if available.
    kanaDB.onsuccess = () => {
      resolve(getRecordsInternal());
    };

    kanaDB.onerror = () => {
      resolve(null);
    };
  });

  return init;
}

function getRecordsInternal() {
  let store = kanaDB.result
      .transaction(["analysis_meta"], "readonly")
      .objectStore("analysis_meta");

  var allAnalysis = store.getAll();
  return new Promise((resolve, reject) => {
    allAnalysis.onsuccess = event => {
      let vals = allAnalysis.result;

      // no need to transfer the files themselves.
      vals.forEach((x) => {
        delete x.files;
      }); 

      resolve(vals);
    };
  
    allAnalysis.onerror = event => {
      reject(new Error(`failed to query the analysis store in KanaDB: ${event.target.errorCode}`));
    };
  });
}

export async function getRecords() {
  await init;
  return getRecordsInternal();
}

/** Functions to save content **/
export async function saveFile(id, buffer) {
  await init;
  let trans = kanaDB.result.transaction(["file", "file_meta"], "readwrite");
  let fin = complete_write(trans);
  let file_store = trans.objectStore("file");
  let meta_store = trans.objectStore("file_meta");

  let request = meta_store.get(id);
  await (new Promise((resolve, reject) => {
    request.onsuccess = event => {
      let meta = request.result;
      if (typeof meta === "undefined") {
        meta = { count: 1, id: id };
      } else {
        meta.count++;
      }

      var data_saving = new Promise((resolve) => {
        var putrequest = file_store.put({ id: id, payload: buffer.buffer });
        putrequest.onsuccess = event => {
          resolve(true);
        };
        putrequest.onerror = event => {
          reject(new Error(`failed to save file ${id} in KanaDB: ${event.target.errorCode}`));
        };
      });

      var ref_saving = new Promise((resolve) => {
        var putrequest = meta_store.put(meta);
        putrequest.onsuccess = event => {
          resolve(true);
        };
        putrequest.onerror = event => {
          reject(new Error(`failed to save metadata for file ${id} in KanaDB: ${event.target.errorCode}`));
        };
      });

      resolve(Promise.all([data_saving, ref_saving]));
    };

    request.onerror = event => {
      reject(new Error(`failed to save file ${id} in KanaDB: ${event.target.errorCode}`));
    };
  }));

  await fin;
  return;
}

export async function saveAnalysis(id, state, files, title) {
  await init;
  let trans = kanaDB.result.transaction(
    ["analysis", "analysis_meta"],
    "readwrite"
  );
  let fin = complete_write(trans);
  let analysis_store = trans.objectStore("analysis");
  let meta_store = trans.objectStore("analysis_meta");

  let callback = new_id => {
    var data_saving = new Promise((resolve, reject) => {
      var putrequest = analysis_store.put({ id: new_id, payload: state.buffer });
      putrequest.onsuccess = event => {
        resolve(true);
      };
      putrequest.onerror = event => {
        reject(new Error(`failed to save analysis file ${new_id} in KanaDB: ${event.target.errorCode}`));
      };
    });

    var id_saving = new Promise((resolve, reject) => {
      var putrequest = meta_store.put({
        id: new_id,
        files: files,
        time: Number(new Date()),
        title: title,
      });
      putrequest.onsuccess = event => {
        resolve(true);
      };
      putrequest.onerror = event => {
        reject(new Error(`failed to save analysis metadata ${new_id} in KanaDB: ${event.target.errorCode}`));
      };
    });

    return Promise.all([data_saving, id_saving]);
  };

  if (id === null) {
    let request = meta_store.getAll();
    await (new Promise((resolve, reject) => {
      request.onsuccess = event => {
        resolve(callback(String(request.result.length)));
      };
      request.onerror = event => {
        reject(new Error(`failed to list existing analysis store in KanaDB: ${event.target.errorCode}`));
      };
    }));
  } else {
    await callback(id);
  }

  await fin;
  return;
}

/** Functions to load content **/
export async function loadFile(id) {
  await init;
  let file_store = kanaDB.result
    .transaction(["file"], "readonly")
    .objectStore("file");

  let meta_promise = new Promise((resolve, reject) => {
    let request = file_store.get(id);
    request.onsuccess = event => {
      resolve(request.result !== undefined ? request.result : null);
    };
    request.onerror = event => {
      reject(new Error(`failed to retrieve file ${id} from KanaDB: ${event.target.errorCode}`));
    };
  });

  var meta = await meta_promise;
  if (meta !== null) {
    return new Uint8Array(meta["payload"]);
  } else {
    return null;
  }
}

export async function loadAnalysis(id) {
  await init;
  let analysis_store = kanaDB.result
    .transaction(["analysis"], "readonly")
    .objectStore("analysis");

  let ana_promise = new Promise((resolve, reject) => {
    let request = analysis_store.get(id);
    request.onsuccess = event => {
      resolve(request.result !== undefined ? request.result : null);
    };
    request.onerror = event => {
      reject(new Error(`failed to retrieve analysis ${id} from KanaDB: ${event.target.errorCode}`));
    };
  });

  var meta = await ana_promise;
  if (meta !== null) {
    return new Uint8Array(meta["payload"]);
  } else {
    return null;
  }
}

/** Functions to load content **/
export async function removeFile(id) {
  await init;
  let trans = kanaDB.result.transaction(["file", "file_meta"], "readwrite");
  let fin = complete_write(trans);
  let file_store = trans.objectStore("file");
  let meta_store = trans.objectStore("file_meta");

  let request = meta_store.get(id);
  await (new Promise((resolve, reject) => {
    request.onsuccess = event => {
      let meta = request.result;
      var refcount = meta["count"] - 1;
      var promises = [];

      if (refcount === 0) {
        promises.push(
          new Promise((resolve) => {
            let request = file_store.remove(id);
            request.onsuccess = event => {
              resolve(true);
            };
            request.onerror = event => {
              reject(new Error(`failed to remove file ${id} from KanaDB: ${event.target.errorCode}`));
            };
          })
        );
    
        promises.push(
          new Promise((resolve) => {
            let request = meta_store.delete(id);
            request.onsuccess = event => {
              resolve(true);
            };
            request.onerror = event => {
              reject(new Error(`failed to remove file metadata ${id} from KanaDB: ${event.target.errorCode}`));
            };
          })
        );
  
      } else {
        promises.push(
          new Promise((resolve) => {
            meta.count = refcount;
            let request = meta_store.put(meta);
            request.onsuccess = event => {
              resolve(true);
            };
            request.onerror = event => {
              reject(new Error(`failed to update file metadata ${id} in KanaDB: ${event.target.errorCode}`));
            };
          })
        );
      }

      resolve(Promise.all(promises));
    };

    request.onerror = event => {
      reject(new Error(`failed to retrieve file metadata ${id} from KanaDB: ${event.target.errorCode}`));
    };
  }));

  await fin;
  return;
}

export async function removeAnalysis(id) {
  await init;
  let trans = kanaDB.result.transaction(
    ["analysis", "analysis_meta"],
    "readwrite"
  );
  let fin = complete_write(trans);
  let analysis_store = trans.objectStore("analysis");
  let meta_store = trans.objectStore("analysis_meta");

  var promises = [];

  promises.push(
    new Promise((resolve, reject) => {
      let request = analysis_store.delete(id);
      request.onsuccess = event => {
        resolve(true);
      };
      request.onerror = event => {
        reject(new Error(`failed to delete analysis ${id} from KanaDB: ${event.target.errorCode}`));
      };
    })
  );

  // Removing all files as well.
  let request = meta_store.get(id);
  await (new Promise((resolve, reject) => {
    request.onsuccess = event => {
      let meta = request.result;

      for (const v of Object.values(meta["files"]["datasets"])) {
        for (const f of v["files"]) {
          promises.push(removeFile(f["id"]));
        }
      }
  
      promises.push(
        new Promise((resolve) => {
          let request = meta_store.delete(id);
          request.onsuccess = event => {
            resolve(true);
          };
          request.onerror = event => {
            reject(new Error(`failed to delete analysis metadata ${id} from KanaDB: ${event.target.errorCode}`));
          };
        })
      );

      resolve(true);
    };

    request.onerror = event => {
      reject(new Error(`failed to retrieve analysis metadata ${id} from KanaDB: ${event.target.errorCode}`));
    };
  }));

  await Promise.all(promises);
  await fin;
  return;
}
