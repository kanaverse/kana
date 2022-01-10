#!/bin/bash

set -e
set -u

# One caveat of using service workers is that the generated JS bindings from
# emscripten does not understand the source of the 're-served' files, as the
# relative locations of the files are all different. See here:
# 
# https://github.com/emscripten-core/emscripten/issues/14089
# 
# We implement the same workaround in the line below.
curl -L https://github.com/jkanche/scran.js/releases/download/latest-web/scran.js | sed "s/||_scriptDir,/||(self.location.origin + \"\/scran\/scran.js\"),/" > scran.js

# Everything else just gets copied without problems:
curl -L https://github.com/jkanche/scran.js/releases/download/latest-web/scran.wasm > scran.wasm
curl -L https://github.com/jkanche/scran.js/releases/download/latest-web/scran.worker.js > scran.worker.js
