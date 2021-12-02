#include <emscripten/bind.h>

#include "NumericMatrix.h"
#include "utils.h"

#include "scran/normalization/LogNormCounts.hpp"

#include <vector>
#include <cstdint>

/**
 * Compute log-normalized expression values.
 *
 * @param mat A `NumericMatrix` object containing features in rows and cells in columns.
 * @param use_size_factors Whether to use custom size factors, or to compute them based on the library size.
 * @param size_factors Offset to an array of `double`s of length `nsubsets`, containing (possibly uncentered) positive size factors for each column of `mat`.
 * Only used if `use_size_factors = true`.
 * @param use_blocks Whether or not to compute the default filters within each block.
 * @param blocks Offset to an array of `int32_t`s with `mat.ncol()` elements, containing the block assignment for each cell.
 * Block IDs should be consecutive and 0-based.
 * If `use_blocks = false`, this value is ignored.
 *
 * @return A `NumericMatrix` containing log-normalized expression values is returned.
 * If `use_blocks = true`, centering of the size factors is performed within each block,
 * so as to mimic separate normalization of cells in that block.
 */
NumericMatrix log_norm_counts(const NumericMatrix& mat, 
                         bool use_size_factors,
                         uintptr_t size_factors,
                         bool use_blocks, 
                         uintptr_t blocks) 

{
    scran::LogNormCounts norm;
    
    std::vector<double> sf;
    if (use_size_factors) {
        const double* sfptr = reinterpret_cast<const double*>(size_factors);
        sf.insert(sf.end(), sfptr, sfptr + mat.ncol());
    } else {
        sf = tatami::column_sums(mat.ptr.get());
    }

    if (use_blocks) {
        return NumericMatrix(norm.run_blocked(mat.ptr, std::move(sf), reinterpret_cast<const uint32_t*>(blocks)));
    } else {
        return NumericMatrix(norm.run(mat.ptr, std::move(sf)));
    }
}

/**
 * @cond 
 */
EMSCRIPTEN_BINDINGS(log_norm_counts) {
    emscripten::function("log_norm_counts", &log_norm_counts);
}
/**
 * @endcond 
 */
