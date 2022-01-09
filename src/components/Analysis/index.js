import {
    Button, Classes, Dialog, Text, FileInput, NumericInput,
    Label, H5, Tag, HTMLSelect, Switch, Callout, Tabs, Tab,
    RadioGroup, Radio, Icon, Position,
    InputGroup
} from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import React, { useContext, useState, useCallback, useEffect } from "react";

import { AppContext } from "../../context/AppContext";
import "./Analysis.css";

function AnalysisDialog({
    buttonText,
    includeFooter,
    ...props
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [showStepHelper, setShowStepHelper] = useState(1);
    const handleButtonClick = useCallback(() => setIsOpen(!isOpen), [isOpen]);
    const handleClose = useCallback(() => setIsOpen(false), []);

    const { inputFiles, setInputFiles,
        params, setParams, openInput,
        tabSelected, setTabSelected,
        loadParams, kanaIDBRecs,
        setLoadParamsFor, loadParamsFor,
        setDeletekdb, setDatasetName } = useContext(AppContext);

    // assuming new is the default tab
    let [tmpInputFiles, setTmpInputFiles] = useState({
        gene: null,
        mtx: null,
        barcode: null,
    });

    const [inputText, setInputText] = useState({
        mtx: "Choose Matrix Market file",
        gene: "Choose feature/gene annotation",
        barcode: "Choose barcode annotation",
    });

    let [tmpInputValid, setTmpInputValid] = useState(true);

    const [newImportFormat, setNewImportFormat] = useState("mtx");
    const [loadImportFormat, setLoadImportFormat] = useState("kana");
    // const [hdfFormat, sethdfFormat] = useState("tenx");

    let [tmpInputParams, setTmpInputParams] = useState(tabSelected === "new" ? params : loadParams);

    function handleImport() {
        setParams(tmpInputParams);

        if (tabSelected === "load") {
            if (loadImportFormat === "kanadb") {
                setDatasetName(tmpInputFiles?.file);
            } else {
                setDatasetName(tmpInputFiles?.file?.[0]?.name.split(".")[0]);
            }
        }

        // if (tabSelected === "load") {
        //     // setLoadParams(tmpInputParams);
        // }
        setInputFiles({
            "format": tabSelected === "new" ?
                newImportFormat : loadImportFormat,
            "files": tmpInputFiles,
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

        }
        setTabSelected(currTab);
        setShowStepHelper(0);
    }

    function handleNewImportTab(currTab, prevTab) {
        if (currTab === "mtx") {
            setTmpInputFiles({
                gene: null,
                mtx: null,
                barcode: null,
            });

            setInputText({
                mtx: "Choose Matrix Market file",
                gene: "Choose feature/gene annotation",
                barcode: "Choose barcode annotation",
            });
        } else if (currTab === "tenx") {

            setTmpInputFiles({
                file: null,
            });

            setInputText({
                file: "Choose 10x v3 H5 file",
            });
        } else if (currTab === "h5ad") {
            setTmpInputFiles({
                file: null,
            });

            setInputText({
                file: "Choose H5ad file",
            });
        }

        setTmpInputParams(params);
        setNewImportFormat(currTab);
    }

    function handleLoadImportTab(currTab, prevTab) {
        if (currTab === "kana") {
            setTmpInputFiles({
                file: null
            });

            setInputText({
                file: "Choose kana analysis file"
            });


        } else if (currTab === "kanadb") {
            setTmpInputFiles({
                file: null
            });

            setTmpInputValid(true);
        }

        if (loadParams) {
            setTmpInputParams(loadParams);
        }
        setLoadImportFormat(currTab);
    }

    useEffect(() => {
        openInput && setIsOpen(true);
    }, [openInput]);

    useEffect(() => {
        if (loadParams && tabSelected === "load") {
            setTmpInputParams(loadParams);
        }
    }, [loadParams]);

    useEffect(() => {
        if (tabSelected === "load" && loadImportFormat === "kanadb"
            && tmpInputFiles?.file === null && kanaIDBRecs) {
            setTmpInputFiles({
                file: kanaIDBRecs[0]
            });
        }
    }, [kanaIDBRecs, loadImportFormat]);

    useEffect(() => {
        if (tmpInputFiles) {
            if (tabSelected === "new") {
                if (newImportFormat === "mtx") {
                    if (
                        (tmpInputFiles?.mtx && !(inputText?.mtx.toLowerCase().endsWith("mtx") ||
                            inputText?.mtx.toLowerCase().endsWith("mtx.gz")
                        )) ||
                        (tmpInputFiles?.gene && !(inputText?.gene.toLowerCase().endsWith("tsv") ||
                            inputText?.gene.toLowerCase().endsWith("tsv.gz")
                        )) ||
                        (tmpInputFiles?.barcode && !(inputText?.barcode.toLowerCase().endsWith("tsv") ||
                            inputText?.barcode.toLowerCase().endsWith("tsv.gz")
                        ))
                    ) {
                        setTmpInputValid(false);
                    } else {
                        setTmpInputValid(true);
                    }
                } else if (newImportFormat === "tenx" || newImportFormat === "h5ad") {
                    if (
                        tmpInputFiles?.file && !(
                            inputText?.file.toLowerCase().endsWith("hdf5") ||
                            inputText?.file.toLowerCase().endsWith("h5") ||
                            inputText?.file.toLowerCase().endsWith("h5ad")
                        )
                    ) {
                        setTmpInputValid(false);
                    } else {
                        setTmpInputValid(true);
                    }
                }

            } else if (tabSelected === "load" && inputText?.file) {
                if (loadImportFormat === "kana" &&
                    tmpInputFiles?.file != null && !(inputText?.file.toLowerCase().endsWith("kana")
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
        try {
            let kstamp = Number(x.replace("kana-", ""));
            if (isNaN(kstamp)) {
                return "Invalid Date";
            } else {
                let d = new Date(kstamp);
                return d.toDateString() + ", " + d.toLocaleTimeString(); 
            }
        } catch (error) {
            return "";
        }
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
                            Currently, we only support multi-level community detection on an shared nearest neighbor (SNN) graph,
                            where cells are the nodes and edges are created between neighboring cells.
                        </p>
                        <p>
                            <strong>Number of neighbors</strong>:
                            Number of neighbors to use to construct the SNN graph.
                            Larger values result in broader clusters.
                        </p>
                        <p>
                            <strong>Use ANN</strong>:
                            Use an approximate method to speed up the nearest neighbor search.
                            This sacrifices some accuracy for speed in larger datasets.
                        </p>
                        <p>
                            <strong>Weighting scheme</strong>:
                            Weighting scheme to use for the edges of the SNN graph.
                            The <em>Rank</em> approach derives a weight from the rank of the closest shared neighbor;
                            the <em>Number</em> approach uses the number of shared neighbors;
                            and the Jaccard approach uses the <em>Jaccard</em> index of the neighbor sets.
                        </p>
                        <p>
                            <strong>Resolution</strong>:
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
            </>
        )
    }

    const get_input_qc = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>2</Tag>
                        <span className="row-tooltip"
                            onMouseEnter={() => setShowStepHelper(2)}>
                            Quality control
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className="row-tooltip"
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
                                <span className="row-tooltip"
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
                                <span className="row-tooltip"
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
                        <span className="row-tooltip"
                            onMouseEnter={() => setShowStepHelper(3)}>
                            Feature Selection
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className="row-tooltip"
                                    onMouseEnter={() => setShowStepHelper(3)}>
                                    Lowess span
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="0.3" value={tmpInputParams["fSelection"]["fsel-span"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "fSelection": { ...tmpInputParams["fSelection"], "fsel-span": nval } }) }} />
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
                        <span className="row-tooltip"
                            onMouseEnter={() => setShowStepHelper(4)}>
                            Principal components analysis
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className="row-tooltip"
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
                                <span className="row-tooltip"
                                    onMouseEnter={() => setShowStepHelper(4)}>
                                    Number of PCs
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="25" value={tmpInputParams["pca"]["pca-npc"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "pca": { ...tmpInputParams["pca"], "pca-npc": nval } }) }} />
                        </Label>
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
                        <span className="row-tooltip"
                            onMouseEnter={() => setShowStepHelper(5)}>
                            Clustering
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className="row-tooltip"
                                    onMouseEnter={() => setShowStepHelper(5)}>
                                    Method
                                </span>
                            </Text>
                            <HTMLSelect defaultValue={tmpInputParams["cluster"]["clus-method"]}>
                                <option>{tmpInputParams["cluster"]["clus-method"]}</option>
                            </HTMLSelect>
                        </Label>
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className="row-tooltip"
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
                                <span className="row-tooltip"
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
                                <span className="row-tooltip"
                                    onMouseEnter={() => setShowStepHelper(5)}>
                                    Weighting scheme
                                </span>
                            </Text>
                            <HTMLSelect onChange={(nval, val) => setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-scheme": parseInt(nval?.currentTarget?.value) } })}>
                                <option key="0">Rank</option>
                                <option key="1">Number</option>
                                <option key="2">Jaccard</option>
                            </HTMLSelect>
                        </Label>
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className="row-tooltip"
                                    onMouseEnter={() => setShowStepHelper(5)}>
                                    Resolution
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="0.5" value={tmpInputParams["cluster"]["clus-res"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-res": nval } }) }} />
                        </Label>
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
                        <span className="row-tooltip"
                            onMouseEnter={() => setShowStepHelper(6)}>
                            t-SNE
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className="row-tooltip"
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
                                <span className="row-tooltip"
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
                        <span className="row-tooltip"
                            onMouseEnter={() => setShowStepHelper(7)}>
                            UMAP
                        </span>
                    </H5>
                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className="row-tooltip"
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
                                <span className="row-tooltip"
                                    onMouseEnter={() => setShowStepHelper(7)}>
                                    Minimum distance
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="0.01" value={tmpInputParams["umap"]["umap-min_dist"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-min_dist": nval } }) }} />
                        </Label>
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className="row-tooltip"
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

    return (
        <>
            <Tooltip2 content="Start new analysis or modify parameters" position={Position.BOTTOM}>
                <Button onClick={handleButtonClick} icon="social-media" intent="primary" text={buttonText} />
            </Tooltip2>
            <Dialog className="analysis-dialog" {...props} isOpen={isOpen} onClose={handleClose}>

                <div className={Classes.DIALOG_BODY}>
                    <Tabs
                        animate={true}
                        renderActiveTabPanelOnly={true}
                        vertical={false}
                        onChange={handleTabInput}
                        defaultSelectedTabId={tabSelected}
                    >
                        <Tab id="new" title="Import new dataset" panel={
                            <div className="inputs-container">
                                <div className='row-input'>
                                    <div className="col"
                                        style={{
                                            // paddingTop: '10px',
                                            paddingBottom: '15px'
                                        }}>
                                        <div>
                                            <H5><Tag round={true}>1</Tag>
                                                <span className="row-tooltip"
                                                    onMouseEnter={() => setShowStepHelper(1)}>
                                                    Load input files
                                                </span>
                                            </H5>
                                            <Tabs
                                                animate={true}
                                                renderActiveTabPanelOnly={true}
                                                vertical={true}
                                                onChange={handleNewImportTab}
                                                defaultSelectedTabId={newImportFormat}
                                            >
                                                <Tab id="mtx" title="Matrix Market file" panel={
                                                    <div className="row"
                                                    >
                                                        <Label className="row-input">
                                                            <FileInput text={inputText.mtx} onInputChange={(msg) => { setInputText({ ...inputText, "mtx": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "mtx": msg.target.files }) }} />
                                                        </Label>
                                                        <Label className="row-input">
                                                            <FileInput text={inputText.gene} onInputChange={(msg) => { setInputText({ ...inputText, "gene": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "gene": msg.target.files }) }} />
                                                        </Label>
                                                        {/* <Label className="row-input">
                                                            <FileInput text={inputText.barcode} onInputChange={(msg) => { setInputText({ ...inputText, "barcode": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "barcode": msg.target.files }) }} />
                                                        </Label> */}
                                                    </div>
                                                } />
                                                <Tab id="tenx" title="10x v3 H5" panel={
                                                    <div className="row"
                                                    >
                                                        <Label className="row-input">
                                                            <Text className="text-100">
                                                                <span className="row-tooltip">
                                                                    Choose 10x V3 H5 file
                                                                </span>
                                                            </Text>
                                                            <FileInput style={{
                                                                marginTop: '5px'
                                                            }}
                                                                text={inputText.file}
                                                                onInputChange={(msg) => {
                                                                    setInputText({ ...inputText, "file": msg.target.files[0].name });
                                                                    setTmpInputFiles({ ...tmpInputFiles, "file": msg.target.files })
                                                                }} />
                                                        </Label>

                                                        {/* <Label className="row-input">
                                                            <Text className="text-100">
                                                                <span className="row-tooltip">
                                                                    HDF5 format
                                                                </span>
                                                            </Text>
                                                            <HTMLSelect onChange={(nval, val) => sethdfFormat(nval?.currentTarget.key)}>
                                                                <option key="tenx">10x genomics</option>
                                                                <option key="h5ad">H5ad</option>
                                                            </HTMLSelect>
                                                        </Label> */}
                                                    </div>
                                                } />
                                                <Tab id="h5ad" title="H5ad" panel={
                                                    <div className="row"
                                                    >
                                                        <Label className="row-input">
                                                            <Text className="text-100">
                                                                <span className="row-tooltip">
                                                                    Choose H5ad file
                                                                </span>
                                                            </Text>
                                                            <FileInput style={{
                                                                marginTop: '5px'
                                                            }}
                                                                text={inputText.file}
                                                                onInputChange={(msg) => {
                                                                    setInputText({ ...inputText, "file": msg.target.files[0].name });
                                                                    setTmpInputFiles({ ...tmpInputFiles, "file": msg.target.files })
                                                                }} />
                                                        </Label>
                                                    </div>
                                                } />
                                            </Tabs>

                                        </div>
                                    </div>

                                    {get_input_qc()}
                                    {get_input_fsel()}
                                    {get_input_pca()}
                                    {get_input_clus()}
                                    {get_input_tsne()}
                                    {get_input_umap()}
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
                                        </Callout>
                                    }
                                    {showStepHelper === 1 &&
                                        <Callout intent="primary">
                                            <p>We currently support several common file formats for single-cell RNA-seq count data.</p>
                                            <p>
                                                <strong>A count matrix in the Matrix Market (<code>*.mtx</code>) format.</strong>
                                                This file may be Gzip-compressed, in which case we expect it to have a <code>*.mtx.gz</code> extension.
                                                We assume that the matrix has already been filtered to remove empty droplets.
                                                We also recommend supplying the feature annotation as an additional TSV file with gene identifiers and symbols -
                                                this is usually called <code>features.tsv.gz</code> or <code>genes.tsv</code> in the output of processing pipelines like Cellranger.
                                            </p>
                                            <p>
                                                <strong>A count matrix in the 10X matrix HDF5 (<code>*.h5</code>) format.</strong>
                                                We assume that the matrix has already been filtered to remove empty droplets.
                                                This is usually called something like <code>filtered_feature_bc_matrix.h5</code> in the output of processing pipelines like Cellranger.
                                                (Do not confuse this with the molecule information file, which is something different altogether.)
                                            </p>
                                            <p>
                                                <strong>A count matrix in the H5AD (<code>*.h5ad</code>) format.</strong>
                                                We assume that the count matrix is stored in the <code>X</code> group.
                                                We will also try to guess which field in the <code>obs</code> annotation contains gene symbols.
                                            </p>
                                        </Callout>
                                    }
                                    {get_common_tooltips()}
                                </div>
                            </div>
                        } />
                        <Tab id="load" title="Load saved analysis" panel={
                            <div className="inputs-container">
                                <div className='row-input'>
                                    <div className="col">
                                        <Tabs
                                            animate={true}
                                            renderActiveTabPanelOnly={true}
                                            vertical={true}
                                            onChange={handleLoadImportTab}
                                            defaultSelectedTabId={loadImportFormat}
                                        >
                                            <Tab id="kana" title="Load Analysis file" panel={
                                                <div>
                                                    <H5><Tag round={true}>1</Tag>
                                                        <span className="row-tooltip">
                                                            Load saved analysis file
                                                        </span>
                                                    </H5>
                                                    <div className="row">
                                                        <Label className="row-input">
                                                            <FileInput text={inputText.file} onInputChange={(msg) => { setInputText({ ...inputText, "file": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "file": msg.target.files }) }} />
                                                        </Label>
                                                    </div>
                                                </div>
                                            } />
                                            {<Tab id="kanadb" title="Load from database" panel={
                                                <div>
                                                    <H5><Tag round={true}>1</Tag>
                                                        <span className="row-tooltip">
                                                            Load analysis file
                                                        </span>
                                                    </H5>
                                                    {
                                                        kanaIDBRecs ?
                                                            <div className="row">
                                                                <RadioGroup
                                                                    label="Choose an anlaysis"
                                                                    onChange={(x) => {
                                                                        setTmpInputFiles({ ...tmpInputFiles, "file": x.currentTarget?.value });
                                                                        setTmpInputValid(true);
                                                                    }}
                                                                    selectedValue={tmpInputFiles?.file}
                                                                >
                                                                    {
                                                                        kanaIDBRecs.map((x, i) => {
                                                                            return (
                                                                                <Radio key={i} style={{
                                                                                    display: "flex",
                                                                                    flexDirection: "row",
                                                                                    alignItems: "center"
                                                                                }}
                                                                                    label={x} value={x} > &nbsp;
                                                                                    <span className="kana-date">{parseKanaDate(x)}</span>  &nbsp;
                                                                                    <Icon icon="trash" size="10"
                                                                                        style={{
                                                                                            alignSelf: 'baseline',
                                                                                            paddingTop: '4px',
                                                                                            paddingLeft: '5px',
                                                                                        }}
                                                                                        onClick={() => {
                                                                                            setDeletekdb(x);
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
                                    {
                                        loadParams && loadParamsFor === loadImportFormat
                                            && tmpInputFiles?.file === inputFiles?.files?.file ?
                                            get_input_qc()
                                            : ""
                                    }

                                    {
                                        loadParams && loadParamsFor === loadImportFormat
                                            && tmpInputFiles?.file === inputFiles?.files?.file ?
                                            get_input_fsel()
                                            : ""
                                    }

                                    {
                                        loadParams && loadParamsFor === loadImportFormat
                                            && tmpInputFiles?.file === inputFiles?.files?.file ?
                                            get_input_pca()
                                            : ""
                                    }

                                    {
                                        loadParams && loadParamsFor === loadImportFormat
                                            && tmpInputFiles?.file === inputFiles?.files?.file ?
                                            get_input_clus()
                                            : ""
                                    }

                                    {
                                        loadParams && loadParamsFor === loadImportFormat
                                            && tmpInputFiles?.file === inputFiles?.files?.file ?
                                            get_input_tsne()
                                            : ""
                                    }

                                    {
                                        loadParams && loadParamsFor === loadImportFormat
                                            && tmpInputFiles?.file === inputFiles?.files?.file ?
                                            get_input_umap()
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
                        } />
                    </Tabs >
                </div >

                {
                    includeFooter ? (
                        <div className={Classes.DIALOG_FOOTER} >
                            <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                                <Tooltip2 content="Run Analysis">
                                    <Button disabled={!tmpInputValid} icon="function" onClick={handleImport}>Analyze</Button>
                                </Tooltip2>
                            </div>
                        </div>
                    ) : (
                        <div style={{ margin: "0 20px" }}>
                        </div>
                    )
                }
            </Dialog >
        </>
    );
}

export default AnalysisDialog;
