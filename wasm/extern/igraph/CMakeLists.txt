project(igraph-arithchk)
cmake_minimum_required(VERSION 3.14)

if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/arithchk.c")
    file(DOWNLOAD https://raw.githubusercontent.com/igraph/igraph/298c0ac9777869090de2b3bca94a4d17cd5564fa/vendor/f2c/arithchk.c arithchk.c)
endif()

add_executable(arithchk.js arithchk.c)
target_compile_options(arithchk.js PRIVATE -DNO_FPINIT)
target_link_libraries(arithchk.js m)

add_custom_target(arith.h ALL DEPENDS arithchk.js)
add_custom_command(
    TARGET arith.h
    COMMAND node arithchk.js > ${CMAKE_CURRENT_BINARY_DIR}/arith.h
)

