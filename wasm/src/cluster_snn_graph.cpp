#include <emscripten/bind.h>

#include "scran/clustering/ClusterSNNGraph.hpp"
#include <algorithm>

/**
 * @file cluster_snn_graph.cpp
 *
 * @brief Identify clusters from a shared nearest-neighbor graph.
 */

/**
 * @brief Javascript-visible wrapper around `scran::ClusterSNNGraph::MultiLevelResult`.
 */
struct ClusterSNNGraph_MultiLevelResult {
    /**
     * @cond
     */
    typedef scran::ClusterSNNGraph::MultiLevelResult Store;

    ClusterSNNGraph_MultiLevelResult(Store s) : store(std::move(s)) {}

    Store store;
    /**
     * @endcond
     */

    /**
     * @return Number of available levels.
     */
    int number() const {
        return store.membership.size();
    }

    /**
     * @return Index of the level with the highest modularity.
     */
    int best() const {
        return store.max;
    }

    /**
     * @param i Index of the level of interest.
     * @return Modularity of the clustering at that level.
     */
    double modularity(int i) const {
        return store.modularity[i];
    }

    /**
     * @param i Index of the level of interest.
     * @return `Int32Array` view containing the cluster assignment for each cell.
     */
    emscripten::val membership(int i) const {
        const auto& current = store.membership[i];
        return emscripten::val(emscripten::typed_memory_view(current.size(), current.data()));
    }
};

/**
 * @param ndim Number of dimensions.
 * @param ncells Number of cells.
 * @param[in] mat Offset to an array of `double`s containing per-cell coordinates (usually PCs).
 * Array should be column-major where rows are dimensions and columns are cells.
 * @param k Number of neighbors to use to construct the nearest neighbor graph.
 * @param resolution Resolution of the multi-level clustering, used in the modularity calculation.
 * Larger values yield more fine-grained clusters.
 * @param approximate Whether an approximate nearest neighbor search should be performed.
 *
 * @return A `ClusterSNNGraph_MultiLevelResult` object containing the... multi-level clustering results, obviously.
 */
ClusterSNNGraph_MultiLevelResult cluster_snn_graph(int ndim, int ncells, uintptr_t mat, int k, double resolution, bool approximate) {
    scran::ClusterSNNGraph clust;
    clust.set_neighbors(k).set_approximate(approximate);

    const double* ptr = reinterpret_cast<const double*>(mat);
    auto output = clust.run_multilevel(ndim, ncells, ptr, resolution);
    return ClusterSNNGraph_MultiLevelResult(std::move(output));
}

/**
 * @cond
 */
EMSCRIPTEN_BINDINGS(cluster_snn_graph) {
    emscripten::function("cluster_snn_graph", &cluster_snn_graph);

    emscripten::class_<ClusterSNNGraph_MultiLevelResult>("ClusterSNNGraph_MultiLevelResult")
        .function("number", &ClusterSNNGraph_MultiLevelResult::number)
        .function("best", &ClusterSNNGraph_MultiLevelResult::best)
        .function("modularity", &ClusterSNNGraph_MultiLevelResult::modularity)
        .function("membership", &ClusterSNNGraph_MultiLevelResult::membership);
}
/**
 * @endcond
 */

