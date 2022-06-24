import {
    Button, Classes, Text, FileInput, NumericInput,
    Label, H5, Tag, HTMLSelect, Switch, Callout, Tabs, Tab,
    RadioGroup, Radio, Icon, Position,
    InputGroup, Checkbox,
    Drawer
} from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import { Column, Table2, EditableCell2, Cell } from "@blueprintjs/table";
import React, { useContext, useState, useCallback, useEffect } from "react";

import { AppContext } from "../../context/AppContext";
import "./Analysis.css";
import "@blueprintjs/table/lib/css/table.css";

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
        setPreInputFiles, preInputFilesStatus, setPreInputFilesStatus } = useContext(AppContext);

    const [inputText, setInputText] = useState([]);

    let [tmpInputValid, setTmpInputValid] = useState(true);
    let [stmpInputValid, ssetTmpInputValid] = useState(true);

    const [newImportFormat, setNewImportFormat] = useState("MatrixMarket");
    const [loadImportFormat, setLoadImportFormat] = useState("kana");
    // const [hdfFormat, sethdfFormat] = useState("tenx");

    let [tmpInputParams, setTmpInputParams] = useState(tabSelected === "new" ? params : loadParams);

    // assuming new is the default tab
    let [tmpInputFiles, setTmpInputFiles] = useState([]);

    const [sinputText, ssetInputText] = useState({
        mtx: "Choose Matrix Market file",
        genes: "Choose feature/gene file",
        annotations: "Choose barcode/annotation file",
    });

    let [stmpInputFiles, ssetTmpInputFiles] = useState({
        "name": "dataset-1",
        "format": tabSelected === "new" ? newImportFormat : loadImportFormat
    });


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
                setDatasetName(tmpInputFiles?.[0]?.file?.name.split(".")[0]);
            }
        }

        if(tabSelected === "new") {
            if (Object.keys(preInputFilesStatus?.features).length > 1 && Object.keys(tmpInputParams["combined_embeddings"]["weights"]).length == 0) {
                Object.keys(preInputFilesStatus?.features).forEach(x => {
                    tmpInputParams["combined_embeddings"]["weights"][x] = 1;
                })
            }
        }

        let mapFiles = {};
        for (const f of tmpInputFiles) {
            mapFiles[f.name] = f
        }

        setInputFiles({
            "files": mapFiles,
            "batch": tabSelected === "new" ? Object.keys(mapFiles).length == 1 ?
                mapFiles[Object.keys(mapFiles)[0]]?.batch == undefined || mapFiles[Object.keys(mapFiles)[0]]?.batch == "none"
                    ? null : mapFiles[Object.keys(mapFiles)[0]]?.batch : null : null,
        });

        setLoadParamsFor(tabSelected === "new" ?
            newImportFormat : loadImportFormat);

        handleClose();
    }

    function handleTabInput(currTab, prevTab) {
        if (currTab === "new") {
            setInputText([]);
            setTmpInputFiles([]);
            handleNewImportTab(newImportFormat);
        } else if (currTab === "load") {
            setInputText([{
                mtx: "Choose Matrix Market file",
                genes: "Choose feature/gene file",
                annotations: "Choose barcode/annotation file",
            }]);

            setTmpInputFiles([{
                "name": "dataset-1",
                "format": loadImportFormat
            }]);

            handleLoadImportTab(loadImportFormat);

            let tmp = { ...stmpInputFiles };
            tmp["format"] = loadImportFormat;
            ssetTmpInputFiles(tmp);
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
            console.log(loadParams);
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
                        (x?.genes && !(inputText[ix]?.genes.toLowerCase().endsWith("tsv") ||
                            inputText[ix]?.genes.toLowerCase().endsWith("tsv.gz")
                        )) ||
                        (x?.annotations && !(inputText[ix]?.annotations.toLowerCase().endsWith("tsv") ||
                            inputText[ix]?.annotations.toLowerCase().endsWith("tsv.gz")
                        ))
                    ) {
                        all_valid = false;
                    }

                    if (
                        x?.h5 && !(
                            inputText[ix]?.h5.toLowerCase().endsWith("hdf5") ||
                            inputText[ix]?.h5.toLowerCase().endsWith("h5") ||
                            inputText[ix]?.h5.toLowerCase().endsWith("h5ad")
                        )
                    ) {
                        all_valid = false;
                    }

                    if (x.format === "MatrixMarket") {
                        if (!x.mtx) all_valid = false;
                    } else {
                        if (!x.h5) all_valid = false;
                    }
                };

                let tnames = tmpInputFiles.map(x => x.name);
                if ([...new Set(tnames)].length != tmpInputFiles.length) {
                    all_valid = false;
                }

                setTmpInputValid(all_valid);

                if (all_valid && tmpInputFiles.length > 0) {
                    let mapFiles = {};
                    for (const f of tmpInputFiles) {
                        mapFiles[f.name] = f
                    }

                    setPreInputFiles({
                        "files": mapFiles,
                    });
                }

            } else if (tabSelected === "load") {

                if (inputText?.[0]?.file == null) {
                    setTmpInputValid(true);
                } else {
                    if (!tmpInputFiles?.[0]?.file) {
                        setTmpInputValid(false);
                    } else {
                        if (loadImportFormat === "kana" &&
                            inputText?.[0]?.file != null && !(inputText?.[0]?.file.toLowerCase().endsWith("kana")
                            )
                        ) {
                            setTmpInputValid(false);
                        } else if (loadImportFormat === "kanadb" && tmpInputFiles?.[0]?.file === null) {
                            setTmpInputValid(false);
                        } else {
                            setTmpInputValid(true);
                        }
                    }
                }
            }
        }
    }, [tmpInputFiles]);

    useEffect(() => {
        if (stmpInputFiles) {
            if (tabSelected === "new") {
                let all_valid = true;
                let x = stmpInputFiles;
                if (x.format === "MatrixMarket") {
                    if (
                        (x?.mtx && !(sinputText?.mtx.toLowerCase().endsWith("mtx") ||
                            sinputText?.mtx.toLowerCase().endsWith("mtx.gz")
                        )) ||
                        (x?.genes && !(sinputText?.genes.toLowerCase().endsWith("tsv") ||
                            sinputText?.genes.toLowerCase().endsWith("tsv.gz")
                        )) ||
                        (x?.annotations && !(sinputText?.annotations.toLowerCase().endsWith("tsv") ||
                            sinputText?.annotations.toLowerCase().endsWith("tsv.gz")
                        ))
                    ) {
                        all_valid = false;
                    }

                    if (!x.mtx) all_valid = false;
                } else if (x.format === "10X") {

                    if (x?.h5 && !(
                        sinputText?.h5.toLowerCase().endsWith("hdf5") ||
                        sinputText?.h5.toLowerCase().endsWith("h5")
                    )
                    ) {
                        all_valid = false;
                    }

                    if (!x.h5) all_valid = false;

                } else if (
                    x.format === "H5AD") {
                    if (x?.h5 && !(
                        sinputText?.h5.toLowerCase().endsWith("h5ad")
                    )
                    ) {
                        all_valid = false;
                    }

                    if (!x.h5) all_valid = false;
                }

                // setTmpInputValid(all_valid);
                ssetTmpInputValid(all_valid);

            }
        }
    }, [stmpInputFiles]);

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
                {showStepHelper === 11 &&
                    <Callout intent="primary">
                        <p>
                            Remove low-quality cells based on the ADT counts.
                            This uses the number of detected features and, if available, the total count for isotype (IgG) controls.
                            Cells with few detected features or high isotype counts are filtered out;
                            this is combined with the RNA-based filters to ensure that cells are only retained if they are informative in both modalities.
                            We again use an outlier-based approach to define the filter threshold for each metric.
                        </p>
                        <p>
                            <strong>Number of MADs</strong>:
                            Number of median absolute deviations (MADs) from the median,
                            used to define a filter threshold in the appropriate direction for each QC metric.
                            Increasing this value will reduce the stringency of the filtering.
                        </p>
                        <p>
                            <strong>Isotype prefix</strong>:
                            Prefix to use to identify features in the dataset that are isotype controls.
                            This is not case-sensitive.
                        </p>
                    </Callout>
                }
                {showStepHelper === 12 &&
                    <Callout intent="primary">
                        <p>
                            Log-normalize the ADT count data.
                            This involves some more work than the RNA counterpart as the composition biases can be much stronger in ADT data.
                            We use a simple approach where we cluster cells based on their ADT counts,
                            normalize for composition biases between clusters using an median-based method, 
                            normalize for library size differences between cells within clusters,
                            and then combine both to obtain per-cell factors.
                        </p>
                        <p>
                            <strong>Number of clusters</strong>:
                            Number of clusters to use in the initial k-means clustering.
                            This clustering will not be used in any downstream steps; it is only used here to separate major subpopulations with strong DE.
                            Any rough clustering is fine and it should not be necessary to spend much time fine-tuning this parameter. 
                            Overclustering is acceptable - and possibly even desirable - provided that each cluster still contains enough cells for stable median calculations.
                        </p>
                        <p>
                            <strong>Number of PCs</strong>:
                            Number of principal components to use for the clustering.
                            We perform a PCA to compress the data for faster clustering - this has no bearing on later choices of the number of PCs.
                            Again, as long as a reasonable clustering is obtained, it should not be necessary to spend much time fine-tuning this parameter. 
                            In fact, if the requested number of PCs is greater than the number of ADTs, this parameter will have no effect.
                        </p>
                    </Callout>
                }
                {showStepHelper === 13 &&
                    <Callout intent="primary">
                        <p>
                            Perform a principal components analysis (PCA) on the log-normalized ADT matrix.
                            As for RNA, the PCA is used for compression and denoising prior to downstream steps like clustering and visualization.
                            However, unlike RNA, no feature selection is performed here as there are relatively few ADTs in the first place.
                        </p>
                        <p>
                            <strong>Number of PCs</strong>:
                            Number of principal components with the highest variance to retain in downstream analyses. 
                            Larger values will capture more biological signal at the cost of increasing noise and computational work.
                            If more PCs are requested than ADTs are available, the latter is used instead.
                        </p>
                    </Callout>
                }
                {showStepHelper === 14 &&
                    <Callout intent="primary">
                        <p>
                            Combine PC embeddings from multiple modalities.
                            This yields a single matrix that can be used in downstream analyses like clustering,
                            allowing us to incorporate information from multiple modalities.
                            By default, each modality is given equal weight in the combined matrix.
                        </p>
                        <p>
                            <strong>Modality weights</strong>:
                            Weight for each modality.
                            A larger value indicates that the corresponding modality will contribute more to the population heterogeneity in the combined embedding.
                            A value of zero indicates that the corresponding modality should be ignored in downstream analysis.
                        </p>
                    </Callout>
                }
                {showStepHelper === 10 &&
                    <Callout intent="primary">
                        <p>
                            Remove batch effects between cells from different samples.
                            This places all cells in a common coordinate space for consistent clustering and visualization.
                            Otherwise, the interpretation of downstream analysis results may be complicated by large sample-sample differences,
                            obscuring the heterogeneity within samples that is usually of interest.
                        </p>
                        <p>
                            <strong>Correction method</strong>:
                            Which correction method to use - no correction, linear regression or mutual nearest neighbor (MNN) correction.
                            MNN correction is the default and handles situations with differences in cell type composition across samples.
                            Linear regression is simpler but assumes that all samples have the same proportions of cell types, with a consistent batch effect in each cell type.
                            Users may also choose not to correct if, e.g., the sample-sample differences are interesting.
                        </p>
                        <p>
                            <strong>Number of neighbors</strong>:
                            Number of neighbors to use to identify MNN pairs.
                            Using larger values will yield a more stable correction but also increases the risk of incorrectly merging unrelated populations across samples.
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
                                        Weighting scheme
                                    </span>
                                </Text>
                                <HTMLSelect
                                    onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-scheme": parseInt(e.target.value) } }) }}
                                    defaultValue={tmpInputParams["cluster"]["clus-scheme"]}
                                >
                                    <option value="rank">Rank</option>
                                    <option value="number">Number</option>
                                    <option value="jaccard">Jaccard</option>
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
                        </Label>
                    </div>
                </div>
            </div>
        )
    }

    const [showSection, setShowSection] = useState("input");


    function get_inputs_import() {
        return (
            <div className="col"
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
                    <Tabs
                        animate={true}
                        renderActiveTabPanelOnly={true}
                        vertical={true}
                        onChange={(ntab, otab) => {
                            let tmp = { ...stmpInputFiles };
                            tmp["format"] = ntab;
                            ssetTmpInputFiles(tmp);

                            handleNewImportTab(ntab, otab);
                        }}
                        defaultSelectedTabId={newImportFormat}
                    >
                        <Tab id="MatrixMarket" title="Matrix Market file" panel={
                            <div className="row"
                            >
                                <Label className="row-input">
                                    <FileInput text={sinputText.mtx} onInputChange={(msg) => { ssetInputText({ ...sinputText, "mtx": msg.target.files[0].name }); ssetTmpInputFiles({ ...stmpInputFiles, "mtx": msg.target.files[0] }) }} />
                                </Label>
                                <Label className="row-input">
                                    <FileInput text={sinputText.genes} onInputChange={(msg) => { ssetInputText({ ...sinputText, "genes": msg.target.files[0].name }); ssetTmpInputFiles({ ...stmpInputFiles, "genes": msg.target.files[0] }) }} />
                                </Label>
                                <Label className="row-input">
                                    <FileInput text={sinputText.annotations} onInputChange={(msg) => { ssetInputText({ ...sinputText, "annotations": msg.target.files[0].name }); ssetTmpInputFiles({ ...stmpInputFiles, "annotations": msg.target.files[0] }) }} />
                                </Label>
                            </div>
                        } />
                        <Tab id="10X" title="10x HDF5 matrix" panel={
                            <div className="row"
                            >
                                <Label className="row-input">
                                    <FileInput style={{
                                        marginTop: '5px'
                                    }}
                                        text={sinputText.h5}
                                        onInputChange={(msg) => {
                                            ssetInputText({ ...sinputText, "h5": msg.target.files[0].name });
                                            ssetTmpInputFiles({ ...stmpInputFiles, "h5": msg.target.files[0] })
                                        }} />
                                </Label>
                            </div>
                        } />
                        <Tab id="H5AD" title="H5AD" panel={
                            <div className="row"
                            >
                                <Label className="row-input">
                                    <FileInput style={{
                                        marginTop: '5px'
                                    }}
                                        text={sinputText.h5}
                                        onInputChange={(msg) => {
                                            ssetInputText({ ...sinputText, "h5": msg.target.files[0].name });
                                            ssetTmpInputFiles({ ...stmpInputFiles, "h5": msg.target.files[0] })
                                        }} />
                                </Label>
                            </div>
                        } />
                    </Tabs>
                </div>
            </div>
        )
    }

    const get_input_ann = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>9</Tag>
                        <span className={showStepHelper == 9 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(9)}>
                            Approximate Nearest Neighbor ?
                        </span>
                    </H5>

                    <div className="row">
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 9 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(9)}>
                                    use ANN ?
                                </span>
                            </Text>
                            <Switch style={{ marginTop: '10px' }} large={true} checked={tmpInputParams["ann"]["approximate"]}
                                innerLabelChecked="yes" innerLabel="no"
                                onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "ann": { ...tmpInputParams["ann"], "approximate": e.target.checked } }) }} />
                        </Label>
                    </div>
                </div>
            </div>
        )
    }

    const get_input_batch_correction = () => {
        return (
            <div className="col">
                <div>
                    <H5><Tag round={true}>10</Tag>
                        <span className={showStepHelper == 10 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(10)}>
                            Batch Correction
                        </span>
                    </H5>


                    <div className="row">
                    <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 10 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(10)}>
                                    Method
                                </span>
                            </Text>
                            <HTMLSelect
                                onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "batch_correction": { ...tmpInputParams["batch_correction"], "method": e.target.value } }) }}
                                defaultValue={tmpInputParams["batch_correction"]["method"]}
                            >
                                <option value="mnn">MNN Correction</option>
                                <option value="regress">Regression</option>
                                <option value="none">No Correction</option>
                            </HTMLSelect>
                        </Label>
                        <Label className="row-input">
                            <Text className="text-100">
                                <span className={showStepHelper == 10 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                    onMouseEnter={() => setShowStepHelper(10)}>
                                    Number of neighbors
                                </span>
                            </Text>
                            <NumericInput
                                placeholder="15" value={tmpInputParams["batch_correction"]["num_neighbors"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "batch_correction": { ...tmpInputParams["batch_correction"], "num_neighbors": nval } }) }} />
                        </Label>
                    </div>
                </div>
            </div>
        )
    }

    const get_input_adt = () => {
        return (
            <div className="col">
                <div>
                    <H5>
                        <span className={showStepHelper == 20 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                            onMouseEnter={() => setShowStepHelper(20)}>
                            ADT Sepcific Parameters
                        </span>
                    </H5>
                    <div>
                        <H5><Tag round={true}>11</Tag>
                            <span className={showStepHelper == 11 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                onMouseEnter={() => setShowStepHelper(11)}>
                                ADT - Quality Control
                            </span>
                        </H5>
                        <div className="row">
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 11 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(11)}>
                                        Number of MADs
                                    </span>
                                </Text>
                                <NumericInput
                                    placeholder="3" value={tmpInputParams["adt_qualitycontrol"]["nmads"]}
                                    onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "adt_qualitycontrol": { ...tmpInputParams["adt_qualitycontrol"], "nmads": nval } }) }} />
                            </Label>
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 11 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(11)}>
                                        Minimum Detected Drop
                                    </span>
                                </Text>
                                <NumericInput
                                placeholder="0.1"
                                stepSize={0.01}
                                minorStepSize={0.01}
                                value={tmpInputParams["adt_qualitycontrol"]["min_detected_drop"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "adt_qualitycontrol": { ...tmpInputParams["adt_qualitycontrol"], "min_detected_drop": val } }) }} />
                            </Label>
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 11 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(11)}>
                                        Prefix for isotype controls.
                                    </span>
                                </Text>
                                <InputGroup
                                    leftIcon="filter"
                                    onChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "adt_qualitycontrol": { ...tmpInputParams["adt_qualitycontrol"], "igg_prefix": nval?.target?.value } }) }}
                                    placeholder="IgG"
                                    value={tmpInputParams["adt_qualitycontrol"]["igg_prefix"]}
                                />
                            </Label>
                        </div>
                    </div>
                    <div>
                        <H5><Tag round={true}>12</Tag>
                            <span className={showStepHelper == 12 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                onMouseEnter={() => setShowStepHelper(12)}>
                                ADT - Normalization
                            </span>
                        </H5>
                        <div className="row">
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 12 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(12)}>
                                        Number of PC's
                                    </span>
                                </Text>
                                <NumericInput
                                    placeholder="25" value={tmpInputParams["adt_normalization"]["num_pcs"]}
                                    onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "adt_normalization": { ...tmpInputParams["adt_normalization"], "num_pcs": nval } }) }} />
                            </Label>
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 12 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(12)}>
                                        Number of Clusters
                                    </span>
                                </Text>
                                <NumericInput
                                    placeholder="20" value={tmpInputParams["adt_normalization"]["num_clusters"]}
                                    onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "adt_normalization": { ...tmpInputParams["adt_normalization"], "num_clusters": nval } }) }} />
                            </Label>
                        </div>
                    </div>
                    <div>
                        <H5><Tag round={true}>13</Tag>
                            <span className={showStepHelper == 13 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                onMouseEnter={() => setShowStepHelper(13)}>
                                ADT - PCA
                            </span>
                        </H5>
                        <div className="row">
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 13 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(13)}>
                                        Number of PC's
                                    </span>
                                </Text>
                                <NumericInput
                                    placeholder="25" value={tmpInputParams["adt_pca"]["num_pcs"]}
                                    onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "adt_pca": { ...tmpInputParams["adt_pca"], "num_pcs": nval } }) }} />
                            </Label>
                        </div>
                    </div>
                    <div>
                        <H5><Tag round={true}>14</Tag>
                            <span className={showStepHelper == 14 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                onMouseEnter={() => setShowStepHelper(14)}>
                                Combined Embedding
                            </span>
                        </H5>
                        <div className="row">
                            <Label className="row-input">
                                <Text className="text-100">
                                    <span className={showStepHelper == 14 ? 'row-tooltip row-tooltip-highlight' : 'row-tooltip'}
                                        onMouseEnter={() => setShowStepHelper(14)}>
                                        Weights
                                    </span>
                                </Text>
                                RNA: <NumericInput
                                    placeholder="1" value={tmpInputParams["combined_embeddings"]["weights"]["RNA"]}
                                    onValueChange={(nval, val) => { 
                                        let gip = {...tmpInputParams};
                                        gip["combined_embeddings"]["weights"]["RNA"] = nval;
                                        setTmpInputParams(gip);
                                    }} />
                                ADT: <NumericInput
                                    placeholder="1" value={tmpInputParams["combined_embeddings"]["weights"]["ADT"]}
                                    onValueChange={(nval, val) => { 
                                        let gip = {...tmpInputParams};
                                        gip["combined_embeddings"]["weights"]["ADT"] = nval;
                                        setTmpInputParams(gip);
                                    }} />
                            </Label>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    function get_table_colname(idx) {
        let cname;
        switch (idx) {
            case 0:
                cname = "name";
                break;
            case 1:
                cname = "file";
                break;
            case 2:
                cname = "format";
                break;
            case 3:
                cname = "action";
                break;
            case 4:
                cname = "annotation";
                break;
            default:
                throw Error("Idx does not exist");
                break;
        }

        return cname;
    }

    function table_render_cell(rowIdx, colIdx) {
        let key = get_table_colname(colIdx);
        let row = tmpInputFiles[rowIdx];

        if (key === "name") {
            return (
                <EditableCell2
                    className="cell-top"
                    value={row[key] == null ? "" : row[key]}
                    onConfirm={(val) => {
                        let tmp = [...tmpInputFiles];
                        tmp[rowIdx][key] = val;
                        setTmpInputFiles(tmp);
                    }}
                />
            )
        } else if (key == "file") {
            let tname = ""
            if (row["format"] == "MatrixMarket") {
                if (row.mtx) {
                    tname += ` mtx: ${row.mtx.name} `;
                }

                if (row.genes) {
                    tname += ` genes: ${row.genes.name} `;
                }

                if (row.annotations) {
                    tname += ` annotations: ${row.annotations.name} `;
                }
            } else {
                tname += ` file: ${row.h5.name} `;
            }
            return (<Cell className="cell-top">{tname}</Cell>);
        } else if (key == "format") {
            return (<Cell className="cell-top">{row["format"]}</Cell>);
        } else if (key == "action") {
            return (<Cell><Button
                minimal={true}
                small={true}
                style={{
                    fontStyle: "italic",
                    color: "#D33D17",
                    fontSize: "12px"
                }}
                onClick={() => {
                    let tmp = [...tmpInputFiles];
                    tmp.splice(rowIdx - 1, 1);
                    setTmpInputFiles(tmp);

                    setTmpInputValid(false);
                    setPreInputFilesStatus(null);
                }}>remove</Button></Cell>)
        } else if (key == "annotation") {

            if (preInputFilesStatus && tmpInputFiles.length == 1) {

                if (preInputFilesStatus.annotations[row["name"]]) {
                    return (
                        <Cell>
                            <HTMLSelect
                                minimal={true}
                                onChange={(e) => {
                                    let tmp = [...tmpInputFiles];
                                    tmp[0]["batch"] = e.target.value;
                                    setTmpInputFiles(tmp);
                                }}
                                defaultValue={tmpInputFiles[0].batch ? tmpInputFiles[0].batch : "none"}
                            >
                                <option value="none">None</option>
                                {
                                    preInputFilesStatus && preInputFilesStatus?.annotations?.[row["name"]] ?
                                        preInputFilesStatus.annotations[row["name"]].map((x, i) => <option key={i} value={x}>{x}</option>) : "-"
                                }
                            </HTMLSelect>
                        </Cell>
                    )
                } else {
                    return (
                        <Cell className="cell-top">No annotations!</Cell>
                    )
                }
            } else {
                return (
                    <Cell className="cell-top">{preInputFilesStatus && preInputFilesStatus?.best_gene_fields?.[row["name"]]}</Cell>
                )
            }
        }
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
                                    {tabSelected === "new" && 
                                        <div className='row-input'>
                                            {showSection == "input" ?
                                                // tmpInputFiles.map((x, ix) => get_new_input_files(ix, x))
                                                // get_new_input_files(tmpInputFiles.length - 1,
                                                //     tmpInputFiles[tmpInputFiles.length - 1])
                                                get_inputs_import()
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
                                                        disabled={!stmpInputValid}
                                                        style={{
                                                            margin: "3px"
                                                        }}
                                                        onClick={(() => {
                                                            setTmpInputFiles([...tmpInputFiles, stmpInputFiles]);
                                                            setInputText([...inputText, sinputText]);
    
                                                            ssetInputText({
                                                                mtx: "Choose Matrix Market file",
                                                                genes: "Choose feature/gene file",
                                                                annotations: "Choose barcode/annotation file",
                                                            });
    
                                                            ssetTmpInputFiles({
                                                                "name": `dataset-${tmpInputFiles.length + 2}`,
                                                                "format": newImportFormat
                                                            });
    
                                                            setTmpInputValid(false);
                                                            setPreInputFilesStatus(null);
                                                        })}
                                                    >Add</Button>
                                                </div>
                                            }
    
                                            {
                                                showSection == "input" &&
                                                tmpInputFiles &&
                                                tmpInputFiles.length > 0 && 
                                                preInputFilesStatus && 
                                                preInputFilesStatus?.features &&
                                                <div>
                                                    <Label> Dataset contains:</Label>
                                                    <ul>
                                                        {Object.keys(preInputFilesStatus?.features).map((x,i) => {
                                                        return (
                                                            <li key={i}>
                                                                <p>
                                                                    <strong>Modality</strong> {x}, &nbsp; 
                                                                    <strong>Genes</strong>: {preInputFilesStatus?.features[x].common}
                                                                </p>
                                                            </li>
                                                            )
                                                        }
                                                    )}
                                                    </ul>
                                                </div>
                                            }
    
                                            {
                                                showSection == "input" &&
                                                tmpInputFiles &&
                                                tmpInputFiles.length > 0 &&
                                                preInputFilesStatus && 
                                                <div style={{
                                                    "height": ((tmpInputFiles.length + 1) * 40) + "px"
                                                }}>
                                                    <h4>Selected datasets:</h4>
                                                    {
                                                        preInputFilesStatus && tmpInputFiles.length == 1 ?
                                                            <>
                                                                {
                                                                    preInputFilesStatus.annotations && Object.keys(preInputFilesStatus.annotations).length == 1 ?
                                                                        <Table2
                                                                            numRows={tmpInputFiles.length}
                                                                            rowHeights={tmpInputFiles.map(() => 25)}
                                                                            selectionModes={"NONE"}
                                                                        >
                                                                            <Column key="name" intent="primary" name="name" cellRenderer={table_render_cell} />
                                                                            <Column key="files" name="files" cellRenderer={table_render_cell} />
                                                                            <Column key="format" name="format" cellRenderer={table_render_cell} />
                                                                            <Column key="action" name="action" cellRenderer={table_render_cell} />
                                                                            <Column key="batch" name="batch" cellRenderer={table_render_cell} />
                                                                        </Table2>
                                                                        :
                                                                        <>
                                                                            <Table2
                                                                                numRows={tmpInputFiles.length}
                                                                                rowHeights={tmpInputFiles.map(() => 25)}
                                                                                selectionModes={"NONE"}
                                                                            >
                                                                                <Column key="name" intent="primary" name="name" cellRenderer={table_render_cell} />
                                                                                <Column key="files" name="files" cellRenderer={table_render_cell} />
                                                                                <Column key="format" name="format" cellRenderer={table_render_cell} />
                                                                                <Column key="action" name="action" cellRenderer={table_render_cell} />
                                                                            </Table2>
                                                                            <p style={{
                                                                                paddingTop: "5px"
                                                                            }}>
                                                                                <strong>No annotations were found in this dataset</strong>
    
                                                                            </p>
                                                                        </>
                                                                }
                                                            </>
                                                            :
                                                            <>
                                                                <div>
                                                                    <Table2
                                                                        numRows={tmpInputFiles.length}
                                                                        rowHeights={tmpInputFiles.map(() => 25)}
                                                                        selectionModes={"NONE"}
                                                                    >
                                                                        <Column key="name" name="name" cellRenderer={table_render_cell} />
                                                                        <Column key="files" name="files" cellRenderer={table_render_cell} />
                                                                        <Column key="format" name="format" cellRenderer={table_render_cell} />
                                                                        <Column key="action" name="action" cellRenderer={table_render_cell} />
                                                                        <Column key="annotation" name="annotation fields" cellRenderer={table_render_cell} />
                                                                    </Table2>
                                                                </div>
                                                                <p style={{
                                                                    paddingTop: "5px"
                                                                }}>
                                                                    {preInputFilesStatus && preInputFilesStatus.common_genes && <span> These datasets contain
                                                                        <strong>{preInputFilesStatus.common_genes == 0 ? " no " : " " + preInputFilesStatus.common_genes + " "}</strong>
                                                                        common genes.</span>}
                                                                    <br />
                                                                    <strong>Note: when multiple files are imported, each dataset is considered a batch.</strong>
    
                                                                </p>
                                                            </>
                                                    }
                                                </div>
                                            }
    
                                            {showSection == "params" && get_input_qc()}
                                            {showSection == "params" && get_input_fsel()}
                                            {showSection == "params" && get_input_pca()}
                                            {showSection == "params" && get_input_clus()}
                                            {showSection == "params" && get_input_tsne()}
                                            {showSection == "params" && get_input_umap()}
                                            {showSection == "params" && get_input_label_cells()}
                                            {showSection == "params" && get_input_ann()}
                                            {
                                                showSection == "params" && (tmpInputFiles.length > 1 || (tmpInputFiles.length == 1 && (tmpInputFiles[0]?.batch && tmpInputFiles[0]?.batch.toLowerCase() != "none") || (preInputFilesStatus && Object.keys(preInputFilesStatus?.features).length > 1))
                                                    || (loadParams && loadParamsFor === loadImportFormat)) && get_input_batch_correction()
                                            }
                                            {showSection == "params" && 
                                                Object.keys(preInputFilesStatus?.features).length > 1
                                                && get_input_adt()}
                                        </div>
                                    }


                                    <div className="row-input-tooltips">
                                        {
                                            tmpInputFiles.length > 1 && (!tmpInputValid || !stmpInputValid) &&
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
                                                                    <FileInput text={inputText?.[0]?.file} onInputChange={(msg) => {
                                                                        let tmp = [...tmpInputFiles];
                                                                        tmp[0]["file"] = msg.target.files[0];
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

                                        {showSection === "params" && loadParams && loadParamsFor === loadImportFormat
                                            && tmpInputFiles?.file === inputFiles?.files?.file ?
                                            get_input_ann()
                                            : ""
                                        }

                                        {
                                            showSection == "params" && loadParams && loadParamsFor === loadImportFormat 
                                             && tmpInputFiles?.file === inputFiles?.files?.file ?
                                            get_input_batch_correction() : ""
                                        }

                                        {
                                            showSection == "params" && loadParams && loadParamsFor === loadImportFormat 
                                             && tmpInputFiles?.file === inputFiles?.files?.file ? 
                                            get_input_adt(): ""
                                        }
                                    </div>
                                    <div className='row-input-tooltips'>
                                        {
                                            tmpInputFiles.length > 0 && (!tmpInputValid) &&
                                            <Callout intent="danger"
                                                title="Incorrect file format"
                                                style={{
                                                    marginBottom: '10px'
                                                }}>
                                                    File must end with  <strong><code>*.kana</code></strong>
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
                                    <Button disabled={tabSelected == "new" ? !tmpInputValid || !preInputFilesStatus : tabSelected == "load" ? !tmpInputValid : false} icon="function" onClick={handleImport}>Analyze</Button>
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
