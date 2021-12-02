cmake_minimum_required(VERSION 3.14 FATAL_ERROR)

execute_process(COMMAND bash generate.sh
                WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/igraph)
set(F2C_EXTERNAL_ARITH_HEADER "${CMAKE_CURRENT_SOURCE_DIR}/igraph/arith.h" CACHE FILEPATH "" FORCE)
set(IGRAPH_WARNINGS_AS_ERRORS OFF CACHE BOOL "" FORCE)

include(FetchContent)

FetchContent_Declare(
  scran 
  GIT_REPOSITORY https://github.com/LTLA/libscran
  GIT_TAG master
)
FetchContent_MakeAvailable(scran)

FetchContent_Declare(
  irlba 
  GIT_REPOSITORY https://github.com/LTLA/CppIrlba
  GIT_TAG master
)
FetchContent_MakeAvailable(irlba)

if (NOT HAVE_ZLIB_H)
    # Pulling zlib from the port repository, which should hopefully
    # be similar enough to whatever emcc is pulling down when USE_ZLIB=1.
    # We just need it for the headers so we won't bother building it,
    # given that they'll be linked to the right WASM file later on.
    FetchContent_Declare(
      zlib
      GIT_REPOSITORY https://github.com/emscripten-ports/zlib
      GIT_TAG master
      CONFIGURE_COMMAND ""
      BUILD_COMMAND ""
    )

    FetchContent_GetProperties(zlib)
    if(NOT zlib_POPULATED)
      FetchContent_Populate(zlib)
    endif()

    add_library(zlib INTERFACE)
    target_include_directories(zlib INTERFACE ${zlib_SOURCE_DIR})
endif()

FetchContent_Declare(
  qdtsne 
  GIT_REPOSITORY https://github.com/LTLA/qdtsne
  GIT_TAG master
)
FetchContent_MakeAvailable(qdtsne)

FetchContent_Declare(
  umappp 
  GIT_REPOSITORY https://github.com/LTLA/umappp
  GIT_TAG master
)
FetchContent_MakeAvailable(umappp)
