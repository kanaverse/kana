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
    async function loadContent(id, targetStore, name = "payload") {
        return new Promise(resolve => {
            let request = targetStore.get(id);
            request.onsuccess = function() {
                resolve(request.result[name]);
            };
            request.onerror = function() {
                resolve(null);
            };
        });
    }

    async function hasContent(id, targetStore) {
        return new Promise(resolve => {
            let request = targetStore.count(id);
            request.onSuccess = function() {
                resolve(request.result > 0);
            };
            request.onError = function() {
                resolve(false);
            };
        });
    }

    function refCountId(id) {
        return id + "@nref";
    }

    /** Functions to save content **/
    x.saveFile = async function(id, buffer) {
        await init;
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction(["file"], "readwrite")
            .objectStore("file");

        var rid = refCountId(id), refcount = 0;
        if (hasContent(id, targetStore)) {
            refcount = loadContent(rid, targetStore, "count");
        }
        refcount++;

        var data_saving = new Promise(resolve => {
            var putrequest = targetStore.put({ "id": id, "payload": buffer });
            putrequest.onsuccess = function (event) {
                resolve(true);
            };
            putrequest.onerror = function (event) {
                resolve(false);
            };
        });

        var ref_saving = new Promise(resolve => {
            var putrequest = targetStore.put({ "id": rid, "count": refcount });
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
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction(["analysis"], "readwrite")
            .objectStore("analysis");

        return new Promise(resolve => {
            var putrequest = targetStore.put({ "id": id, "payload": payload });
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
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction(["file"], "readonly")
            .objectStore("file");
        return loadContent(id, targetStore);
    };

    x.loadAnalysis = async function(id) {
        await init;
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction(["analysis"], "readonly")
            .objectStore("analysis");
        return loadContent(id, targetStore);
    };

    /** Functions to load content **/
    x.removeFile = async function removeFile(id) {
        await init;
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction(["file"], "readwrite")
            .objectStore("file");

        var promises = [];
        var rid = refCount(id);
        var refcount = loadContent(rid, targetStore, "count") - 1;

        if (refcount == 0) {
            promises.push(new Promise(resolve => {
                let request = targetStore.remove(id);
                request.onerror = function (event) {
                    resolve(false);
                };
                request.onsuccess = function(event) {
                    resolve(true);
                };
            }));
            promises.push(new Promise(resolve => {
                let request = targetStore.remove(rid);
                request.onerror = function (event) {
                    resolve(false);
                };
                request.onsuccess = function(event) {
                    resolve(true);
                };
            }))
        } else {
            promises.push(new Promise(resolve => {
                let request = targetStore.put({ "id": rid, "count": refcount })
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
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction(["analysis"], "readwrite")
            .objectStore("analysis");

        return new Promise(resolve => {
            var putrequest = targetStore.remove(id);
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
