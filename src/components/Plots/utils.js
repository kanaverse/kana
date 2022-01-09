const getMinMax = (arr) => {
    var max = -Number.MAX_VALUE,
        min = Number.MAX_VALUE;
    arr.forEach(function (x) {
        if (max < x) {
            max = x;
        }
        if (min > x) {
            min = x;
        }
    });
    return [min, max];
}

// saving svg's from https://observablehq.com/@mbostock/saving-svg
// ource credits : https://www.demo2s.com/javascript/javascript-d3-js-save-svg-to-png-image.html
function serialize(svgNode) {
    svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
    var cssStyleText = getCSSStyles(svgNode);
    appendCSS(cssStyleText, svgNode);
    
    var serializer = new XMLSerializer();
    var svgString = serializer.serializeToString(svgNode);
    svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
    svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix
    return svgString;

    function getCSSStyles(parentElement) {
        var selectorTextArr = [];
        // Add Parent element Id and Classes to the list
        selectorTextArr.push('#' + parentElement.id);
        
        for (let c = 0; c < parentElement.classList.length; c++)
            if (!contains('.' + parentElement.classList[c], selectorTextArr))
                selectorTextArr.push('.' + parentElement.classList[c]);
        // Add Children element Ids and Classes to the list
        
        var nodes = parentElement.getElementsByTagName("*");
        for (let i = 0; i < nodes.length; i++) {
            var id = nodes[i].id;
            if (!contains('#' + id, selectorTextArr))
                selectorTextArr.push('#' + id);
            var classes = nodes[i].classList;
            for (let c = 0; c < classes.length; c++)
                if (!contains('.' + classes[c], selectorTextArr))
                    selectorTextArr.push('.' + classes[c]);
        }
        
        // Extract CSS Rules
        var extractedCSSText = "";
        for (let i = 0; i < document.styleSheets.length; i++) {
            var s = document.styleSheets[i];
            try {
                if (!s.cssRules) continue;
            } catch (e) {
                if (e.name !== 'SecurityError') throw e; // for Firefox
                continue;
            }
            var cssRules = s.cssRules;
            for (let r = 0; r < cssRules.length; r++) {
                if (contains(cssRules[r].selectorText, selectorTextArr))
                    extractedCSSText += cssRules[r].cssText;
            }
        }
        
        return extractedCSSText;
        
        function contains(str, arr) {
            return arr.indexOf(str) === -1 ? false : true;
        }
    }
    
    function appendCSS(cssText, element) {
        var styleElement = document.createElement("style");
        styleElement.setAttribute("type", "text/css");
        styleElement.innerHTML = cssText;
        var refNode = element.hasChildNodes() ? element.children[0] : null;
        element.insertBefore(styleElement, refNode);
    }
}

function saveSVG(svgNode, width, height, filename) {
    let svgString = serialize(svgNode);
    var imgsrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString))); // Convert SVG string to data URL
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    var image = new Image();
    image.onload = () => {
        context.clearRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        let dataBlob = canvas.toDataURL();
        let tmpLink = document.createElement("a");
        tmpLink.href = dataBlob;
        tmpLink.download = filename ? filename : 'plot.png';
        tmpLink.click();
    };
    image.src = imgsrc;
}

export { getMinMax, saveSVG };