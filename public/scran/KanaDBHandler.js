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

    /** Functions to save content **/
    async function saveContent(id, payload, store) {
        await init;
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction([store], "readwrite")
            .objectStore(store)

        return new Promise(resolve => {
            var putrequest = targetStore.put({ "id": id, "payload": payload });
            putrequest.onsuccess = function (event) {
                resolve({
                    type: "KanaDB",
                    msg: `Success: Saved ${store} to cache (${id})`
                });
            };
            putrequest.onerror = function (event) {
                resolve({
                    type: "KanaDB_ERROR",
                    msg: `Fail: Cannot save {$store} to cache (${id})`
                });
            };
        });
    }

    x.saveFile = function(id, buffer) {
        return saveContent(id, buffer, "file");
    };

    x.saveAnalysis = function(id, state) {
        return saveContent(id, state, "analysis");
    };

    /** Functions to load content **/
    async function hasContent(id, store) {
        await init;
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction([store], "readonly")
            .objectStore(store);

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

    x.hasFile = function(id) {
        return hasContent(id, "file");
    };

    x.hasAnalysis = function(id) {
        return hasContent(id, "analysis");
    };

    /** Functions to load content **/
    async function loadContent(id, store) {
        await init;
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction([store], "readonly")
            .objectStore(store);

        return new Promise(resolve => {
            let request = targetStore.get(id);
            request.onsuccess = function() {
                resolve(request.result.payload);
            };
            request.onerror = function() {
                resolve(null);
            };
        });
    }

    x.loadFile = function(id) {
        return loadContent(id, "file");
    };

    x.loadAnalysis = function(id) {
        return loadContent(id, "analysis");
    };

    /** Functions to load content **/
    async function removeContent(id, store) {
        await init;
        var kanaDBClient = kanaDB.result;
        let targetStore = kanaDBClient
            .transaction([store], "readwrite")
            .objectStore(store);

        return new Promise(resolve => {
            let request = targetStore.remove(id);
            request.onerror = function (event) {
                resolve({
                    type: "KanaDB_ERROR",
                    msg: `Fail: Cannot remove analysis: ${params.id}!!`
                });
            };
    
            request.onsuccess = function (event) {
                resolve({
                    type: "KanaDB",
                    resp: event.target.result,
                    msg: `Success: Analysis deleted!`
                });
            };
        });
    }

    x.removeFile = function(id) {
        return removeContent(id, "file");
    };

    x.removeAnalysis = function(id) {
        return removeContent(id, "analysis");
    };

})(kana_db);
