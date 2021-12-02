#include <emscripten/bind.h>

#include "NumericMatrix.h"
#include "utils.h"

#include "scran/feature_selection/ModelGeneVar.hpp"

#include <vector>
#include <algorithm>
#include <cstdint>

/**
 * @file model_gene_var.cpp
 *
 * @brief Model the mean-variance relationship across all genes.
 */

/**
 * @brief Javascript-visible wrapper for `scran::ModelGeneVar::Results`.
 */
struct ModelGeneVar_Results {
    /**
     * @cond
     */
    typedef scran::ModelGeneVar::Results Store;

    ModelGeneVar_Results(Store s) : store(std::move(s)) {}

    Store store;
    /**
     * @endcond
     */

    /** 
     * @param b Block of interest.
     * @return A `Float64Array` view containing the mean log-expression for each gene in block `b`.
     */
    emscripten::val means(int b=0) {
        // TODO: fix this so it refers to the arrays properly.
        return emscripten::val(emscripten::typed_memory_view(store.means[b].size(), store.means[b].data()));
    }

    /** 
     * @param b Block of interest.
     * @return A `Float64Array` view containing the variance of the log-expression for each gene in block `b`.
     */
    emscripten::val variances(int b=0) {
        return emscripten::val(emscripten::typed_memory_view(store.variances[b].size(), store.variances[b].data()));
    }

    /** 
     * @param b Block of interest.
     * @return A `Float64Array` view containing the fitted value of the trend for each gene in block `b`.
     */
    emscripten::val fitted(int b=0) {
        return emscripten::val(emscripten::typed_memory_view(store.fitted[b].size(), store.fitted[b].data()));
    }

    /** 
     * @param b Block of interest.
     * @return A `Float64Array` view containing the residual from the trend for each gene in block `b`.
     */
    emscripten::val residuals(int b=0) {
        return emscripten::val(emscripten::typed_memory_view(store.residuals[b].size(), store.residuals[b].data()));
    }
};

/**
 * Model the variance of the log-expression values for each gene, accounting for the mean-variance trend.
 *
 * @param mat An input log-expression matrix containing features in rows and cells in columns.
 * @param use_blocks Whether or not to compute the statistics within each block.
 * If `false`, the number of blocks is assumed to be 1, otherwise it is determined from the maximum value of `blocks`.
 * @param blocks If `use_blocks = true`, offset to an array of `int32_t`s with `ncells` elements, containing the block assignment for each cell.
 * Block IDs should be consecutive and 0-based.
 * If `use_blocks = false`, this value is ignored.
 * @param span The span of the LOWESS smoother for fitting the mean-variance trend.
 *
 * @return A `ModelGeneVar_Results` object containing the variance modelling statistics.
 */
ModelGeneVar_Results model_gene_var(const NumericMatrix& mat, bool use_blocks, uintptr_t blocks, double span) {
    const int32_t* bptr = NULL;
    if (use_blocks) {
        bptr = reinterpret_cast<const int32_t*>(blocks);
    }

    scran::ModelGeneVar var;
    var.set_span(span);
    auto store = var.run_blocked(mat.ptr.get(), bptr);
    return ModelGeneVar_Results(std::move(store));
}

/**
 * @cond 
 */
EMSCRIPTEN_BINDINGS(model_gene_var) {
    emscripten::function("model_gene_var", &model_gene_var);

    emscripten::class_<ModelGeneVar_Results>("ModelGeneVar_Results")
        .function("means", &ModelGeneVar_Results::means)
        .function("variances", &ModelGeneVar_Results::variances)
        .function("fitted", &ModelGeneVar_Results::fitted)
        .function("residuals", &ModelGeneVar_Results::residuals)
        ;
}
/**
 * @endcond 
 */

