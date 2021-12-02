# Building `arith.h` for igraph 

Normally, **igraph** constructs `arith.h` at build time by checking the system's floating point properties.
However, this is not possible when cross-compiling with Emscripten, requiring us to generate our own file and supply its path as an environment variable.
(See [details here](https://igraph.org/c/doc/igraph-Installation.html#igraph-Installation-cross-compiling).)

This directory contains instructions for determining the floating point properties of WebAssembly by compiling `arithchk.c` with Emscripten and running the `arithchk.js` executable.
The resulting `arith.h` file is then used in the main **scran.js** WASM build.
The assumption is that any configuration provided by Emscripten should be portable if it follows the WebAssembly standards.
Thus, it shouldn't matter that this particular copy of `arith.h` was generated on a different machine from the user's.
