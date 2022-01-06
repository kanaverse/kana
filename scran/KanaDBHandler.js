var kana_db = {};

(function (x) {
    /** Private members **/
    var kanaDB, kanaDBClient;

    // params to db should contain {id, payload}

    /** Private functions **/
    x.init = () => {
        // initialize database on worker creation
        kanaDB = indexedDB.open("KanaDB");

        kanaDB.onupgradeneeded = (e) => {
            kanaDBClient = e.target.result;
            kanaDBClient.createObjectStore("analysis", { keyPath: 'id' });
        };

        // on initialize send UI existing stored analysis
        kanaDB.onsuccess = () => {
            kanaDBClient = kanaDB.result;

            var allAnalysis = kanaDBClient
                .transaction(["analysis"], "readwrite")
                .objectStore("analysis").getAllKeys();

            allAnalysis.onsuccess = function () {
                postMessage({
                    type: "KanaDB_store",
                    resp: allAnalysis.result,
                    msg: `Success`
                });
            }
        };

        kanaDB.onerror = () => {
            postMessage({
                type: "KanaDB_ERROR",
                msg: `Fail: Cannot initialize DB`
            });
        };
    }

    x.getClient = () => {
        return kanaDBClient;
    }

    x.save = (params) => {
        let analysisStore = kanaDBClient
            .transaction(["analysis"], "readwrite")
            .objectStore("analysis")

        let getrequest = analysisStore.get(params.id);

        getrequest.onsuccess = function (event) {
            var data = event.target.result;

            if (!data) {
                let addrequest = kanaDBClient
                    .transaction(["analysis"], "readwrite")
                    .objectStore("analysis")
                    .add(params);

                addrequest.onsuccess = function (event) {
                    postMessage({
                        type: "KanaDB",
                        msg: `Success: Analysis saved ${params.id}!!`
                    });
                };

                addrequest.onerror = function (event) {
                    postMessage({
                        type: "KanaDB_ERROR",
                        msg: `Fail: Cannot save analysis: ${params.id}!!`
                    });
                };
            } else {
                data.payload = params.payload;

                var requestUpdate = analysisStore.put(data);
                requestUpdate.onerror = function (event) {
                    postMessage({
                        type: "KanaDB_ERROR",
                        msg: `Fail: Cannot save analysis: ${params.id}!!`
                    });
                };

                requestUpdate.onsuccess = function (event) {
                    postMessage({
                        type: "KanaDB",
                        msg: `Success: Analysis updated ${params.id}!!`
                    });
                };
            }
        };

        getrequest.onerror = function (event) {
            let addrequest = kanaDBClient
                .transaction(["analysis"], "readwrite")
                .objectStore("analysis")
                .add(params);

            addrequest.onsuccess = function (event) {
                postMessage({
                    type: "KanaDB",
                    msg: `Success: Analysis saved ${params.id}!!`
                });
            };

            addrequest.onerror = function (event) {
                postMessage({
                    type: "KanaDB_ERROR",
                    msg: `Fail: Cannot save analysis: ${params.id}!!`
                });
            };
        };
    }

    x.remove = (params) => {
        let request = kanaDBClient
            .transaction(["analysis"], "readwrite")
            .objectStore("analysis")
            .remove(params.id);

        request.onerror = function (event) {
            postMessage({
                type: "KanaDB_ERROR",
                msg: `Fail: Cannot remove analysis: ${params.id}!!`
            });
        };

        request.onsuccess = function (event) {
            postMessage({
                type: "KanaDB",
                resp: event.target.result,
                msg: `Success: Analysis deleted!`
            });
        };
    }
})(kana_db);
