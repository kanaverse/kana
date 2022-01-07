var kana_db = {};

(function (x) {
    /** Private members **/
    var kanaDB;
    var init = null;

    x.initialize = function() {
        init = new Promise(resolve => {
            // initialize database on worker creation
            kanaDB = indexedDB.open("KanaDB");
    
            kanaDB.onupgradeneeded = (e) => {
                var kanaDBClient = e.target.result;
                kanaDBClient.createObjectStore("analysis", { keyPath: 'id' });
                kanaDBClient.createObjectStore("file", { keyPath: 'id' });
                kanaDBClient.createObjectStore("file_ref_count", { keyPath: 'id' });
            };
    
            // Send existing stored analyses, if available.
            kanaDB.onsuccess = () => {
                var kanaDBClient = kanaDB.result; 
                var allAnalysis = kanaDBClient
                    .transaction(["analysis"], "readonly")
                    .objectStore("analysis").getAllKeys();
    
                allAnalysis.onsuccess = function () {
                    resolve({
                        type: "KanaDB_store",
                        resp: allAnalysis.result,
                        msg: "Success"
                    });
                }
            };
    
            kanaDB.onerror = () => {
                resolve({
                    type: "KanaDB_ERROR",
                    msg: `Fail: Cannot initialize DB`
                });
            };
        });

        return init;
    };

    /** Helper functions **/
    async function loadContent(id, store) {
        return new Promise(resolve => {
            let request = store.get(id);
            request.onsuccess = function() {
                resolve(request.result.payload);
            };
            request.onerror = function() {
                resolve(null);
            };
        });
    }

    async function hasContent(id, store) {
        return new Promise(resolve => {
            let request = store.count(id);
            request.onSuccess = function() {
                resolve(request.result > 0);
            };
            request.onError = function() {
                resolve(false);
            };
        });
    }

    /** Functions to save content **/
    x.saveFile = async function(id, buffer) {
        await init;
        let trans = kanaDB.result.transaction(["file", "file_ref_count"], "readwrite");
        let file_store = trans.objectStore("file");
        let ref_store = trans.objectStore("file_ref_count");

        var refcount = 0;
        if (await hasContent(id, ref_store)) {
            refcount = await loadContent(id, ref_store);
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
            var putrequest = ref_store.put({ "id": id, "payload": refcount });
            putrequest.onsuccess = function (event) {
                resolve(true);
            };
            putrequest.onerror = function (event) {
                resolve(false);
            };
        });

        return Promise.allSettled([data_saving, ref_saving])
        .then(vals => {
            var fail = false;
            for (const x of vals) {
                if (!x) {
                    return {
                        type: "KanaDB_ERROR",
                        msg: `Fail: Cannot save file to cache (${id})`
                    };
                }
            }
            return { 
                type: "KanaDB",
                msg: `Success: Saved file to cache (${id})`
            };
        });
    };

    x.saveAnalysis = async function(id, state) {
        await init;
        let analysis_store = kanaDB.result
            .transaction(["analysis"], "readwrite")
            .objectStore("analysis");

        return new Promise(resolve => {
            var putrequest = analysis_store.put({ "id": id, "payload": state });
            putrequest.onsuccess = function (event) {
                resolve({
                    type: "KanaDB",
                    msg: `Success: Saved analysis to cache (${id})`
                });
            };
            putrequest.onerror = function (event) {
                resolve({
                    type: "KanaDB_ERROR",
                    msg: `Fail: Cannot save analysis to cache (${id})`
                });
            };
        });
    };

    /** Functions to load content **/
    x.loadFile = async function(id) {
        await init;
        let file_store = kanaDB.result
            .transaction(["file"], "readonly")
            .objectStore("file");
        return loadContent(id, file_store);
    };

    x.loadAnalysis = async function(id) {
        await init;
        let analysis_store = kanaDB.result
            .transaction(["analysis"], "readonly")
            .objectStore("analysis");
        return loadContent(id, analysis_store);
    };

    /** Functions to load content **/
    x.removeFile = async function removeFile(id) {
        await init;
        let trans = kanaDB.result.transaction(["file", "file_ref_count"], "readwrite");
        let file_store = trans.objectStore("file");
        let ref_store = trans.objectStore("file_ref_count");

        var promises = [];
        var rid = refCount(id);
        var refcount = await loadContent(rid, file_ref_count);
        refcount--;

        if (refcount == 0) {
            promises.push(new Promise(resolve => {
                let request = file_store.remove(id);
                request.onerror = function (event) {
                    resolve(false);
                };
                request.onsuccess = function(event) {
                    resolve(true);
                };
            }));
            promises.push(new Promise(resolve => {
                let request = ref_store.remove(rid);
                request.onerror = function (event) {
                    resolve(false);
                };
                request.onsuccess = function(event) {
                    resolve(true);
                };
            }))
        } else {
            promises.push(new Promise(resolve => {
                let request = ref_store.put({ "id": rid, "payload": refcount })
                request.onerror = function (event) {
                    resolve(false);
                };
                request.onsuccess = function(event) {
                    resolve(true);
                };
            }));
        }

        return Promise.allSettled(promises)
        .then(vals => {
            var fail = false;
            for (const x of vals) {
                if (!x) {
                    return {
                        type: "KanaDB_ERROR",
                        msg: `Fail: Cannot remove file from cache (${id})`
                    };
                }
            }
            return { 
                type: "KanaDB",
                msg: `Success: Removed file from cache (${id})`
            };
        });
    };

    x.removeAnalysis = async function removeFile(id) {
        await init;
        let analysis_store = kanaDB.result
            .transaction(["analysis"], "readwrite")
            .objectStore("analysis");

        return new Promise(resolve => {
            var putrequest = analysis_store.remove(id);
            putrequest.onsuccess = function (event) {
                resolve({
                    type: "KanaDB",
                    msg: `Success: Removed analysis from cache (${id})`
                });
            };
            putrequest.onerror = function (event) {
                resolve({
                    type: "KanaDB_ERROR",
                    msg: `Fail: Cannot remove analysis from cache (${id})`
                });
            };
        });
    };

})(kana_db);
