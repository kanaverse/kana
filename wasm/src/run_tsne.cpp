#include <emscripten/bind.h>

#include "qdtsne/qdtsne.hpp"
#include "knncolle/knncolle.hpp"

#include <vector>
#include <cmath>
#include <chrono>
#include <random>

/**
 * @file run_tsne.cpp
 *
 * @brief Visualize cells with t-SNE.
 */

/**
 * @brief Status of the t-SNE algorithm.
 *
 * This is a wrapper around the similarly named `Status` object from the [**qdtsne**](https://github.com/LTLA/qdtsne) library.
 * The general idea is to create this object via `initialize_tsne()` before repeatedly calling `run_tsne()` to obtain updates.
 */
struct TsneStatus {
    /**
     * @cond
     */
    TsneStatus(qdtsne::Tsne<>::Status<int> s) : status(std::move(s)) {}

    qdtsne::Tsne<>::Status<int> status;
    /**
     * @endcond
     */

    /**
     * @return Number of iterations run so far.
     */
    int iterations () const {
        return status.iteration();
    }
};

/**
 * Initialize the t-SNE on an input matrix, usually containing principal components for all cells.
 *
 * @param[in] mat An offset to a 2D array with dimensions (e.g., principal components) in rows and cells in columns.
 * @param nr Number of rows in `mat`.
 * @param nc Number of columns in `mat`.
 * @param perplexity t-SNE perplexity, controlling the trade-off between preservation of local and global structure.
 * Larger values focus on global structure more than the local structure.
 * @param approximate Whether to use an approximate neighbor search.
 * @param[out] Y Offset to a 2-by-`nc` array containing the initial coordinates.
 * Each row corresponds to a dimension, each column corresponds to a cell, and the matrix is in column-major format.
 * This is filled with the first two rows of `mat`, i.e., the first and second PCs.
 *
 * @return A `TsneStatus` object that can be passed to `run_tsne()` to create 
 */
TsneStatus initialize_tsne(uintptr_t mat, int nr, int nc, double perplexity, bool approximate, uintptr_t Y) {
    qdtsne::initialize_random(reinterpret_cast<double*>(Y), nc);

    std::unique_ptr<knncolle::Base<> > search;
    const double* ptr = reinterpret_cast<const double*>(mat);
    if (approximate) {
        search.reset(new knncolle::AnnoyEuclidean<>(nr, nc, ptr));
    } else {
        search.reset(new knncolle::VpTreeEuclidean<>(nr, nc, ptr));
    }

    qdtsne::Tsne factory;
    factory.set_perplexity(perplexity).set_max_depth(7).set_interpolation(100);
    return TsneStatus(factory.template initialize<>(search.get()));
}
    
/**
 * Initialize the t-SNE on an input matrix, usually containing principal components for all cells.
 *
 * @param status A `TsneStatus` object created by `initialize_status()`.
 * @param runtime Number of milliseconds to run before returning. 
 * Iterations are performed until the specified `runtime` is exceeded.
 * @param maxiter Maximum number of iterations to perform.
 * The function will return even if `runtime` has not been exceeded.
 * @param[in, out] Y Offset to a two-dimensional array containing the initial coordinates.
 * Each row corresponds to a dimension, each column corresponds to a cell, and the matrix is in column-major format.
 * On output, this will be filled with the updated coordinates.
 *
 * @return `Y` and `TsneStatus` are updated with the latest results.
 */
void run_tsne(TsneStatus& status, int runtime, int maxiter, uintptr_t Y) {
    qdtsne::Tsne factory;
    double* ptr = reinterpret_cast<double*>(Y);
    int iter = status.iterations();

    auto end = std::chrono::steady_clock::now() + std::chrono::milliseconds(runtime);
    do {
        ++iter;
        factory.set_max_iter(iter).run(status.status, ptr);
    } while (iter < maxiter && std::chrono::steady_clock::now() < end);

    return;
}
    
/**
 * @cond
 */
EMSCRIPTEN_BINDINGS(run_tsne) {
    emscripten::function("initialize_tsne", &initialize_tsne);

    emscripten::function("run_tsne", &run_tsne);

    emscripten::class_<TsneStatus>("TsneStatus")
        .function("iterations", &TsneStatus::iterations)
        ;
    
}
/**
 * @endcond
 */

