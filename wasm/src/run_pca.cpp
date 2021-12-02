#include <emscripten/bind.h>

#include "NumericMatrix.h"
#include "scran/dimensionality_reduction/RunPCA.hpp"

#include <vector>
#include <cmath>
#include <algorithm>

/**
 * @file run_pca.cpp
 *
 * @brief Compute the top principal components in the log-expression matrix.
 */

/**
 * @brief Javascript-visible wrapper around `scran::RunPCA::Results`.
 */
struct RunPCA_Results {
    /**
     * @cond
     */
    typedef scran::RunPCA::Results Store;

    RunPCA_Results(Store s) : store(std::move(s)) {}

    Store store;
    /**
     * @endcond
     */

    /**
     * @return `Float64Array` view into a column-major 2D array of PCs.
     * Each row is a PC and each column is a cell.
     */
    emscripten::val pcs() const {
        return emscripten::val(emscripten::typed_memory_view(store.pcs.cols() * store.pcs.rows(), store.pcs.data()));
    }

    /**
     * @return `Float64Array` view containing the variance explained by each PC.
     */
    emscripten::val variance_explained() const {
        return emscripten::val(emscripten::typed_memory_view(store.variance_explained.size(), store.variance_explained.data()));
    }

    /**
     * @return `Float64Array` view containing the total variance of the input matrix.
     */
    double total_variance() const {
        return store.total_variance;
    }
};

/**
 * Perform a principal components analysis to obtain per-cell coordinates in low-dimensional space.
 *
 * @param mat The input log-expression matrix, with features in rows and cells in columns.
 * @param number Number of PCs to obtain.
 * Must be less than the smaller dimension of `mat`.
 * @param use_subset Whether to subset the matrix to features of interest in `subset`.
 * @param[in] subset Offset to an input array of `uint8_t`s of length `mat.nrow()`,
 * indicating which features should be used for the PCA.
 * Only used if `use_subset = true`.
 * @param scale Whether to standardize rows in `mat` to unit variance.
 * If `true`, all rows in `mat` are assumed to have non-zero variance.
 *
 * @return A `RunPCA_Results` object is returned containing the PCA results.
 */
RunPCA_Results run_pca(const NumericMatrix& mat, int number, bool use_subset, uintptr_t subset, bool scale) {
    auto ptr = mat.ptr;
    auto NR = ptr->nrow();
    auto NC = ptr->ncol();
    assert(NC > 1);
    assert(NC > number);

    scran::RunPCA pca;
    pca.set_rank(number).set_scale(scale);

    // Guessing the sparsity during initial pre-allocation of each column's memory.
    // We cap the capacity to avoid allocation problems during sparse matrix construction.
    constexpr double capacity = 50e6;
    double sparsity_guess = std::min((capacity / NC) / NR, 0.1);
    pca.set_sparsity(sparsity_guess);

    const uint8_t* subptr = NULL;
    if (use_subset) {
        subptr = reinterpret_cast<const uint8_t*>(subset);
    }
    auto result = pca.run(ptr, subptr);

    // Transposing PCs to get the right orientation.
    result.pcs.adjointInPlace();

    return RunPCA_Results(std::move(result)); 
}

/**
 * @cond
 */
EMSCRIPTEN_BINDINGS(run_pca) {
    emscripten::function("run_pca", &run_pca);

    emscripten::class_<RunPCA_Results>("RunPCA_Results")
        .function("pcs", &RunPCA_Results::pcs)
        .function("variance_explained", &RunPCA_Results::variance_explained)
        .function("total_variance", &RunPCA_Results::total_variance)
        ;
}
/**
 * @endcond
 */

