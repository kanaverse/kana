#!/bin/bash

set -e
set -u

curl -L https://github.com/jkanche/scran.js/releases/download/latest-web/scran.js > scran.js
curl -L https://github.com/jkanche/scran.js/releases/download/latest-web/scran.wasm > scran.wasm
curl -L https://github.com/jkanche/scran.js/releases/download/latest-web/scran.worker.js > scran.worker.js
curl -L https://raw.githubusercontent.com/jkanche/scran.js/master/js/WasmBuffer.js > WasmBuffer.js
