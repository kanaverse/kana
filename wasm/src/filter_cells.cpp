#include <emscripten/bind.h>
#include "NumericMatrix.h"
#include "scran/quality_control/FilterCells.hpp"
#include <cstdint>

/**
 * Filter out low-quality cells.
 *
 * @param mat A `NumericMatrix` instance containing the expression matrix, with features in rows and cells in columns.
 * @param filter Offset to an input array of `uint8_t` of length `mat.ncol()`, indicating whether a cell should be filtered. 
 * @param keep Whether or not non-zero values in `filter` correspond to retained cells.
 * If `false`, non-zero values in `filter` are to be discarded.
 *
 * @return A `NumericMatrix` containing the column-filtered matrix.
 */
NumericMatrix filter_cells(const NumericMatrix& mat, uintptr_t filter, bool keep) {
    scran::FilterCells filterer;
    if (keep) {
        filterer.set_retain();
    }
    return NumericMatrix(filterer.run(mat.ptr, reinterpret_cast<const uint8_t*>(filter)));
}

/**
 * @cond 
 */
EMSCRIPTEN_BINDINGS(filter_cells) {
    emscripten::function("filter_cells", &filter_cells);
}
/**
 * @endcond 
 */

