import {
    Button, Classes, Text, FileInput, NumericInput,
    Label, H5, Tag, HTMLSelect, Switch, Callout, Tabs, Tab,
    RadioGroup, Radio, Icon, Position,
    InputGroup, FormGroup, Checkbox,
    Drawer
} from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import React, { useContext, useState, useCallback, useEffect } from "react";

import { AppContext } from "../../context/AppContext";
import "./Analysis.css";

const AnalysisDialog = ({
    buttonText,
    includeFooter,
    ...props
}) => {

    const { inputFiles, setInputFiles,
        params, setParams,
        tabSelected, setTabSelected,
        loadParams,
        setLoadParamsFor, loadParamsFor, setDatasetName,
        setPreInputFiles, preInputFilesStatus } = useContext(AppContext);

    const [inputText, setInputText] = useState([{
        mtx: "Choose Matrix Market file",
        gene: "Choose feature/gene annotation",
        barcode: "Choose barcode annotation",
    }]);

    let [tmpInputValid, setTmpInputValid] = useState(true);

    const [newImportFormat, setNewImportFormat] = useState("mtx");
    const [loadImportFormat, setLoadImportFormat] = useState("kana");
    // const [hdfFormat, sethdfFormat] = useState("tenx");

    let [tmpInputParams, setTmpInputParams] = useState(tabSelected === "new" ? params : loadParams);

    // assuming new is the default tab
    let [tmpInputFiles, setTmpInputFiles] = useState([{
        "name": "file-1",
        "format": tabSelected === "new" ? newImportFormat : loadImportFormat
    }]);

    const [isOpen, setIsOpen] = useState(false);
    const [showStepHelper, setShowStepHelper] = useState(1);
    const handleButtonClick = useCallback(() => {
        // setTmpInputParams(tabSelected === "new" ? params : loadParams);
        setIsOpen(!isOpen);
    }, [isOpen]);

    const handleClose = useCallback(() => setIsOpen(false), []);

    function handleImport() {
        // convert numeric inputs to number (especially with decimals)
        tmpInputParams["cluster"]["clus-res"] = Number(tmpInputParams["cluster"]["clus-res"]);
        tmpInputParams["fSelection"]["fsel-span"] = Number(tmpInputParams["fSelection"]["fsel-span"]);
        tmpInputParams["umap"]["umap-min_dist"] = Number(tmpInputParams["umap"]["umap-min_dist"]);

        tmpInputParams["cluster"]["kmeans-k"] = Number(tmpInputParams["cluster"]["kmeans-k"]);
        tmpInputParams["cluster"]["clus-k"] = Number(tmpInputParams["cluster"]["clus-k"]);
        tmpInputParams["cluster"]["clus-res"] = Number(tmpInputParams["cluster"]["clus-res"]);

        setParams(tmpInputParams);

        if (tabSelected === "load") {
            if (loadImportFormat === "kanadb") {
                setDatasetName(props?.kanaIDBRecs[parseInt(tmpInputFiles?.[0]?.file)]?.title);
            } else {
                setDatasetName(tmpInputFiles?.[0]?.file?.[0]?.name.split(".")[0]);
            }
        }

        let mapFiles = {};
        for (const f of tmpInputFiles) {
            mapFiles[f.name] = f
        }

        setInputFiles({
            "files": mapFiles,
            "reset": tabSelected === "new" ? false : tmpInputFiles?.file !== inputFiles?.files?.file
        });

        setLoadParamsFor(tabSelected === "new" ?
            newImportFormat : loadImportFormat);

        handleClose();
    }

    function handleTabInput(currTab, prevTab) {
        if (currTab === "new") {
            handleNewImportTab(newImportFormat);
        } else if (currTab === "load") {
            handleLoadImportTab(loadImportFormat);
            let tmp = [...tmpInputFiles];
            tmp[0]["format"] = loadImportFormat;
            setTmpInputFiles(tmp);
        }
        setTabSelected(currTab);
        setShowStepHelper(0);
    }

    function handleNewImportTab(currTab, prevTab) {

        setTmpInputParams(params);
        setNewImportFormat(currTab);
    }

    function handleLoadImportTab(currTab, prevTab) {
        if (loadParams && loadParamsFor === currTab) {
            setTmpInputParams(loadParams);
        }

        setLoadImportFormat(currTab);
    }

    useEffect(() => {
        props?.openInput && setIsOpen(true);
    }, [props?.openInput]);

    useEffect(() => {
        if (loadParams && tabSelected === "load") {
            setTmpInputParams(loadParams);
        }
    }, [loadParams]);

    useEffect(() => {
        if (tabSelected === "load" && loadImportFormat === "kanadb"
            && tmpInputFiles?.file === null && props?.kanaIDBRecs.length > 0) {
            setTmpInputFiles({
                file: props?.kanaIDBRecs[0].id
            });
        }
    }, [props?.kanaIDBRecs, loadImportFormat]);

    useEffect(() => {
        if (tmpInputFiles) {
            if (tabSelected === "new") {
                let all_valid = true;
                // tmpInputFiles.forEach((x, ix) =>
                for (let ix = 0; ix < tmpInputFiles.length; ix++) {
                    let x = tmpInputFiles[ix];
                    if (
                        (x?.mtx && !(inputText[ix]?.mtx.toLowerCase().endsWith("mtx") ||
                            inputText[ix]?.mtx.toLowerCase().endsWith("mtx.gz")
                        )) ||
                        (x?.gene && !(inputText[ix]?.gene.toLowerCase().endsWith("tsv") ||
                            inputText[ix]?.gene.toLowerCase().endsWith("tsv.gz")
                        )) ||
                        (x?.barcode && !(inputText[ix]?.barcode.toLowerCase().endsWith("tsv") ||
                            inputText[ix]?.barcode.toLowerCase().endsWith("tsv.gz")
                        ))
                    ) {
                        all_valid = false;
                    }

                    if (
                        x?.file && !(
                            inputText[ix]?.file.toLowerCase().endsWith("hdf5") ||
                            inputText[ix]?.file.toLowerCase().endsWith("h5") ||
                            inputText[ix]?.file.toLowerCase().endsWith("h5ad")
                        )
                    ) {
                        all_valid = false;
                    }
                };

                let tnames = tmpInputFiles.map(x => x.name);
                if ([...new Set(tnames)].length != tmpInputFiles.length) {
                    all_valid = false;
                }

                setTmpInputValid(all_valid);

                if (all_valid) {
                    let mapFiles = {};
                    for (const f of tmpInputFiles) {
                        mapFiles[f.name] = f
                    }

                    setPreInputFiles({
                        "files": mapFiles,
                        "reset": tabSelected === "new" ? false : tmpInputFiles?.file !== inputFiles?.files?.file
                    });
                }

            } else if (tabSelected === "load" && inputText?.file) {
                if (loadImportFormat === "kana" &&
                    tmpInputFiles?.file != null && !(tmpInputFiles[0]?.file.toLowerCase().endsWith("kana")
                    )
                ) {
                    setTmpInputValid(false);
                } else {
                    setTmpInputValid(true);
                }
            }
        }
    }, [tmpInputFiles]);

    function parseKanaDate(x) {
        let d = new Date(x);
        return d.toDateString() + ", " + d.toLocaleTimeString();
    }

    function handleCheckbox(e, species, key) {
        let tkey = `annotateCells-${species}_references`;
        let tmpAnnoCells = [...tmpInputParams["annotateCells"][tkey]];
        if (e.target.checked) {
            if (!tmpAnnoCells.includes(key)) {
                tmpAnnoCells.push(key);
            }
        } else {
            tmpAnnoCells = tmpAnnoCells.filter((y) => {
                return y !== key;
            });
        }

        let tmpAnno = {
            ...tmpInputParams["annotateCells"]
        }

        tmpAnno[tkey] = tmpAnnoCells;

        setTmpInputParams({
            ...tmpInputParams,
            "annotateCells": tmpAnno
        })
    }

    function isCheckIncluded(species, key) {
        let tkey = `annotateCells-${species}_references`;
        return tmpInputParams["annotateCells"][tkey].includes(key);
    }

    const get_common_tooltips = () => {
        return (
            <>
                {showStepHelper === 2 &&
                    <Callout intent="primary">
                        <p>
                            Remove low-quality cells to ensure that they do not interfere with downstream steps.
                            This is achieved by computing per-cell quality control (QC) metrics such as the total count per cell,
                            the total number of detected features and (if the feature annotation is supplied) the mitochondrial proportion in each cell.
                            Cells with low total counts/number of detected features or high mitochondrial proportions are filtered out.
                            We use an outlier-based approach to define the filter threshold for each metric,
                            under the assumption that most cells in the dataset are of acceptable quality.
                        </p>
                        <p>
                            <strong>Number of MADs</strong>:
                            Number of median absolute deviations (MADs) from the median,
                            used to define a filter threshold in the appropriate direction for each QC metric.
                            Increasing this value will reduce the stringency of the filtering.
                        </p>
                        <p>
                            <strong>Use default mitochondrial list</strong>:
                            Should we identify mitochondrial genes in the dataset based on the <a target="_blank" href="https://github.com/jkanche/kana/blob/master/public/scran/mito.js"><strong>in-built list of Ensembl identifiers and gene symbols for mitochondrial genes in human and mouse genomes?</strong></a>
                            This assumes that the dataset contains feature annotation with Ensembl identifiers or gene symbols.
                        </p>
                        <p>
                            <strong>Mitochondrial gene prefix</strong>:
                            Prefix to use to identify the mitochondrial genes from the feature annotation.
                            Only used if we choose to not use the default mitochondrial list.
                        </p>
                    </Callout>
                }
                {showStepHelper === 3 &&
                    <Callout intent="primary">
                        <p>
                            Identify highly variable genes (HVGs) while accounting for the mean-variance relationship.
                            We do so by fitting a mean-dependent trend to the variances computed from the log-transformed normalized expression values.
                            HVGs are defined as those genes with the largest positive residuals from the trend, as these are more variable than expected from the trend.
                            The aim is to only use the HVGs in some downstream steps like the principal components analysis,
                            thereby improving computational efficiency and reducing uninteresting technical noise.
                        </p>
                        <p>
                            <strong>Lowess span</strong>:
                            The span of the LOWESS smoother for fitting the mean-variance trend.
                            Larger values increase the smoothness of the global trend at the
                            cost of decreasing sensitivity to local variations.
                        </p>
                    </Callout>
                }
                {showStepHelper === 4 &&
                    <Callout intent="primary">
                        <p>
                            Perform a principal components analysis (PCA) to obtain per-cell coordinates in a low-dimensional space.
                            Specifically, we obtain a compact representation of the dataset by only taking the top principal components (PCs) that explain the largest variance.
                            This improves the efficiency of downstream steps as we only have to perform calculations on a few (usually 10-50) PCs rather than the thousands of gene expression profiles.
                            It also has the advantage of removing uninteresting high-dimensional noise by discarding the later PCs.
                            This ensures that downstream steps focus on the largest factors of variation that - hopefully - correspond to biologically interesting heterogeneity.
                        </p>
                        <p>
                            <strong>Number of HVGs</strong>:
                            Number of highly variable genes to use to perform the PCA. Larger values
                            will capture more biological signal at the cost of increasing
                            noise and computational work.
                        </p>
                        <p>
                            <strong>Number of PCs</strong>:
                            Number of principal components with the highest variance
                            to retain in downstream analyses. Larger values will capture
                            more biological signal at the cost of increasing noise and
                            computational work.
                        </p>
                    </Callout>
                }
                {showStepHelper === 5 &&
                    <Callout intent="primary">
                        <p>
                            Cluster cells into discrete groupings based on their relative similarity in the low-dimensional PC space.
                            The set of clusters should be treated as a summary of the cellular heterogeneity in the population,
                            allowing us to easily perform further characterization on subpopulations of interest, e.g., with marker detection.
                            Different clustering methods or parameters may provide different perspectives on the population structure in the dataset.
                        </p>
                        <p>
                            <strong>Method</strong>:
                            Clustering algorithm to use.
                            Currently, we support k-means clustering with kmeans++ initialization and Hartigon-Wong refinement;
                            or multi-level community detection on an shared nearest neighbor (SNN) graph,
                            where the cells are the nodes and edges are created between neighboring cells.
                        </p>
                        <p>
                            <strong>Number of clusters (k-means)</strong>:
                            Number of clusters to create in k-means clustering.
                            This is capped at 40 for performance purposes.
                        </p>
                        <p>
                            <strong>Number of neighbors (SNN)</strong>:
                            Number of neighbors to use to construct the SNN graph.
                            Larger values result in broader clusters.
                        </p>
                        <p>
                            <strong>Use ANN (SNN)</strong>:
                            Use an approximate method to speed up the nearest neighbor search.
                            This sacrifices some accuracy for speed in larger datasets.
                        </p>
                        <p>
                            <strong>Weighting scheme (SNN)</strong>:
                            Weighting scheme to use for the edges of the SNN graph.
                            The <em>Rank</em> approach derives a weight from the rank of the closest shared neighbor;
                            the <em>Number</em> approach uses the number of shared neighbors;
                            and the Jaccard approach uses the <em>Jaccard</em> index of the neighbor sets.
                        </p>
                        <p>
                            <strong>Resolution (SNN)</strong>:
                            Resolution parameter for the multi-level clustering, used to adjust the modularity calculation during community optimization.
                            Larger values yield more fine-grained clusters.
                        </p>
                    </Callout>
                }
                {showStepHelper === 6 &&
                    <Callout intent="primary">
                        <p>
                            Compute a t-SNE to visualize cells in two dimensions,
                            because our feeble human minds cannot interpret high-dimensional spaces.
                            Neighboring cells in the PC space are kept adjacent in the 2D embedding,
                            while dissimilar cells are placed (arbitrarily) far away.
                        </p>
                        <p>
                            <strong>Perplexity</strong>:
                            Perplexity parameter, which determines the size of the neighborhood of each cell.
                            Larger values will favor preservation of global structure in the 2D embedding.
                        </p>
                        <p>
                            <strong>Iterations</strong>:
                            Number of t-SNE iterations.
                            Doesn't usually have much of an effect if you leave it as it is.
                        </p>
                    </Callout>
                }
                {showStepHelper === 7 &&
                    <Callout intent="primary">
                        <p>
                            Create a UMAP plot to visualize cells in two dimensions.
                            Like the t-SNE, this aims to map cells from a high-dimensional space into a 2D embedding,
                            where neighboring cells are kept close together and dissimilar cells are placed far apart.
                        </p>
                        <p>
                            <strong>Number of neighbors</strong>:
                            Number of neighbors to use when defining the size of the local neighborhood.
                            Larger values will favor preservation of global structure.
                        </p>
                        <p>
                            <strong>Minimum distance</strong>:
                            Minimum distance between points.
                            Smaller values result in a more tightly packed embedding and favor local structure.
                        </p>
                        <p>
                            <strong>Epochs</strong>:
                            Number of epochs to use for convergence.
                            This doesn't really change all too much in the results.
                        </p>
                    </Callout>
                }
                {showStepHelper === 8 &&
                    <Callout intent="primary">
                        <p>
                            Perform cell type annotation for human and mouse datasets.
                            This uses the <a target="_blank" href="https://bioconductor.org/packages/release/bioc/html/SingleR.html">SingleR</a> algorithm
                            to label clusters based on their similarity to reference expression profiles of curated cell types.
                            Similarity is quantified using Spearman correlations on the top marker genes for each reference type,
                            with additional fine-tuning iterations to improve resolution between closely related labels.
                        </p>
                        <p>
                            <strong>Reference Datasets</strong>:
                            A selection of references are available from the <a target="_blank" href="https://bioconductor.org/packages/release/data/experiment/html/celldex.html">celldex</a> package.
                            Classification of the clusters is performed separately for each reference.
                            If multiple references are selected, an additional round of scoring is performed to determine which reference has the best label for each cluster.
                        </p>
                    </Callout>
                }
            </>
        )
    }

    const get_input_qc = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>2</Tag>
                        <span className={showStepHelper == 2 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(2)}>
                            Quality control
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 2 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(2)}>
                                    Number of MADs
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="3" value={tmpInputParams["qc"]["qc-nmads"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "qc": { ...tmpInputParams["qc"], "qc-nmads": nval } }) }} />
                        </Label>
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 2 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(2)}>
                                    Use default mitochondrial list ?
                                </span>
                            </Text>
                            <Switch style={{ marginTop: '10px' }} large={true} checked={tmpInputParams["qc"]["qc-usemitodefault"]}
                                innerLabelChecked="yes" innerLabel="no"
                                onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "qc": { ...tmpInputParams["qc"], "qc-usemitodefault": e.target.checked } }) }} />
                        </Label>
                        {!tmpInputParams["qc"]["qc-usemitodefault"] && <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 2 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(2)}>
                                    Mitochondrial gene prefix
                                </span>
                            </Text>
                            <InputGroup
                                leftIcon="filter"
                                onChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "qc": { ...tmpInputParams["qc"], "qc-mito": nval?.target?.value } }) }}
                                placeholder="mt-"
                                value={tmpInputParams["qc"]["qc-mito"]}
                            />
                        </Label>}
                    </div>
                </div>
            </div>
        )
    }

    const get_input_fsel = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>3</Tag>
                        <span className={showStepHelper == 3 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(3)}>
                            Feature Selection
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 3 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(3)}>
                                    Lowess span
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="0.3"
                                stepSize={0.1}
                                minorStepSize={0.1}
                                value={tmpInputParams["fSelection"]["fsel-span"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "fSelection": { ...tmpInputParams["fSelection"], "fsel-span": val } }) }} />
                        </Label>
                    </div>
                </div>
            </div>
        )
    }

    const get_input_pca = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>4</Tag>
                        <span className={showStepHelper == 4 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(4)}>
                            Principal components analysis
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 4 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(4)}>
                                    Number of HVGs
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="2500" value={tmpInputParams["pca"]["pca-hvg"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "pca": { ...tmpInputParams["pca"], "pca-hvg": nval } }) }} />
                        </Label>
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 4 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(4)}>
                                    Number of PCs
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="25" value={tmpInputParams["pca"]["pca-npc"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "pca": { ...tmpInputParams["pca"], "pca-npc": nval } }) }} />
                        </Label>
                        {
                            (tmpInputFiles.length > 1 || (tmpInputFiles.length == 1 && tmpInputFiles[0]?.batch && tmpInputFiles[0]?.batch.toLowerCase() != "none")) && <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 4 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(4)}>
                                        Method
                                    </span>
                                </Text>
                                <HTMLSelect
                                    onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "pca": { ...tmpInputParams["pca"], "pca-correction": e.target.value } }) }}
                                    defaultValue={tmpInputParams["pca"]["pca-correction"]}
                                >
                                    <option value="none">No Correction</option>
                                    <option value="regress">Linear Regression</option>
                                    <option value="mnn">MNN correction</option>
                                </HTMLSelect>
                            </Label>
                        }
                    </div>
                </div>
            </div>
        )
    }

    const get_input_clus = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>5</Tag>
                        <span className={showStepHelper == 5 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(5)}>
                            Clustering
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 5 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(5)}>
                                    Method
                                </span>
                            </Text>
                            <HTMLSelect
                                onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-method": e.target.value } }) }}
                                defaultValue={tmpInputParams["cluster"]["clus-method"]}
                            >
                                <option value="kmeans">K-means</option>
                                <option value="snn_graph">SNN graph</option>
                            </HTMLSelect>
                        </Label>
                        {tmpInputParams["cluster"]["clus-method"] == "kmeans" && <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 5 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(5)}>
                                    Number of clusters
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="10" max="40"
                                value={tmpInputParams["cluster"]["kmeans-k"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "kmeans-k": nval } }) }} />
                        </Label>
                        }
                        {tmpInputParams["cluster"]["clus-method"] == "snn_graph" && <>
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 5 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(5)}>
                                        Number of neighbors
                                    </span>
                                </Text>
                                <NumericInput
                                    placeholder="10" value={tmpInputParams["cluster"]["clus-k"]}
                                    onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-k": nval } }) }} />
                            </Label>
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 5 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(5)}>
                                        Use ANN
                                    </span>
                                </Text>
                                <Switch style={{ marginTop: '10px' }} large={true} checked={tmpInputParams["cluster"]["clus-approx"]}
                                    innerLabelChecked="yes" innerLabel="no"
                                    onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-approx": e.target.checked } }) }} />
                            </Label>
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 5 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(5)}>
                                        Weighting scheme
                                    </span>
                                </Text>
                                <HTMLSelect
                                    onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-scheme": parseInt(e.target.value) } }) }}
                                    defaultValue={tmpInputParams["cluster"]["clus-scheme"]}
                                >
                                    <option value="0">Rank</option>
                                    <option value="1">Number</option>
                                    <option value="2">Jaccard</option>
                                </HTMLSelect>
                            </Label>
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 5 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(5)}>
                                        Resolution
                                    </span>
                                </Text>
                                <NumericInput
                                    placeholder="0.5" value={tmpInputParams["cluster"]["clus-res"]}
                                    stepSize={0.1}
                                    minorStepSize={0.1}
                                    onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-res": val } }) }} />
                            </Label>
                        </>}
                    </div>
                </div>
            </div>
        )
    }

    const get_input_tsne = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>6</Tag>
                        <span className={showStepHelper == 6 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(6)}>
                            t-SNE
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 6 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(6)}>
                                    Perplexity
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="30" value={tmpInputParams["tsne"]["tsne-perp"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "tsne": { ...tmpInputParams["tsne"], "tsne-perp": nval } }) }} />
                        </Label>
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 6 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(6)}>
                                    Iterations
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="500" value={tmpInputParams["tsne"]["tsne-iter"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "tsne": { ...tmpInputParams["tsne"], "tsne-iter": nval } }) }} />
                        </Label>
                    </div>
                </div>
            </div>
        )
    }

    const get_input_umap = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>7</Tag>
                        <span className={showStepHelper == 7 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(7)}>
                            UMAP
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 7 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(7)}>
                                    Number of neighbors
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="15" value={tmpInputParams["umap"]["umap-nn"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-nn": nval } }) }} />
                        </Label>
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 7 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(7)}>
                                    Minimum distance
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="0.01"
                                stepSize={0.01}
                                minorStepSize={0.01}
                                value={tmpInputParams["umap"]["umap-min_dist"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-min_dist": val } }) }} />
                        </Label>
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 7 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(7)}>
                                    Epochs
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="500" value={tmpInputParams["umap"]["umap-epochs"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-epochs": nval } }) }} />
                        </Label>
                    </div>
                </div>
            </div>
        )
    }

    const get_input_label_cells = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>8</Tag>
                        <span className={showStepHelper == 8 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(8)}>
                            Annotate cells
                        </span>
                    </H5>
                    <div className="row">
                        {/* <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 8 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(8)}>
                                    Annotate cell types ?
                                </span>
                            </Text>
                            <Switch style={{ marginTop: '10px' }} large={true} checked={tmpInputParams["annotateCells"]["annotateCells"]}
                                innerLabelChecked="yes" innerLabel="no"
                                onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "annotateCells": { ...tmpInputParams["annotateCells"], "annotateCells": e.target.checked } }) }} />
                        </Label> */}
                        {/* {tmpInputParams["annotateCells"]["annotateCells"] && <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 8 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(8)}>
                                    Species
                                </span>
                            </Text>
                            <HTMLSelect
                                onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "annotateCells": { ...tmpInputParams["annotateCells"], "annotateCells-species": e.target.value } }) }}
                                defaultValue={tmpInputParams["annotateCells"]["annotateCells-species"]}
                            >
                                <option value="human">Human</option>
                                <option value="mouse">Mouse</option>
                            </HTMLSelect>
                        </Label>
                        } */}

                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 8 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(8)}>
                                    Choose reference datasets
                                </span>
                            </Text>
                            <div style={{
                                marginTop: "10px"
                            }}>
                                <span style={{
                                    marginRight: "10px",
                                    textTransform: "capitalize",
                                    fontWeight: "bold"
                                }}>Human: </span>
                                <Checkbox defaultChecked={isCheckIncluded("human", "BlueprintEncode")} inline={true} label="Blueprint Encode"
                                    onChange={(e) => { handleCheckbox(e, "human", "BlueprintEncode") }} />
                                <Checkbox defaultChecked={isCheckIncluded("human", "DatabaseImmuneCellExpression")} inline={true} label="Database ImmuneCell Expression"
                                    onChange={(e) => { handleCheckbox(e, "human", "DatabaseImmuneCellExpression") }} />
                                <Checkbox defaultChecked={isCheckIncluded("human", "HumanPrimaryCellAtlas")} inline={true} label="Human Primary Cell Atlas"
                                    onChange={(e) => { handleCheckbox(e, "human", "HumanPrimaryCellAtlas") }} />
                                <Checkbox defaultChecked={isCheckIncluded("human", "MonacoImmune")} inline={true} label="Monaco Immune"
                                    onChange={(e) => { handleCheckbox(e, "human", "MonacoImmune") }} />
                                <Checkbox defaultChecked={isCheckIncluded("human", "NovershternHematopoietic")} inline={true} label="Novershtern Hematopoietic"
                                    onChange={(e) => { handleCheckbox(e, "human", "NovershternHematopoietic") }} />
                            </div>
                            <div>
                                <span style={{
                                    marginRight: "10px",
                                    textTransform: "capitalize",
                                    fontWeight: "bold"
                                }}>Mouse: </span>
                                <Checkbox defaultChecked={isCheckIncluded("mouse", "ImmGen")} inline={true} label="ImmGen"
                                    onChange={(e) => { handleCheckbox(e, "mouse", "ImmGen") }} />
                                <Checkbox defaultChecked={isCheckIncluded("mouse", "MouseRNAseq")} inline={true} label="Mouse RNA-seq"
                                    onChange={(e) => { handleCheckbox(e, "mouse", "MouseRNAseq") }} />
                            </div>
                            {/* <select
                                multiple={true}
                                onChange={(e) => {
                                    setTmpInputParams({
                                        ...tmpInputParams,
                                        "annotateCells": {
                                            ...tmpInputParams["annotateCells"],
                                            "annotateCells-human_references": [...e.target.options].filter(option => option.selected && option.value.startsWith("human_")).map(option => option.value.replace("human_", "")),
                                            "annotateCells-mouse_references": [...e.target.options].filter(option => option.selected && option.value.startsWith("mouse_")).map(option => option.value.replace("mouse_", ""))
                                        }
                                    })
                                }}
                            // defaultValue={tmpInputParams["annotateCells"]["annotateCells-reference"]}
                            >
                                <option value="human_BlueprintEncode">Blueprint Encode (human)</option>
                                <option value="human_DatabaseImmuneCellExpression">Database Immune Cell Expression (human)</option>
                                <option value="human_HumanPrimaryCellAtlas">Human Primary Cell Atlas (human)</option>
                                <option value="human_MonacoImmune">Monaco Immune (human)</option>
                                <option value="human_NovershternHematopoietic">Novershtern Hematopoietic (human)</option>
                                <option value="mouse_ImmGen">Imm Gen (mouse)</option>
                                <option value="mouse_MouseRNAseq">Mouse RNA-seq (mouse)</option>
                            </select> */}
                        </Label>

                        {/* {tmpInputParams["annotateCells"]["annotateCells"] && tmpInputParams["annotateCells"]["annotateCells-species"] == "human" && <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 8 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(8)}>
                                    Reference Dataset
                                </span>
                            </Text>
                            <select
                                multiple={true}
                                onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "annotateCells": { ...tmpInputParams["annotateCells"], "annotateCells-references": [...e.target.options].filter(option => option.selected).map(option => option.value) } }) }}
                                // defaultValue={tmpInputParams["annotateCells"]["annotateCells-reference"]}
                            >
                                <option value="BlueprintEncode">Blueprint Encode</option>
                                <option value="DatabaseImmuneCellExpression">Database Immune Cell Expression</option>
                                <option value="HumanPrimaryCellAtlas">Human Primary Cell Atlas</option>
                                <option value="MonacoImmune">Monaco Immune</option>
                                <option value="NovershternHematopoietic">Novershtern Hematopoietic</option>
                            </select>
                        </Label>
                        }
                        {tmpInputParams["annotateCells"]["annotateCells"] && tmpInputParams["annotateCells"]["annotateCells-species"] == "mouse" &&
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 8 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(8)}>
                                        Reference Dataset
                                    </span>
                                </Text>
                                <select
                                    multiple={true}
                                    onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "annotateCells": { ...tmpInputParams["annotateCells"], "annotateCells-references": [...e.target.options].filter(option => option.selected).map(option => option.value) } }) }}
                                    // defaultValue={tmpInputParams["annotateCells"]["annotateCells-reference"]}
                                >
                                    <option value="ImmGen">Imm Gen</option>
                                    <option value="MouseRNAseq">Mouse RNA-seq</option>
                                </select>
                            </Label>
                        } */}
                    </div>
                </div>
            </div>
        )
    }

    const [showSection, setShowSection] = useState("input");

    const [fileCount, setFileCount] = useState([0]);

    function get_new_input_files(idx, input) {
        return (
            <div className="col"
                key={idx}
                style={{
                    // paddingTop: '10px',
                    paddingBottom: '15px'
                }}>
                <div>
                    <H5><Tag round={true}>1</Tag>
                        <span className={showStepHelper == 1 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(1)}>
                            Load input files
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 1 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(1)}>
                                    Name this dataset
                                </span>
                            </Text>
                            <InputGroup
                                placeholder="name this dataset"
                                fill={false}
                                onChange={(nval, val) => {
                                    let tmp = [...tmpInputFiles];
                                    tmp[idx]["name"] = nval?.target?.value;
                                    setTmpInputFiles(tmp);
                                }}
                                value={tmpInputFiles[idx]["name"]}
                            />
                        </Label>
                    </div>
                    <Tabs
                        animate={true}
                        renderActiveTabPanelOnly={true}
                        vertical={true}
                        onChange={(ntab, otab) => {
                            let tmp = [...tmpInputFiles];
                            tmp[idx]["format"] = ntab;
                            setTmpInputFiles(tmp);

                            handleNewImportTab(ntab, otab);
                        }}
                        defaultSelectedTabId={newImportFormat}
                    >
                        <Tab id="mtx" title="Matrix Market file" panel={
                            <div className="row"
                            >
                                <Label className="row-input">
                                    <FileInput text={inputText[idx].mtx} onInputChange={(msg) => {
                                        let tmp = [...tmpInputFiles];
                                        tmp[idx]["mtx"] = msg.target.files;
                                        setTmpInputFiles(tmp);

                                        let tmpitext = [...inputText];
                                        tmpitext[idx]["mtx"] = msg.target.files[0].name;
                                        setInputText(tmpitext);
                                        // setInputText({ ...inputText, "mtx": msg.target.files[0].name }); 
                                        // setTmpInputFiles({ ...tmpInputFiles, "mtx": msg.target.files }) 
                                    }} />
                                </Label>
                                <Label className="row-input">
                                    <FileInput text={inputText[idx].gene} onInputChange={(msg) => {
                                        let tmp = [...tmpInputFiles];
                                        tmp[idx]["gene"] = msg.target.files;
                                        setTmpInputFiles(tmp);

                                        let tmpitext = [...inputText];
                                        tmpitext[idx]["gene"] = msg.target.files[0].name;
                                        setInputText(tmpitext);
                                        // setInputText({ ...inputText, "gene": msg.target.files[0].name }); 
                                        // setTmpInputFiles({ ...tmpInputFiles, "gene": msg.target.files }) 
                                    }} />
                                </Label>
                                <Label className="row-input">
                                    <FileInput text={inputText[idx].barcode} onInputChange={(msg) => {
                                        let tmp = [...tmpInputFiles];
                                        tmp[idx]["barcode"] = msg.target.files;
                                        setTmpInputFiles(tmp);

                                        let tmpitext = [...inputText];
                                        tmpitext[idx]["barcode"] = msg.target.files[0].name;
                                        setInputText(tmpitext);
                                        // setInputText({ ...inputText, "barcode": msg.target.files[0].name }); 
                                        // setTmpInputFiles({ ...tmpInputFiles, "barcode": msg.target.files }) 
                                    }} />
                                </Label>
                            </div>
                        } />
                        <Tab id="tenx" title="10x HDF5 matrix" panel={
                            <div className="row"
                            >
                                <Label className="row-input">
                                    <FileInput style={{
                                        marginTop: '5px'
                                    }}
                                        text={inputText[idx].file}
                                        onInputChange={(msg) => {
                                            let tmp = [...tmpInputFiles];
                                            tmp[idx]["file"] = msg.target.files;
                                            setTmpInputFiles(tmp);

                                            let tmpitext = [...inputText];
                                            tmpitext[idx]["file"] = msg.target.files[0].name;
                                            setInputText(tmpitext);
                                            // setInputText({ ...inputText, "file": msg.target.files[0].name });
                                            // setTmpInputFiles({ ...tmpInputFiles, "file": msg.target.files })
                                        }} />
                                </Label>
                            </div>
                        } />
                        <Tab id="h5ad" title="H5AD" panel={
                            <div className="row"
                            >
                                <Label className="row-input">
                                    <FileInput style={{
                                        marginTop: '5px'
                                    }}
                                        text={inputText[idx].file}
                                        onInputChange={(msg) => {
                                            let tmp = [...tmpInputFiles];
                                            tmp[idx]["file"] = msg.target.files;
                                            setTmpInputFiles(tmp);

                                            let tmpitext = [...inputText];
                                            tmpitext[idx]["file"] = msg.target.files[0].name;
                                            setInputText(tmpitext);
                                            // setInputText({ ...inputText, "file": msg.target.files[0].name });
                                            // setTmpInputFiles({ ...tmpInputFiles, "file": msg.target.files })
                                        }} />
                                </Label>
                            </div>
                        } />
                    </Tabs>
                </div>
            </div>
        )
    }

    return (
        <>
            <Tooltip2 content="Start new analysis or modify parameters" position={Position.BOTTOM}>
                <Button onClick={handleButtonClick} icon="social-media" intent="primary" text={buttonText} />
            </Tooltip2>
            <Drawer className="analysis-dialog" {...props} isOpen={isOpen} onClose={handleClose}>

                <div style={{ overflow: "scroll" }} className={Classes.DIALOG_BODY}>
                    <Tabs
                        animate={true}
                        renderActiveTabPanelOnly={true}
                        vertical={false}
                        onChange={handleTabInput}
                        defaultSelectedTabId={tabSelected}
                    >
                        <Tab id="new" title="Import new dataset" panel={
                            <>
                                <div className="stepper-container">
                                    <Button intent="warning"
                                        icon="bring-data"
                                        onClick={(() => setShowSection("input"))}
                                        disabled={showSection === "input"}>Show Input</Button>
                                    <Icon icon="drag-handle-horizontal" />
                                    <Button intent="warning"
                                        icon="merge-links"
                                        onClick={(() => setShowSection("params"))}
                                        disabled={showSection === "params"}>Show Parameters</Button>
                                </div>
                                <div className="inputs-container">
                                    <div className='row-input'>
                                        {showSection == "input" ?
                                            tmpInputFiles.map((x, ix) => get_new_input_files(ix, x))
                                            : ""}

                                        {
                                            showSection == "input" &&
                                            <div style={{
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center"
                                            }}>
                                                <Button intent="warning"
                                                    icon="add"
                                                    style={{
                                                        margin: "3px"
                                                    }}
                                                    onClick={((x) => {
                                                        // setFileCount([...fileCount, fileCount.length])
                                                        setTmpInputFiles([...tmpInputFiles, {
                                                            "name": `file-${tmpInputFiles.length + 1}`,
                                                            "format": newImportFormat
                                                        }]);
                                                        setInputText([...inputText, {
                                                            mtx: "Choose Matrix Market file",
                                                            gene: "Choose feature/gene annotation",
                                                            barcode: "Choose barcode annotation",
                                                        }])
                                                    })}
                                                >Import another file</Button>
                                                <Button intent="warning"
                                                    icon="delete"
                                                    disabled={tmpInputFiles.length == 1}
                                                    onClick={(() => {
                                                        setTmpInputFiles([...tmpInputFiles].slice(-1));
                                                        setInputText([...inputText].slice(-1));
                                                        // setFileCount([...fileCount].slice(-1))
                                                    })}
                                                >Delete last import</Button>
                                            </div>
                                        }

                                        {
                                            preInputFilesStatus && tmpInputFiles.length > 1 &&

                                            <Callout intent={preInputFilesStatus.valid ? "primary" : "danger"}
                                                title="Datasets"
                                                style={{
                                                    margin: '10px'
                                                }}>
                                                <div>
                                                    {
                                                        preInputFilesStatus.valid ?
                                                            <span>Datasets can be integrated.</span> :
                                                            <div>
                                                                <span>Datasets cannot be integrated.</span>
                                                                <ul>
                                                                    {
                                                                        preInputFilesStatus.errors.map((x, i) =>
                                                                            <li key={i}>{x}</li>)
                                                                    }
                                                                </ul>
                                                            </div>
                                                    }

                                                    {
                                                        <p>Contain
                                                            {preInputFilesStatus.common_genes == 0 ? " no " : " " + preInputFilesStatus.common_genes + " "}
                                                            common genes.</p>
                                                    }

                                                    {
                                                        <p>Using feature columns:
                                                            {preInputFilesStatus.best_genes ? " " + preInputFilesStatus.best_genes.join(", ") : " "}</p>
                                                    }

                                                    <p>When multiple files are imported, each dataset is considered as a batch.</p>
                                                </div>
                                            </Callout>
                                        }

                                        {
                                            preInputFilesStatus && tmpInputFiles.length == 1 &&

                                            <Callout intent={"warning"}
                                                title="Choose batch"
                                                style={{
                                                    margin: '10px'
                                                }}>
                                                <div>
                                                    {
                                                        preInputFilesStatus.annotations[0] ?
                                                            preInputFilesStatus.annotations[0].findIndex(x => "batch".toLowerCase() === x.toLowerCase()) >= 0 ?
                                                                <span>batch column is available to integrate multiple batches.
                                                                    Choose the correction method under PCA to perform batch correction or integration
                                                                </span> :
                                                                <div className="row">
                                                                    <Label className="row-input">
                                                                        <Text className="text-100">
                                                                            <span className={showStepHelper == 1 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                                                                onMouseEnter={() => setShowStepHelper(1)}>
                                                                                Choose a column for batch correction (if applicable)
                                                                            </span>
                                                                        </Text>
                                                                        <HTMLSelect
                                                                            onChange={(e) => {
                                                                                let tmp = [...tmpInputFiles];
                                                                                tmp[0]["batch"] = e.target.value;
                                                                                setTmpInputFiles(tmp);
                                                                            }}
                                                                            defaultValue={tmpInputFiles[0].batch ? tmpInputFiles[0].batch : "none"}
                                                                        >
                                                                            <option value="none">None</option>
                                                                            {
                                                                                preInputFilesStatus.annotations[0].map((x, i) => <option key={i} value={x}>{x}</option>)
                                                                            }
                                                                        </HTMLSelect>
                                                                    </Label>
                                                                </div>
                                                            :
                                                            "No annotations found. Cannot perform batch correction."
                                                    }
                                                </div>
                                            </Callout>
                                        }


                                        {showSection == "params" && get_input_qc()}
                                        {showSection == "params" && get_input_fsel()}
                                        {showSection == "params" && get_input_pca()}
                                        {showSection == "params" && get_input_clus()}
                                        {showSection == "params" && get_input_tsne()}
                                        {showSection == "params" && get_input_umap()}
                                        {showSection == "params" && get_input_label_cells()}
                                    </div>

                                    <div className="row-input-tooltips">
                                        {
                                            !tmpInputValid &&
                                            <Callout intent="danger"
                                                title="Incorrect file format"
                                                style={{
                                                    marginBottom: '10px'
                                                }}>
                                                <p>Upload files that in one of these formats;</p>
                                                <ul>
                                                    <li>Matrix Market - <code>*.mtx</code> or <code>*.mtx.gz</code></li>
                                                    <li>features or genes, <code>*.tsv</code> or <code>*.tsv.gz</code></li>
                                                    <li>HDF5 (10x or h5ad) - <code>*.h5</code> or <code>*.hdf5</code> or <code>*.h5ad</code></li>
                                                </ul>

                                                Note: Names of dataset must be unique!
                                            </Callout>
                                        }
                                        {showStepHelper === 1 &&
                                            <Callout intent="primary">
                                                <p>We currently support several common file formats for single-cell RNA-seq count data.</p>
                                                <p>
                                                    <strong>A count matrix in the Matrix Market (<code>*.mtx</code>) format. </strong>
                                                    This file may be Gzip-compressed, in which case we expect it to have a <code>*.mtx.gz</code> extension.
                                                    We assume that the matrix has already been filtered to remove empty droplets.
                                                    We also recommend supplying the feature annotation as an additional TSV file with gene identifiers and symbols -
                                                    this is usually called <code>features.tsv.gz</code> or <code>genes.tsv</code> in the output of processing pipelines like Cellranger.
                                                </p>
                                                <p>
                                                    <strong>A count matrix in the 10X HDF5 feature-barcode matrix format. </strong>
                                                    We assume that the matrix has already been filtered to remove empty droplets.
                                                    This is usually called something like <code>filtered_feature_bc_matrix.h5</code> in the output of processing pipelines like Cellranger.
                                                    (See <a href="https://support.10xgenomics.com/single-cell-gene-expression/software/pipelines/latest/advanced/h5_matrices">here</a> for details.
                                                    Do not confuse this with the molecule information file, which is something different altogether.)
                                                </p>
                                                <p>
                                                    <strong>A count matrix in the H5AD (<code>*.h5ad</code>) format. </strong>
                                                    We assume that the count matrix is stored in the <code>X</code> group.
                                                    We will also try to guess which field in the <code>obs</code> annotation contains gene symbols.
                                                </p>

                                                <p><strong>Batch correction:</strong> you can now import more than one file to integrate and analyze datasets.
                                                    If you only import a single dataset, specify the annotation column that contains the batch information.</p>
                                            </Callout>
                                        }
                                        {get_common_tooltips()}
                                    </div>
                                </div>
                            </>
                        } />
                        <Tab id="load" title="Load saved analysis" panel={
                            <>
                                <div className="stepper-container">
                                    <Button intent="warning"
                                        icon="bring-data"
                                        onClick={(() => setShowSection("input"))}
                                        disabled={showSection === "input"}>Show Input</Button>
                                    <Icon icon="drag-handle-horizontal" />
                                    <Button intent="warning"
                                        icon="merge-links"
                                        onClick={(() => setShowSection("params"))}
                                        disabled={loadParams && loadParamsFor === loadImportFormat ? showSection === "params" ? true : false : true}>Show Parameters</Button>
                                </div>
                                <div className="inputs-container">
                                    <div className='row-input'>
                                        {
                                            showSection === "input" &&
                                            <div className="col">
                                                <Tabs
                                                    animate={true}
                                                    renderActiveTabPanelOnly={true}
                                                    vertical={true}
                                                    onChange={(ntab, otab) => {
                                                        let tmp = [...tmpInputFiles];
                                                        tmp[0]["format"] = ntab;
                                                        setTmpInputFiles(tmp);

                                                        handleLoadImportTab(ntab, otab);
                                                    }}
                                                    defaultSelectedTabId={loadImportFormat}
                                                >
                                                    <Tab id="kana" title="Load from file" panel={
                                                        <div>
                                                            <H5><Tag round={true}>1</Tag>
                                                                <span className={showStepHelper == 1 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}>
                                                                    Load analysis from file
                                                                </span>
                                                            </H5>
                                                            <div className="row">
                                                                <Label className="row-input">
                                                                    <FileInput text={inputText[0].file} onInputChange={(msg) => {
                                                                        let tmp = [...tmpInputFiles];
                                                                        tmp[0]["file"] = msg.target.files;
                                                                        setTmpInputFiles(tmp);

                                                                        let tmpitext = [...inputText];
                                                                        tmpitext[0]["file"] = msg.target.files[0].name;
                                                                        setInputText(tmpitext);
                                                                        // setInputText({ ...inputText, "file": msg.target.files[0].name });
                                                                        // setTmpInputFiles({ ...tmpInputFiles, "file": msg.target.files })
                                                                    }} />
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    } />
                                                    {<Tab id="kanadb" title="Load from browser" panel={
                                                        <div>
                                                            <H5><Tag round={true}>1</Tag>
                                                                <span className={showStepHelper == 1 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}>
                                                                    Load analysis from browser cache
                                                                </span>
                                                            </H5>
                                                            {
                                                                props?.kanaIDBRecs.length > 0 ?
                                                                    <div className="row">
                                                                        <RadioGroup
                                                                            onChange={(x) => {
                                                                                let tmp = [...tmpInputFiles];
                                                                                tmp[0]["file"] = x.currentTarget?.value;
                                                                                setTmpInputFiles(tmp);

                                                                                // setTmpInputFiles({ ...tmpInputFiles, "file": x.currentTarget?.value });
                                                                                setTmpInputValid(true);
                                                                            }}
                                                                            selectedValue={tmpInputFiles[0]?.file}
                                                                        >
                                                                            {
                                                                                props?.kanaIDBRecs.map((x, i) => {
                                                                                    return (
                                                                                        <Radio key={i} style={{
                                                                                            display: "flex",
                                                                                            flexDirection: "row",
                                                                                            alignItems: "center"
                                                                                        }}
                                                                                            label={x.title} value={x.id} > &nbsp;
                                                                                            <span className="kana-date">{parseKanaDate(x.time)}</span>  &nbsp;
                                                                                            <Icon icon="trash" size="10"
                                                                                                style={{
                                                                                                    alignSelf: 'baseline',
                                                                                                    paddingTop: '4px',
                                                                                                    paddingLeft: '5px',
                                                                                                }}
                                                                                                onClick={() => {
                                                                                                    props?.setDeletekdb(x.id);
                                                                                                }}></Icon>
                                                                                        </Radio>
                                                                                    )
                                                                                })
                                                                            }
                                                                        </RadioGroup>
                                                                    </div> :
                                                                    <div className="row">
                                                                        <Label>No saved analysis found in the browser!!</Label>
                                                                    </div>
                                                            }
                                                        </div>} />
                                                    }
                                                </Tabs>
                                            </div>
                                        }

                                        {
                                            showSection === "params" && loadParams && loadParamsFor === loadImportFormat
                                                && tmpInputFiles?.file === inputFiles?.files?.file ?
                                                get_input_qc()
                                                : ""
                                        }

                                        {
                                            showSection === "params" && loadParams && loadParamsFor === loadImportFormat
                                                && tmpInputFiles?.file === inputFiles?.files?.file ?
                                                get_input_fsel()
                                                : ""
                                        }

                                        {
                                            showSection === "params" && loadParams && loadParamsFor === loadImportFormat
                                                && tmpInputFiles?.file === inputFiles?.files?.file ?
                                                get_input_pca()
                                                : ""
                                        }

                                        {
                                            showSection === "params" && loadParams && loadParamsFor === loadImportFormat
                                                && tmpInputFiles?.file === inputFiles?.files?.file ?
                                                get_input_clus()
                                                : ""
                                        }

                                        {
                                            showSection === "params" && loadParams && loadParamsFor === loadImportFormat
                                                && tmpInputFiles?.file === inputFiles?.files?.file ?
                                                get_input_tsne()
                                                : ""
                                        }

                                        {
                                            showSection === "params" && loadParams && loadParamsFor === loadImportFormat
                                                && tmpInputFiles?.file === inputFiles?.files?.file ?
                                                get_input_umap()
                                                : ""
                                        }

                                        {showSection === "params" && loadParams && loadParamsFor === loadImportFormat
                                            && tmpInputFiles?.file === inputFiles?.files?.file ?
                                            get_input_label_cells()
                                            : ""
                                        }
                                    </div>
                                    <div className='row-input-tooltips'>
                                        {
                                            !tmpInputValid &&
                                            <Callout intent="danger"
                                                title="Incorrect file format"
                                                style={{
                                                    marginBottom: '10px'
                                                }}>
                                            </Callout>
                                        }
                                        <Callout intent="primary">
                                            Import a saved analysis from <strong>kana</strong>. These files
                                            are stored as <strong><code>*.kana</code></strong>.
                                        </Callout>

                                        {showStepHelper === 1 &&
                                            <Callout intent="primary">
                                                <p>We currently support files in the Cellranger format -
                                                    namely, a Matrix Market file containing the count matrix.
                                                    We also recommend supplying the feature annotation
                                                    (<code>features.tsv.gz</code> or <code>genes.tsv.gz</code>).
                                                    Users may also provide a TSV file containing the barcode annotations, if any.
                                                </p>
                                            </Callout>
                                        }
                                        {get_common_tooltips()}
                                    </div>
                                </div>
                            </>
                        } />
                    </Tabs >
                </div >

                {
                    includeFooter ? (
                        <div style={{ marginBottom: "10px" }} className={Classes.DIALOG_FOOTER} >
                            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                                <Tooltip2 content="Run Analysis">
                                    <Button disabled={!tmpInputValid || !preInputFilesStatus?.valid} icon="function" onClick={handleImport}>Analyze</Button>
                                </Tooltip2>
                            </div>
                        </div>
                    ) : (
                        <div style={{ margin: "0 20px" }}>
                        </div>
                    )
                }
            </Drawer>
        </>
    );
}

export default AnalysisDialog;
