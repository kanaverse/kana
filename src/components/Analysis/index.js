import {
    Button, Classes, Dialog, Text, FileInput, NumericInput,
    Label, H5, Tag, Position, HTMLSelect, Switch
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
    const handleButtonClick = useCallback(() => setIsOpen(!isOpen), [isOpen]);
    const handleClose = useCallback(() => setIsOpen(false), []);
    const { inputFiles, setInputFiles,
        params, setParams, openInput } = useContext(AppContext);

    let [tmpInputFiles, setTmpInputFiles] = useState(inputFiles);
    let [tmpInputParams, setTmpInputParams] = useState(params);

    function handleImport() {
        setParams(tmpInputParams);
        setInputFiles(tmpInputFiles);
        handleClose();
    }

    const [inputText, setInputText] = useState({
        mtx: "Choose mtx file...",
        gene: "Choose gene file...",
        barcode: "Choose barcode file...",
    });

    useEffect(() => {
        openInput && setIsOpen(true);
    }, [openInput])

    return (
        <>
            <Button onClick={handleButtonClick} icon="social-media" intent="primary" text={buttonText} />
            <Dialog className="analysis-dialog" {...props} isOpen={isOpen} onClose={handleClose}>
                <div className={Classes.DIALOG_BODY + " inputs-container"}>
                    <div className="col row-input">
                        <div>
                            <H5><Tag round={true}>1</Tag> 
                                <Tooltip2
                                    className="row-tooltip"
                                    content="We currently support files in the Cellranger format - namely, a Matrix Market file containing the count matrix. We also recommend supplying the feature annotation (<code>features.tsv.gz</code> or <code>genes.tsv.gz</code>). Users may also provide a TSV file containing the barcode annotations, if any."
                                    position={Position.RIGHT}>
                                Load input files
                                </Tooltip2></H5>
                            <div className="row">
                                <Label className="row-input">
                                    <FileInput text="Choose Matrix Market file" onInputChange={(msg) => { setInputText({ ...inputText, "mtx": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "mtx": msg.target.files }) }} />
                                </Label>
                                <Label className="row-input">
                                    <FileInput text="Choose feature annotation" onInputChange={(msg) => { setInputText({ ...inputText, "gene": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "gene": msg.target.files }) }} />
                                </Label>
                                <Label className="row-input">
                                    <FileInput text="Choose barcode annotation" onInputChange={(msg) => { setInputText({ ...inputText, "barcode": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "barcode": msg.target.files }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H5><Tag round={true}>2</Tag>
                                <Tooltip2
                                    className="row-tooltip"
                                    content="At this step, we compute per-cell quality control (QC) metrics such as the total count per cell, the total number of detected features and (if the feature annotation is supplied) the mitochondrial proportion in each cell. We remove low-quality cells based on these metrics - specifically, cells with low total counts/number of detected features or high mitochondrial proportions are filtered out. We use an outlier-based approach to define the filter threshold under the assumption that most cells in the dataset are of acceptable quality."
                                    position={Position.RIGHT}>
                                    Quality control
                                </Tooltip2></H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2
                                            className="row-tooltip"
                                            content="Number of median absolute deviations (MADs) from the median, used to define a filter threshold in the appropriate direction for each QC metric. Increasing this value will reduce the stringency of the filtering."
                                            position={Position.RIGHT}>
                                            Number of MADs
                                        </Tooltip2>
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
                                <Tooltip2
                                    className="row-tooltip"
                                    content="Identify highly variable genes while accounting for the mean-variance relationship. We do so by fitting a mean-dependent trend to the variances, computed from the log-transformed normalized expression values. The residuals from the trend are then used to rank highly variable genes."
                                    position={Position.RIGHT}>
                                    Feature Selection
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="The span of the LOWESS smoother for fitting the mean-variance trend. Larger values increase the smoothness of the global trend at the cost of decreasing sensitivity to local variations." position={Position.RIGHT} openOnTargetFocus={false}>
                                           Lowess span 
                                        </Tooltip2>
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
                                <Tooltip2 className="row-tooltip" content="Perform a principal components analysis (PCA) to obtain per-cell coordinates in a low-dimensional space. This is used to compact the data for faster downstream computation, as well as to remove uninteresting high-dimensional noise." position={Position.RIGHT} openOnTargetFocus={false}>
                                    Principal components analysis
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Number of highly variable genes to use to perform the PCA. Larger values will capture more biological signal at the cost of increasing noise and computational work." position={Position.RIGHT} openOnTargetFocus={false}>
                                            Number of HVGs
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="2500" value={tmpInputParams["pca"]["pca-hvg"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "pca": { ...tmpInputParams["pca"], "pca-hvg": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Number of principal components with the highest variance to retain in downstream analyses. Larger values will capture more biological signal at the cost of increasing noise and computational work." position={Position.RIGHT} openOnTargetFocus={false}>
                                        Number of PCs
                                        </Tooltip2>
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
                                <Tooltip2 className="row-tooltip" content="Cluster cells into discrete groupings based on their relative similarity in the low-dimensional space. The set of clusters serve as a summary of the cellular heterogeneity in the population, allowing us to easily perform further characterization on subpopulations of interest." position={Position.RIGHT} openOnTargetFocus={false}>
                                    Clustering
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Clustering algorithm to use. Currently, we use multi-level community detection on an shared nearest neighbor (SNN) graph where cells are the nodes and edges are created between neighboring cells." position={Position.RIGHT} openOnTargetFocus={false}>
                                            Method
                                        </Tooltip2>
                                    </Text>
                                    <select style={{marginTop:"4px"}} defaultValue={tmpInputParams["cluster"]["clus-method"]}>
                                        <option>{tmpInputParams["cluster"]["clus-method"]}</option>
                                    </select>
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Number of neighbors to use to construct the shared nearest neighbor graph. Larger values result in broader clusters." position={Position.RIGHT} openOnTargetFocus={false}>
                                            Number of neighbors
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="10" value={tmpInputParams["cluster"]["clus-k"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-k": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Use an approximate method to speed up the nearest neighbor search. This sacrifices some accuracy for speed in larger datasets." position={Position.RIGHT} openOnTargetFocus={false}>
                                            Use ANN
                                        </Tooltip2>
                                    </Text>
                                    <Switch style={{marginTop:"4px"}}  checked={tmpInputParams["cluster"]["clus-approx"]} label="(toggle true/false)" onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-approx": e.target.checked } }) }} />
                                </Label>
                                
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Weighting scheme to use for the edges of the shared nearest neighbor graph. The Rank approach derives a weight from the rank of the closest shared neighbor; the Number approach uses the number of shared neighbors; and the Jaccard approach uses the Jaccard index of the neighbor sets." position={Position.RIGHT} openOnTargetFocus={false}>
                                            Weighting scheme
                                        </Tooltip2>
                                    </Text>
                                    <HTMLSelect onChange={(nval, val) => setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-scheme": parseInt(nval?.currentTarget?.value) } })}>
                                        <option key="0">Rank</option>
                                        <option key="1">Number</option>
                                        <option key="2">Jaccard</option>
                                    </HTMLSelect>
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Resolution parameter for the multi-level clustering, used to adjust the modularity calculation during community optimization. Larger values yield more fine-grained clusters." position={Position.RIGHT} openOnTargetFocus={false}>
                                            Resolution
                                        </Tooltip2>
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
                                <Tooltip2 className="row-tooltip" content="Create a t-SNE plot to visualize cells in two dimensions, because our feeble human minds cannot interpret high-dimensional spaces. Cells that were neighbors in the original space are kept close together in the 2D embedding, while dissimilar cells are placed (arbitrarily) far away." position={Position.RIGHT} openOnTargetFocus={false}>
                                    t-SNE
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Perplexity parameter, which determines the size of the neighborhood of each cell. Larger values will favor preservation of global structure in the 2D embedding." position={Position.RIGHT} openOnTargetFocus={false}>
                                        Perplexity
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="30" value={tmpInputParams["tsne"]["tsne-perp"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "tsne": { ...tmpInputParams["tsne"], "tsne-perp": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Number of t-SNE iterations. Doesn't usually have much of an effect if you leave it as it is." position={Position.RIGHT} openOnTargetFocus={false}>
                                        Iterations
                                        </Tooltip2>
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
                            <H5><Tag round={true}>6</Tag>
                                <Tooltip2 className="row-tooltip" content="Create a UMAP plot to visualize cells in two dimensions. Like the t-SNE, this aims to map cells from a high-dimensional space into a 2D embedding, where neighboring cells are kept close together and dissimilar cells are placed far apart." position={Position.RIGHT} openOnTargetFocus={false}>
                                    UMAP
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Number of neighbors to use when defining the size of the local neighborhood. Larger values will favor preservation of global structure." position={Position.RIGHT} openOnTargetFocus={false}>
                                        Number of neighbors
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="15" value={tmpInputParams["umap"]["umap-nn"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-nn": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                    <Tooltip2 className="row-tooltip" content="Minimum distance between points. Smaller values result in more tightly packed embedding and favor local structure." position={Position.RIGHT} openOnTargetFocus={false}>
                                    Minimum distance
                                    </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="0.01" value={tmpInputParams["umap"]["umap-min_dist"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-min_dist": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                    <Tooltip2 className="row-tooltip" content="Number of epochs to use for convergence. This doesn't really change all too much." position={Position.RIGHT} openOnTargetFocus={false}>
                                        Epochs 
                                    </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="500" value={tmpInputParams["umap"]["umap-epoch"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-epoch": nval } }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                </div>

                {includeFooter ? (
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Tooltip2 content="Run Analysis">
                                <Button icon="function" onClick={handleImport}>Analyze</Button>
                            </Tooltip2>
                        </div>
                    </div>
                ) : (
                    <div style={{ margin: "0 20px" }}>
                    </div>
                )}
            </Dialog>
        </>
    );
}



export default AnalysisDialog;
