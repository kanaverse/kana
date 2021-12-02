#!/bin/sh

emcmake cmake -B build -S .
(cd build && emmake make)
cp build/arith.h .
