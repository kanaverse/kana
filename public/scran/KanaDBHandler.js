var kana_db = {};

(function (x) {
    /** Private members **/
    var kanaDB;
    var init = null;

    x.initialize = function () {
        init = new Promise(resolve => {
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

                kanaDBClient.createObjectStore("analysis", { keyPath: 'id' });
                kanaDBClient.createObjectStore("analysis_meta", { keyPath: 'id' });
                kanaDBClient.createObjectStore("file", { keyPath: 'id' });
                kanaDBClient.createObjectStore("file_meta", { keyPath: 'id' });
            };

            // Send existing stored analyses, if available.
            kanaDB.onsuccess = () => {
                getRecordsResolver(resolve);
            };

            kanaDB.onerror = () => {
                resolve(null);
            };
        });

        return init;
    };

    function getRecordsResolver(resolve, store = null) {
        if (store === null) {
            store = kanaDB.result
                .transaction(["analysis_meta"], "readonly")
                .objectStore("analysis_meta")
        }

        var allAnalysis = store.getAll();

        allAnalysis.onsuccess = function () {
            let vals = allAnalysis.result;
            vals.forEach(x => { delete x.files }); // no need to transfer that.
            resolve(vals);
        };
        allAnalysis.onerror = function () {
            resolve(null);
        };
    }

    /** Helper functions **/
    async function loadContent(id, store) {
        return new Promise(resolve => {
            let request = store.get(id);
            request.onsuccess = function () {
                if (request.result !== undefined) {
                    resolve(request.result);
                } else {
                    resolve(null);
                }
            };
            request.onerror = function () {
                resolve(null);
            };
        });
    }

    function allOK(promises) {
        return Promise.allSettled(promises)
            .then(vals => {
                for (const x of vals) {
                    if (!x) {
                        return false;
                    }
                }
                return true;
            });
    }

    x.getRecords = async () => {
        await init;
        return new Promise(resolve => {
            getRecordsResolver(resolve);
        });
    }

    /** Functions to save content **/
    x.saveFile = async function (id, buffer) {
        await init;
        let trans = kanaDB.result.transaction(["file", "file_meta"], "readwrite");
        let file_store = trans.objectStore("file");
        let meta_store = trans.objectStore("file_meta");

        var meta = await loadContent(id, meta_store);
        if (meta === null) {
            refcount = 0;
        } else {
            refcount = meta["count"];
        }
        refcount++;

        var data_saving = new Promise(resolve => {
            var putrequest = file_store.put({ "id": id, "payload": buffer });
            putrequest.onsuccess = function (event) {
                resolve(true);
            };
            putrequest.onerror = function (event) {
                resolve(false);
            };
        });

        var ref_saving = new Promise(resolve => {
            meta.count = refcount;
            var putrequest = meta_store.put(meta);
            putrequest.onsuccess = function (event) {
                resolve(true);
            };
            putrequest.onerror = function (event) {
                resolve(false);
            };
        });

        return allOK([data_saving, ref_saving])
    };

    x.saveAnalysis = async function (id, state, files, title) { 
        await init;
        let trans = kanaDB.result.transaction(["analysis", "analysis_meta"], "readwrite")
        let analysis_store = trans.objectStore("analysis");
        let meta_store = trans.objectStore("analysis_meta");

        if (id == null) {
            let already = await new Promise(resolve => {
                getRecordsResolver(resolve, meta_store);
            });
            id = String(already.length);
        }

        var data_saving = new Promise(resolve => {
            var putrequest = analysis_store.put({ "id": id, "payload": state });
            putrequest.onsuccess = function (event) {
                resolve(true);
            };
            putrequest.onerror = function (event) {
                resolve(false);
            };
        });

        var id_saving = new Promise(resolve => {
            var putrequest = meta_store.put({ "id": id, "files": files, "time": Number(new Date()), "title": title });
            putrequest.onsuccess = function (event) {
                resolve(true);
            };
            putrequest.onerror = function (event) {
                resolve(false);
            };
        });

        if (await allOK([data_saving, id_saving])) {
            return id;
        } else {
            return null;
        }
    };

    /** Functions to load content **/
    x.loadFile = async function (id) {
        await init;
        let file_store = kanaDB.result
            .transaction(["file"], "readonly")
            .objectStore("file");
        return loadContent(id, file_store)["payload"];
    };

    x.loadAnalysis = async function (id) {
        await init;
        let analysis_store = kanaDB.result
            .transaction(["analysis"], "readonly")
            .objectStore("analysis");
        return loadContent(id, analysis_store)["payload"];
    };

    /** Functions to load content **/
    x.removeFile = async function(id) {
        await init;
        let trans = kanaDB.result.transaction(["file", "file_meta"], "readwrite");
        let file_store = trans.objectStore("file");
        let meta_store = trans.objectStore("file_meta");

        var meta = await loadContent(id, meta_store);
        var refcount = meta["count"];
        refcount--;
        var promises = [];

        if (refcount == 0) {
            promises.push(new Promise(resolve => {
                let request = file_store.remove(id);
                request.onerror = function (event) {
                    resolve(false);
                };
                request.onsuccess = function (event) {
                    resolve(true);
                };
            }));
            promises.push(new Promise(resolve => {
                let request = meta_store.delete(id);
                request.onerror = function (event) {
                    resolve(false);
                };
                request.onsuccess = function (event) {
                    resolve(true);
                };
            }))
        } else {
            promises.push(new Promise(resolve => {
                meta.count = refcount;
                let request = meta_store.put(meta);
                request.onsuccess = function (event) {
                    resolve(true);
                };
                request.onerror = function (event) {
                    resolve(false);
                };
            }));
        }

        return allOK(promises);
    };

    x.removeAnalysis = async function(id) {
        await init;
        let trans = kanaDB.result.transaction(["analysis", "analysis_meta"], "readwrite")
        let analysis_store = trans.objectStore("analysis");
        let meta_store = trans.objectStore("analysis_meta");

        var promises = [];

        promises.push(new Promise(resolve => {
            let request = analysis_store.delete(id);
            request.onsuccess = function (event) {
                resolve(true);
            };
            request.onerror = function (event) {
                resolve(false);
            };
        }));

        // Removing all files as well.
        var files = await loadContent(id, meta_store)["files"];
        for (const f of files) {
            promises.push(x.removeFile(f));
        }

        promises.push(new Promise(resolve => {
            let request = meta_store.delete(id);
            request.onsuccess = function (event) {
                resolve(true);
            };
            request.onerror = function (event) {
                resolve(false);
            };
        }));

        return allOK(promises);
    };

})(kana_db);
