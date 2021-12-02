#include <emscripten/bind.h>
#include "NumericMatrix.h"
#include "JSVector.h"

NumericMatrix::NumericMatrix(const tatami::NumericMatrix* p) : ptr(std::shared_ptr<const tatami::NumericMatrix>(p)) {}

NumericMatrix::NumericMatrix(std::shared_ptr<const tatami::NumericMatrix> p) : ptr(std::move(p)) {}

NumericMatrix::NumericMatrix(int nr, int nc, uintptr_t values) {
    JSVector<double> thing(reinterpret_cast<const double*>(values), nr*nc);
    ptr = std::shared_ptr<tatami::NumericMatrix>(new tatami::DenseRowMatrix<double, int, decltype(thing)>(nr, nc, thing));
    return;
}

int NumericMatrix::nrow() const {
    return ptr->nrow();
}

int NumericMatrix::ncol() const {
    return ptr->ncol();
}

void NumericMatrix::row(int r, uintptr_t values) {
    double* buffer = reinterpret_cast<double*>(values);
    auto out = ptr->row(r, buffer);
    if (out != buffer) {
        std::copy(out, out + ptr->ncol(), buffer);
    }
    return;
}

void NumericMatrix::column(int c, uintptr_t values) {
    double* buffer = reinterpret_cast<double*>(values);
    auto out = ptr->column(c, buffer);
    if (out != buffer) {
        std::copy(out, out + ptr->nrow(), buffer);
    }
    return;
}

/**
 * @cond 
 */
EMSCRIPTEN_BINDINGS(my_class_example) {
    emscripten::class_<NumericMatrix>("NumericMatrix")
        .constructor<int, int, uintptr_t>()
        .function("nrow", &NumericMatrix::nrow)
        .function("ncol", &NumericMatrix::ncol)
        .function("row", &NumericMatrix::row)
        .function("column", &NumericMatrix::column)
        ;
}
/**
 * @endcond 
 */

