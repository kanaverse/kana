#include <emscripten/bind.h>

#include "NumericMatrix.h"
#include "utils.h"

#include "scran/differential_analysis/ScoreMarkers.hpp"

#include <vector>
#include <algorithm>
#include <cstdint>

/**
 * @file score_markers.cpp
 *
 * @brief Compute marker scores for each gene in each group of cells.
 */

/**
 * @brief Javascript-visible wrapper for `scran::ScoreMarkers::Results`.
 */
struct ScoreMarkers_Results {
    /**
     * @cond
     */
    typedef scran::ScoreMarkers::Results Store;

    ScoreMarkers_Results(Store s) : store(std::move(s)) {}

    Store store;
    /**
     * @endcond
     */

    /**
     * @param g Group of interest.
     * @param b Block of interest.
     * 
     * @return `Float64Array` view containing the mean log-expression of each gene for group `g` in block `b`.
     */
    emscripten::val means(int g, int b=0) const {
        const auto& current = store.means[g][b];
        return emscripten::val(emscripten::typed_memory_view(current.size(), current.data()));
    }

    /**
     * @param g Group of interest.
     * @param b Block of interest.
     * 
     * @return `Float64Array` view containing the proportion of cells with detected expression for each gene for group `g` in block `b`.
     */
    emscripten::val detected(int g, int b=0) const {
        const auto& current = store.detected[g][b];
        return emscripten::val(emscripten::typed_memory_view(current.size(), current.data()));
    }

    /**
     * @param g Group of interest.
     * @param s Summary statistic of interest for the per-gene Cohen's D from the pairwise comparisons between `g` and every other group.
     * This can be the minimum across comparisons (0), mean (1), median (2), maximum (3) or min-rank (4).
     * 
     * @return `Float64Array` view of length equal to the number of genes.
     * Each entry contains the summarized Cohen's D across all pairwise comparisons between `g` and every other group for a particular gene.
     */
    emscripten::val cohen(int g, int s=1) const {
        const auto& current = store.cohen[s][g];
        return emscripten::val(emscripten::typed_memory_view(current.size(), current.data()));
    }

    /**
     * @param g Group of interest.
     * @param s Summary statistic of interest for the per-gene AUC from the pairwise comparisons between `g` and every other group.
     * This can be the minimum across comparisons (0), mean (1), median (2), maximum (3) or min-rank (4).
     * 
     * @return `Float64Array` view of length equal to the number of genes.
     * Each entry contains the summarized AUC across all pairwise comparisons between `g` and every other group for a particular gene.
     */
    emscripten::val auc(int g, int s=1) const {
        const auto& current = store.auc[s][g];
        return emscripten::val(emscripten::typed_memory_view(current.size(), current.data()));
    }
};

/**
 * Identify potential markers for groups of cells with a range of effect size statistics.
 *
 * @param mat An input log-expression matrix containing features in rows and cells in columns.
 * @param groups Offset to an array of `int32_t`s with `ncells` elements, containing the group assignment for each cell.
 * Group IDs should be consecutive and 0-based.
 * @param use_blocks Whether or not to compute the statistics within each block.
 * @param[in] blocks If `use_blocks = true`, offset to an array of `int32_t`s with `ncells` elements, containing the block assignment for each cell.
 * Block IDs should be consecutive and 0-based.
 * If `use_blocks = false`, this value is ignored.
 *
 * @return A `ScoreMarkers_Results` containing summary statistics from comparisons between groups of cells.
 */
ScoreMarkers_Results score_markers(const NumericMatrix& mat, uintptr_t groups, bool use_blocks, uintptr_t blocks) {
    scran::ScoreMarkers mrk;
    const int32_t* gptr = reinterpret_cast<const int32_t*>(groups);
    const int32_t* bptr = NULL;
    if (use_blocks) {
        bptr = reinterpret_cast<const int32_t*>(blocks);
    }
    
    auto store = mrk.run_blocked(mat.ptr.get(), gptr, bptr);
    return ScoreMarkers_Results(std::move(store));
}

/**
 * @cond 
 */
EMSCRIPTEN_BINDINGS(score_markers) {
    emscripten::function("score_markers", &score_markers);

    emscripten::class_<ScoreMarkers_Results>("ScoreMarkers_Results")
        .function("means", &ScoreMarkers_Results::means)
        .function("detected", &ScoreMarkers_Results::detected)
        .function("cohen", &ScoreMarkers_Results::cohen)
        ;
}
/**
 * @endcond 
 */

