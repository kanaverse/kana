#ifndef JS_VECTOR_H
#define JS_VECTOR_H

#include <cstddef>

/**
 * @brief Vector-like wrapper around a pre-allocated array.
 *
 * This is intended for WASM buffers allocated on the Javascript side and used in the C++ code.
 * We provide some methods to mimic a std::vector for use within the **tatami** library.
 *
 * @tparam T Array type.
 */
template<typename T>
class JSVector {
public:
    /**
     * @param p Pointer to the start of the array.
     * @param n Number of array elements.
     */
    JSVector(const T* p, size_t n) : ptr(p), num(n) {}

    /**
     * @return Number of array elements.
     */
    size_t size() const { return num; }

    /**
     * @return Pointer to the start of the array.
     */
    const T* data() const { return ptr; }

    /**
     * @return Pointer to the start of the array, for use in templated functions expecting a `std::vector`.
     */
    const T* begin() const { return ptr; }

    /**
     * @return Pointer to the end of the array, for use in templated functions expecting a `std::vector`.
     */
    const T* end() const { return ptr + num; }
private:
    const T* ptr;
    size_t num;
};

#endif
