# WASM compilation

This directory contains the files required to create the **scran.js** WASM binary.
We use CMake to manage the compilation process as well as the dependencies, namely the [**scran** C++ library](https://github.com/LTLA/libscran).
Compilation of the WASM binary is done using Emscripten:

```sh
emcmake cmake -S . -B build
(cd build && emmake make)
```

This will build the `.js` and `.wasm` file within the `build/` subdirectory.
