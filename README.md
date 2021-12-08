# Getting Started

To start the app,

```
yarn start # if using yarn, highly recommended
npm run start # if using npm
```

usually runs on port 3000 unless something else is already running.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

# Gotchas

## CrossOriginIsolation

Currently the app uses service-workers to enable cross origin isolation. This allows us to use sharedArrayBuffers and pthreads!

One caveat of this process is since a service-worker caches the resources and loads these blobs, the generated js bindings from emscripten does not understand this. This is usually not a problem, but turns out to be problem when loading service workers.

https://github.com/emscripten-core/emscripten/issues/14089

I manually modified the emscripten generated scran.js file with one of the solution here -

replace these in the generate js bindings

```
worker.postMessage({
    "cmd": "load",
    <!-- we are mostly updating the line below -->
    "urlOrBlob": Module["mainScriptUrlOrBlob"] || (self.location.origin + "/scran/scran.js"),
    "wasmMemory": wasmMemory,
    "wasmModule": wasmModule
})
```
