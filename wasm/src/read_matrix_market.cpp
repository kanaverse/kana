#include <emscripten.h>
#include <emscripten/bind.h>

#include "utils.h"
#include "NumericMatrix.h"

#ifdef PROGRESS_PRINTER
#define TATAMI_PROGRESS_PRINTER(name, state, total, message) PROGRESS_PRINTER(name, state, total, message)
#endif

#include "tatami/ext/MatrixMarket.hpp"
#include <string>

// Stolen from 'inf()' at http://www.zlib.net/zpipe.c,
// with some shuffling of code to make it a bit more C++-like.
struct Unzlibber {
    Unzlibber(unsigned char* buf, size_t n) : buffer(buf), len(n) {}
    unsigned char* buffer;
    size_t len;

    struct ZStream {
        ZStream() {
            /* allocate inflate state */
            strm.zalloc = Z_NULL;
            strm.zfree = Z_NULL;
            strm.opaque = Z_NULL;
            strm.avail_in = 0;
            strm.next_in = Z_NULL;

            // https://stackoverflow.com/questions/1838699/how-can-i-decompress-a-gzip-stream-with-zlib
            int ret = inflateInit2(&strm, 16+MAX_WBITS); 
            if (ret != Z_OK) {
                throw 1;
            }
        }

        ~ZStream() {
            (void)inflateEnd(&strm);
            return;
        }

        // Delete the remaining constructors.
        ZStream(const ZStream&) = delete;
        ZStream(ZStream&&) = delete;
        ZStream& operator=(const ZStream&) = delete;
        ZStream& operator=(ZStream&&) = delete;

        z_stream strm;
    };

    template<class OBJECT>
    void operator()(OBJECT& obj) {
        int bufsize = 262144;
        std::vector<unsigned char> output(bufsize + 1); // enough a safety NULL at EOF, see below.

        ZStream zstr;
        zstr.strm.avail_in = len;
        zstr.strm.next_in = buffer;

        size_t leftovers = 0;
        int ret = 0;

        /* run inflate() on input until output buffer not full */
        do {
            zstr.strm.avail_out = bufsize - leftovers;
            zstr.strm.next_out = output.data() + leftovers;
            ret = inflate(&(zstr.strm), Z_NO_FLUSH);
            assert(ret != Z_STREAM_ERROR);  /* state not clobbered */

            switch (ret) {
            case Z_NEED_DICT:
                ret = Z_DATA_ERROR; /* and fall through */
            case Z_DATA_ERROR:
            case Z_MEM_ERROR:
                throw 1;
            }

            size_t current_stored = bufsize - zstr.strm.avail_out;

            // Making sure we have a terminating newline.
            if (ret == Z_STREAM_END && current_stored && output[current_stored-1]!='\n') {
                output[current_stored] = '\n';
                ++current_stored;
            }

            // Adding whole lines.
            size_t last_processed = 0, total_processed = 0;
            do {
                last_processed = obj.add((char*)output.data() + total_processed, current_stored - total_processed);
                total_processed += last_processed;
            } while (last_processed);

            // Rotating what's left to the front for the next cycle.
            leftovers = current_stored - total_processed;
            for (size_t i = 0; i < leftovers; ++i) {
                output[i] = output[total_processed + i];
            }
        } while (zstr.strm.avail_in);

        /* clean up and return */
        if (ret != Z_STREAM_END) {
            throw 1;
        }
        return;
    }
};

/**
 * Read a (possibly compressed) Matrix Market file into a sparse `NumericMatrix` object.
 * The file should only contain non-negative integer values.
 *
 * @param buffer Offset to a unsigned 8-bit integer array of length `size`,
 * containing the byte contents of the file.
 * @param size Length of the array referenced by `buffer`.
 * @param compressed Whether the file is Gzip-compressed.
 *
 * @return A `NumericMatrix` object containing the file contents.
 */
NumericMatrix read_matrix_market(uintptr_t buffer, int size, bool compressed) {
    auto process = [&](auto& stuff) {
        NumericMatrix output(std::move(stuff.matrix));
        output.permutation = stuff.permutation;
        return output;
    };

#ifdef PROGRESS_PRINTER
    PROGRESS_PRINTER("read_matrix_market", 1, 2, "Loading Matrix Market file")
#endif 

    if (compressed) {
        unsigned char* bufptr = reinterpret_cast<unsigned char*>(buffer);
        Unzlibber unz(bufptr, size);
        auto stuff = tatami::MatrixMarket::load_layered_sparse_matrix_internal(unz);

#ifdef PROGRESS_PRINTER
        PROGRESS_PRINTER("read_matrix_market", 2, 2, "Done")
#endif

        return process(stuff);
    } else {
        const char* bufptr = reinterpret_cast<const char*>(buffer);
        auto reader = [&](auto& obj) -> void {
            size_t counter = 0;
            auto copy = bufptr;
            while (counter < size) {
                auto processed = obj.add(copy, size - counter);
                counter += processed;
                copy += processed;
            }
        };
        auto stuff = tatami::MatrixMarket::load_layered_sparse_matrix_internal(reader);

#ifdef PROGRESS_PRINTER
        PROGRESS_PRINTER("read_matrix_market", 2, 2, "Done")
#endif

        return process(stuff);
    }
}

/**
 * @cond
 */
EMSCRIPTEN_BINDINGS(read_matrix_market) {
    emscripten::function("read_matrix_market", &read_matrix_market);
}
/**
 * @endcond
 */
