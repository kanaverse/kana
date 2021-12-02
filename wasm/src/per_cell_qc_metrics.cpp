#include <emscripten/bind.h>

#include "NumericMatrix.h"
#include "utils.h"
#include "PerCellQCMetrics_Results.h"

#include "scran/quality_control/PerCellQCMetrics.hpp"

#include <vector>
#include <cstdint>

/**
 * @file per_cell_qc_metrics.cpp
 *
 * @brief Compute per-cell QC metrics from the count matrix.
 */

/**
 * Compute some basic per-cell QC metrics.
 *
 * @param mat A `NumericMatrix` object containing features in rows and cells in columns.
 * @param nsubsets Number of feature subsets to be considered.
 * @param[in] subsets Offset to a 2D array of `uint8_t`s with number of rows and columns equal to `mat.nrow()` and `nsubsets`, respectively.
 * The array should be column-major where each column corresponds to a feature subset and each value indicates whether each feature in `mat` belongs to that subset.
 *
 * @return A `PerCellQCMetrics_Results` object that can be interrogated to obtain each QC metric.
 */
PerCellQCMetrics_Results per_cell_qc_metrics(const NumericMatrix& mat, int nsubsets, uintptr_t subsets) {
    scran::PerCellQCMetrics qc;
    auto store = qc.run(mat.ptr.get(), extract_column_pointers<const uint8_t*>(subsets, mat.nrow(), nsubsets));
    return PerCellQCMetrics_Results(std::move(store));
}

/**
 * @cond 
 */
EMSCRIPTEN_BINDINGS(per_cell_qc_metrics) {
    emscripten::function("per_cell_qc_metrics", &per_cell_qc_metrics);

    emscripten::class_<PerCellQCMetrics_Results>("PerCellQCMetrics_Results")
        .function("sums", &PerCellQCMetrics_Results::sums)
        .function("detected", &PerCellQCMetrics_Results::detected)
        .function("subset_proportions", &PerCellQCMetrics_Results::subset_proportions)
        ;
}
/**
 * @endcond 
 */
