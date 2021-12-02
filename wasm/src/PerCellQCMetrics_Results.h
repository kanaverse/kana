#ifndef PER_CELL_QC_METRICS_RESULTS_H
#define PER_CELL_QC_METRICS_RESULTS_H

#include <emscripten/bind.h>
#include "scran/quality_control/PerCellQCMetrics.hpp"

/**
 * @file PerCellQCMetrics_Results.h
 *
 * @brief Store the per-cell QC metrics, obviously.
 */

/**
 * @brief Javascript-visible wrapper around `scran::PerCellQCMetrics::Results`.
 */
struct PerCellQCMetrics_Results {
    /**
     * @cond
     */
    typedef scran::PerCellQCMetrics::Results Store;

    PerCellQCMetrics_Results(Store s) : store(std::move(s)) {}

    Store store;
    /**
     * @endcond
     */

    /**
     * @return `Float64Array` view containing the total count for each cell.
     */
    emscripten::val sums() const {
        return emscripten::val(emscripten::typed_memory_view(store.sums.size(), store.sums.data()));
    }

    /**
     * @return `Int32Array` view containing the total number of detected genes for each cell.
     */
    emscripten::val detected() const {
        return emscripten::val(emscripten::typed_memory_view(store.detected.size(), store.detected.data()));
    }

    /**
     * @param i Index of the feature subset of interest.
     * @return `Float64Array` view containing the proportion of counts in subset `i` for each cell.
     */
    emscripten::val subset_proportions(int i) const {
        const auto& current = store.subset_proportions[i];
        return emscripten::val(emscripten::typed_memory_view(current.size(), current.data()));
    }
};

#endif
