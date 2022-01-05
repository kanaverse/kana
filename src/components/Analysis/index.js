import {
    Button, Classes, Dialog, Text, FileInput, NumericInput,
    Label, H5, Tag, HTMLSelect, Switch, Callout, Tabs, Tab
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
        params, setParams, openInput } = useContext(AppContext);

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

    let [tmpInputParams, setTmpInputParams] = useState(params);
    let [tmpInputValid, setTmpInputValid] = useState(true);

    const [tabSelected, setTabSelected] = useState("new");
    const [newImportFormat, setNewImportFormat] = useState("mtx");
    const [hdfFormat, sethdfFormat] = useState("tenx");

    function handleImport() {
        setParams(tmpInputParams);

        setInputFiles({
            "format": tabSelected == "new" ?
                newImportFormat == "hdf5" ? hdfFormat : "mtx"
                : "kana",
            "files": tmpInputFiles
        });

        handleClose();
    }

    function handleTabInput(currTab, prevTab) {
        if (currTab === "new") {
            handleNewImportTab(newImportFormat);
        } else if (currTab === "load") {
            setTmpInputFiles({
                file: null
            });

            setInputText({
                file: "Choose kana analysis file"
            });
        }
        setTabSelected(currTab);
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
        } else if (currTab === "hdf5") {
            setTmpInputFiles({
                file: null,
            });

            setInputText({
                file: "Choose HDF5 file",
            });
        }

        setNewImportFormat(currTab);
    }

    useEffect(() => {
        openInput && setIsOpen(true);
    }, [openInput]);

    useEffect(() => {
        if (tmpInputFiles) {
            if (tabSelected === "new" && inputText?.mtx) {
                if (
                    tmpInputFiles?.mtx && !(inputText?.mtx.endsWith("mtx") ||
                        inputText?.mtx.endsWith("mtx.gz") ||
                        inputText?.mtx.endsWith("hdf5") ||
                        inputText?.mtx.endsWith("h5")
                    ) ||
                    tmpInputFiles?.gene && !(inputText?.gene.endsWith("tsv") ||
                        inputText?.gene.endsWith("tsv.gz")
                    ) ||
                    tmpInputFiles?.barcode && !(inputText?.barcode.endsWith("tsv") ||
                        inputText?.barcode.endsWith("tsv.gz")
                    )
                ) {
                    setTmpInputValid(false);
                } else {
                    setTmpInputValid(true);
                }

            } else if (tabSelected === "load" && inputText?.file) {
                if (
                    tmpInputFiles?.file != null && !(inputText?.file.endsWith("kana") ||
                        inputText?.file.endsWith("kana.gz")
                    )
                ) {
                    setTmpInputValid(false);
                } else {
                    setTmpInputValid(true);
                }
            }
        }
    }, [tmpInputFiles]);

    return (
        <>
            <Button onClick={handleButtonClick} icon="social-media" intent="primary" text={buttonText} />
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
                                    <div className="col">
                                        <div>
                                            <H5><Tag round={true}>1</Tag>
                                                <span className="row-tooltip"
                                                    onMouseEnter={() => setShowStepHelper(1)}
                                                    onMouseLeave={() => setShowStepHelper(null)}>
                                                    Load input files
                                                </span>
                                            </H5>
                                            <Tabs
                                                animate={true}
                                                renderActiveTabPanelOnly={true}
                                                vertical={true}
                                                onChange={handleNewImportTab}
                                                defaultSelectedTabId={newImportFormat}
                                                style={{
                                                    padding: '10px'
                                                }}
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
                                                        <Label className="row-input">
                                                            <FileInput text={inputText.barcode} onInputChange={(msg) => { setInputText({ ...inputText, "barcode": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "barcode": msg.target.files }) }} />
                                                        </Label>
                                                    </div>
                                                } />
                                                <Tab id="hdf5" title="HDF5" panel={
                                                    <div className="row"
                                                    >
                                                        <Label className="row-input">
                                                            <Text className="text-100">
                                                                <span className="row-tooltip">
                                                                    Choose HDF5 file
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

                                                        <Label className="row-input">
                                                            <Text className="text-100">
                                                                <span className="row-tooltip">
                                                                    HDF5 format
                                                                </span>
                                                            </Text>
                                                            <HTMLSelect onChange={(nval, val) => sethdfFormat(nval?.currentTarget.key)}>
                                                                <option key="tenx">10x genomics</option>
                                                                <option key="anndata">AnnData</option>
                                                            </HTMLSelect>
                                                        </Label>
                                                    </div>
                                                } />
                                            </Tabs>

                                        </div>
                                    </div>

                                    <div className="col">
                                        <div>
                                            <H5><Tag round={true}>2</Tag>
                                                <span className="row-tooltip"
                                                    onMouseEnter={() => setShowStepHelper(2)}
                                                    onMouseLeave={() => setShowStepHelper(null)}>
                                                    Quality control
                                                </span>
                                            </H5>
                                            <div className="row">
                                                <Label className="row-input">
                                                    <Text className="text-100">
                                                        <span className="row-tooltip"
                                                            onMouseEnter={() => setShowStepHelper(2)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
                                                            Number of MADs
                                                        </span>
                                                    </Text>
                                                    <NumericInput
                                                        placeholder="3" value={tmpInputParams["qc"]["qc-nmads"]}
                                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "qc": { ...tmpInputParams["qc"], "qc-nmads": nval } }) }} />
                                                </Label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col">
                                        <div>
                                            <H5><Tag round={true}>3</Tag>
                                                <span className="row-tooltip"
                                                    onMouseEnter={() => setShowStepHelper(3)}
                                                    onMouseLeave={() => setShowStepHelper(null)}>
                                                    Feature Selection
                                                </span>
                                            </H5>
                                            <div className="row">
                                                <Label className="row-input">
                                                    <Text className="text-100">
                                                        <span className="row-tooltip"
                                                            onMouseEnter={() => setShowStepHelper(3)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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

                                    <div className="col">
                                        <div>
                                            <H5><Tag round={true}>4</Tag>
                                                <span className="row-tooltip"
                                                    onMouseEnter={() => setShowStepHelper(4)}
                                                    onMouseLeave={() => setShowStepHelper(null)}>
                                                    Principal components analysis
                                                </span>
                                            </H5>
                                            <div className="row">
                                                <Label className="row-input">
                                                    <Text className="text-100">
                                                        <span className="row-tooltip"
                                                            onMouseEnter={() => setShowStepHelper(4)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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
                                                            onMouseEnter={() => setShowStepHelper(4)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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

                                    <div className="col">
                                        <div>
                                            <H5><Tag round={true}>5</Tag>
                                                <span className="row-tooltip"
                                                    onMouseEnter={() => setShowStepHelper(5)}
                                                    onMouseLeave={() => setShowStepHelper(null)}>
                                                    Clustering
                                                </span>
                                            </H5>
                                            <div className="row">
                                                <Label className="row-input">
                                                    <Text className="text-100">
                                                        <span className="row-tooltip"
                                                            onMouseEnter={() => setShowStepHelper(5)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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
                                                            onMouseEnter={() => setShowStepHelper(5)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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
                                                            onMouseEnter={() => setShowStepHelper(5)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
                                                            Use ANN
                                                        </span>
                                                    </Text>
                                                    <Switch style={{ marginTop: '10px' }} large={true} checked={tmpInputParams["cluster"]["clus-approx"]}
                                                        innerLabelChecked="true" innerLabel="false"
                                                        onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-approx": e.target.checked } }) }} />
                                                </Label>

                                                <Label className="row-input">
                                                    <Text className="text-100">
                                                        <span className="row-tooltip"
                                                            onMouseEnter={() => setShowStepHelper(5)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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
                                                            onMouseEnter={() => setShowStepHelper(5)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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

                                    <div className="col">
                                        <div>
                                            <H5><Tag round={true}>6</Tag>
                                                <span className="row-tooltip"
                                                    onMouseEnter={() => setShowStepHelper(6)}
                                                    onMouseLeave={() => setShowStepHelper(null)}>
                                                    t-SNE
                                                </span>
                                            </H5>
                                            <div className="row">
                                                <Label className="row-input">
                                                    <Text className="text-100">
                                                        <span className="row-tooltip"
                                                            onMouseEnter={() => setShowStepHelper(6)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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
                                                            onMouseEnter={() => setShowStepHelper(6)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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

                                    <div className="col">
                                        <div>
                                            <H5><Tag round={true}>7</Tag>
                                                <span className="row-tooltip"
                                                    onMouseEnter={() => setShowStepHelper(7)}
                                                    onMouseLeave={() => setShowStepHelper(null)}>
                                                    UMAP
                                                </span>
                                            </H5>
                                            <div className="row">
                                                <Label className="row-input">
                                                    <Text className="text-100">
                                                        <span className="row-tooltip"
                                                            onMouseEnter={() => setShowStepHelper(7)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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
                                                            onMouseEnter={() => setShowStepHelper(7)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
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
                                                            onMouseEnter={() => setShowStepHelper(7)}
                                                            onMouseLeave={() => setShowStepHelper(null)}>
                                                            Epochs
                                                        </span>
                                                    </Text>
                                                    <NumericInput
                                                        placeholder="500" value={tmpInputParams["umap"]["umap-epoch"]}
                                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-epoch": nval } }) }} />
                                                </Label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="row-input-tooltips">
                                    {
                                        !tmpInputValid &&
                                        <Callout intent="danger"
                                            title="Incorrect file format"
                                            style={{
                                                marginBottom: '10px'
                                            }}>
                                            <p>Upload files that in one of these formats;
                                                <ul>
                                                    <li>Matrix Market - <code>*.mtx</code> or <code>*.mtx.gz</code></li>
                                                    <li>features or genes, <code>*.tsv</code> or <code>*.tsv.gz</code></li>
                                                </ul>
                                            </p>
                                        </Callout>
                                    }
                                    {showStepHelper == 1 &&
                                        <Callout intent="primary">
                                            <p>We currently support files in the Cellranger format -
                                                namely, a Matrix Market file containing the count matrix.
                                                We also recommend supplying the feature annotation
                                                (<code>features.tsv.gz</code> or <code>genes.tsv.gz</code>).
                                                Users may also provide a TSV file containing the barcode annotations, if any.
                                            </p>
                                        </Callout>
                                    }
                                    {showStepHelper == 2 &&
                                        <Callout intent="primary">
                                            <p>At this step, we compute per-cell quality control (QC)
                                                metrics such as the total count per cell, the total number
                                                of detected features and (if the feature annotation is supplied)
                                                the mitochondrial proportion in each cell.
                                            </p>
                                            <p>We remove low-quality
                                                cells based on these metrics - specifically, cells with low total
                                                counts/number of detected features or high mitochondrial proportions
                                                are filtered out.
                                            </p>
                                            <p>We use an outlier-based approach to define the
                                                filter threshold under the assumption that most cells in the
                                                dataset are of acceptable quality.
                                            </p>
                                            <p>
                                                <strong>Number of MADs</strong>:
                                                Number of median absolute deviations (MADs) from the median,
                                                used to define a filter threshold in the appropriate direction
                                                for each QC metric. Increasing this value will reduce the stringency
                                                of the filtering.
                                            </p>
                                        </Callout>
                                    }
                                    {showStepHelper == 3 &&
                                        <Callout intent="primary">
                                            <p>
                                                Identify highly variable genes while accounting
                                                for the mean-variance relationship. We do so by
                                                fitting a mean-dependent trend to the variances,
                                                computed from the log-transformed normalized expression
                                                values. The residuals from the trend are then used to
                                                rank highly variable genes.
                                            </p>
                                            <p>
                                                <strong>Lowess span</strong>:
                                                The span of the LOWESS smoother for fitting the mean-variance trend.
                                                Larger values increase the smoothness of the global trend at the
                                                cost of decreasing sensitivity to local variations.
                                            </p>
                                        </Callout>
                                    }
                                    {showStepHelper == 4 &&
                                        <Callout intent="primary">
                                            <p>
                                                Perform a principal components analysis (PCA)
                                                to obtain per-cell coordinates in a low-dimensional space.
                                                This is used to compact the data for faster downstream computation,
                                                as well as to remove uninteresting high-dimensional noise.
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
                                    {showStepHelper == 5 &&
                                        <Callout intent="primary">
                                            <p>
                                                Cluster cells into discrete groupings based on their
                                                relative similarity in the low-dimensional space.
                                                The set of clusters serve as a summary of the cellular
                                                heterogeneity in the population, allowing us to easily
                                                perform further characterization on subpopulations of
                                                interest.
                                            </p>
                                            <p>
                                                <strong>Method</strong>:
                                                Clustering algorithm to use. Currently, we use multi-level
                                                community detection on an shared nearest neighbor (SNN)
                                                graph where cells are the nodes and edges are created
                                                between neighboring cells.
                                            </p>
                                            <p>
                                                <strong>Number of neighbors</strong>:
                                                Number of neighbors to use to construct the shared
                                                nearest neighbor graph. Larger values result in broader clusters.
                                            </p>
                                            <p>
                                                <strong>Use ANN ?</strong>:
                                                Use an approximate method to speed up the nearest neighbor search.
                                                This sacrifices some accuracy for speed in larger datasets.
                                            </p>
                                            <p>
                                                <strong>Weighting scheme</strong>:
                                                Weighting scheme to use for the edges of the shared nearest neighbor graph.
                                                The Rank approach derives a weight from the rank of the closest shared neighbor;
                                                the Number approach uses the number of shared neighbors; and the Jaccard approach
                                                uses the Jaccard index of the neighbor sets.
                                            </p>
                                            <p>
                                                <strong>Resolution</strong>:
                                                Resolution parameter for the multi-level clustering, used to adjust
                                                the modularity calculation during community optimization.
                                                Larger values yield more fine-grained clusters.
                                            </p>
                                        </Callout>
                                    }
                                    {showStepHelper == 6 &&
                                        <Callout intent="primary">
                                            <p>
                                                Create a t-SNE plot to visualize cells in two dimensions, because our
                                                feeble human minds cannot interpret high-dimensional spaces.
                                                Cells that were neighbors in the original space are kept close
                                                together in the 2D embedding, while dissimilar cells are placed
                                                (arbitrarily) far away.
                                            </p>
                                            <p>
                                                <strong>Perplexity</strong>:
                                                Perplexity parameter, which determines the size of the neighborhood of each cell.
                                                Larger values will favor preservation of global structure in the 2D embedding.
                                            </p>
                                            <p>
                                                <strong>Iterations</strong>:
                                                Number of t-SNE iterations. Doesn't usually have much of an effect if
                                                you leave it as it is.
                                            </p>
                                        </Callout>
                                    }
                                    {showStepHelper == 7 &&
                                        <Callout title="Visually important content" intent="primary">
                                            <p>
                                                Create a UMAP plot to visualize cells in two dimensions.
                                                Like the t-SNE, this aims to map cells from a high-dimensional
                                                space into a 2D embedding, where neighboring cells are kept close
                                                together and dissimilar cells are placed far apart.
                                            </p>
                                            <p>
                                                <strong>Number of neighbors</strong>:
                                                Number of neighbors to use when defining the size of the local neighborhood.
                                                Larger values will favor preservation of global structure.
                                            </p>
                                            <p>
                                                <strong>Minimum distance</strong>:
                                                Minimum distance between points. Smaller values result in more tightly
                                                packed embedding and favor local structure.
                                            </p>
                                            <p>
                                                <strong>Epochs</strong>:
                                                Number of epochs to use for convergence. This doesn't really
                                                change all too much.
                                            </p>
                                        </Callout>
                                    }
                                </div>
                            </div>
                        } />
                        <Tab id="load" title="Load saved analysis" disabled={true} panel={
                            <div className="inputs-container">
                                <div className='row-input'>
                                    <div className="col">
                                        <div>
                                            <H5><Tag round={true}>1</Tag>
                                                <span className="row-tooltip">
                                                    Load analysis file
                                                </span>
                                            </H5>
                                            <div className="row">
                                                <Label className="row-input">
                                                    <FileInput text={inputText.file} onInputChange={(msg) => { setInputText({ ...inputText, "file": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "file": msg.target.files }) }} />
                                                </Label>
                                            </div>
                                        </div>
                                    </div>
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
                                        are gzipped and are stored as <strong><code>*.kana.gz</code></strong>.
                                    </Callout>
                                </div>
                            </div>
                        } />
                    </Tabs>
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
