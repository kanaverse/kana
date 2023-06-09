const pastel_palette = [
    // Blue
    { primary: "#729ECE", min: "#1F77B4", max: "#AEC7E8" },

    // Orange
    { primary: "#FF9E4A", min: "#FF7F0E", max: "#FFBB78" },

    // Green
    { primary: "#67BF5C", min: "#2CA02C", max: "#98DF8A" },

    // Red
    { primary: "#ED665D", min: "#D62728", max: "#FF9896" },

    // Purple
    { primary: "#AD8BC9", min: "#9467BD", max: "#C5B0D5" },

    // Brown
    { primary: "#A8786E", min: "#8C564B", max: "#C49C94" },

    // Pink
    { primary: "#ED97CA", min: "#E377C2", max: "#F7B6D2" },

    // Grey
    { primary: "#A2A2A2", min: "#7F7F7F", max: "#C7C7C7" },

    // Yellow
    { primary: "#CDCC5D", min: "#BCBD22", max: "#DBDB8D" },

    // Aqua
    { primary: "#6DCCDA", min: "#17BECF", max: "#9EDAE5" }
];

// Squaring, as RGB values lie on a square-root scale.
function col2rgb(col) {
    return {
        r: parseInt(col.slice(1,3), 16)**2,
        g: parseInt(col.slice(3,5), 16)**2,
        b: parseInt(col.slice(5,7), 16)**2
    };
}

function split_colors(index, number) {
    let current = pastel_palette[index];
    if (number == 1) {
        return [ current.primary ];
    } else if (number == 2) {
        return [ current.min, current.max ];
    } else {
        let left = col2rgb(current.min);
        let right = col2rgb(current.max);
        let gradients = { ...right };
        const components = [ "r", "g", "b" ];
        for (const k of components) {
            gradients[k] -= left[k];
            gradients[k] /= (number - 1);
        }

        let colors = [];
        for (var i = 0; i < number; ++i) {
            let latest = "#";
            for (const k of components) {
                let val = Math.sqrt(gradients[k] * i + left[k]); // undo the squaring.
                let hex = Math.round(val).toString(16).toUpperCase();
                latest += hex.length == 1 ? ("0" + hex) : hex;
            }
            colors.push(latest);
        }

        return colors;
    }
}

export function generateColors(n) {
    let per_color = Math.floor(n / pastel_palette.length);
    let remainder = n % pastel_palette.length;

    let colors = [];
    for (var i = 0; i < pastel_palette.length && colors.length < n; ++i) {
        let candidates = split_colors(i, per_color + Number(i < remainder));
        for (const c of candidates) {
            colors.push(c);
        }
    }

    return colors;
}
