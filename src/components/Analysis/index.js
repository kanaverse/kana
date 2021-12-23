import {
    Button, Classes, Dialog, Text, FileInput, NumericInput,
    Label, H5, Tag, Position, HTMLSelect, Switch
} from "@blueprintjs/core";
import { Tooltip2, Popover2 } from "@blueprintjs/popover2";
import React, { useContext, useState, useCallback } from "react";

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
        params, setParams } = useContext(AppContext);

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

    return (
        <>
            <Button onClick={handleButtonClick} icon="social-media" intent="primary" text={buttonText} />
            <Dialog className="analysis-dialog" {...props} isOpen={isOpen} onClose={handleClose}>
                <div className={Classes.DIALOG_BODY + " inputs-container"}>
                    <div className="col row-input">
                        <div>
                            <H5><Tag round={true}>1</Tag> Import Single-cell
                                <Tooltip2
                                    className="row-tooltip"
                                    content="We currently support cellRanger outputs"
                                    position={Position.RIGHT}>
                                    RNA-seq dataset
                                </Tooltip2></H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">Choose mtx file</Text>
                                    {/* <br /> */}
                                    <FileInput text={inputText?.mtx} onInputChange={(msg) => { setInputText({ ...inputText, "mtx": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "mtx": msg.target.files }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Choose gene file</Text>
                                    {/* <br /> */}
                                    <FileInput text={inputText?.gene} onInputChange={(msg) => { setInputText({ ...inputText, "gene": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "gene": msg.target.files }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Choose barcode file</Text>
                                    {/* <br /> */}
                                    <FileInput text={inputText?.barcode} onInputChange={(msg) => { setInputText({ ...inputText, "barcode": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "barcode": msg.target.files }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H5><Tag round={true}>2</Tag>
                                <Tooltip2
                                    className="row-tooltip"
                                    content="Generate per cell QC metrics and filter cells"
                                    position={Position.RIGHT}>
                                    QC
                                </Tooltip2></H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2
                                            className="row-tooltip"
                                            content="Number of MADs from the median, to use for defining outliers.(defaults to 3)"
                                            position={Position.RIGHT}>
                                            NMADS
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
                                    content="Model the variance of the log-expression values for each gene, accounting for the mean-variance trend"
                                    position={Position.RIGHT}>
                                    Feature Selection
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="The span of the LOWESS smoother for fitting the mean-variance trend.(defaults to 0.3)" position={Position.RIGHT} openOnTargetFocus={false}>
                                            Span factor
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
                                <Tooltip2 className="row-tooltip" content="Perform a principal components analysis to obtain per-cell coordinates in low-dimensional space" position={Position.RIGHT} openOnTargetFocus={false}>
                                    PCA
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100"># of PC's (defaults to 5)</Text>
                                    <NumericInput
                                        placeholder="5" value={tmpInputParams["pca"]["pca-npc"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "pca": { ...tmpInputParams["pca"], "pca-npc": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Highly Variable Genes (defaults to 4000)" position={Position.RIGHT} openOnTargetFocus={false}>
                                            # of HVG's
                                        </Tooltip2>

                                    </Text>
                                    <NumericInput
                                        placeholder="4000" value={tmpInputParams["pca"]["pca-hvg"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "pca": { ...tmpInputParams["pca"], "pca-hvg": nval } }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H5><Tag round={true}>5</Tag>
                                <Tooltip2 className="row-tooltip" content="Generate SNN graph and cluster cells" position={Position.RIGHT} openOnTargetFocus={false}>
                                    Graph Clustering
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Number of neighbors to use to construct the nearest neighbor graph.(defaults to 10)" position={Position.RIGHT} openOnTargetFocus={false}>
                                            # of neighbors
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="10" value={tmpInputParams["cluster"]["clus-k"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-k": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="0 for approx, 1 ..., 2 for jaccard index" position={Position.RIGHT} openOnTargetFocus={false}>
                                            Scheme
                                        </Tooltip2>
                                    </Text>
                                    <HTMLSelect onChange={(nval, val) => setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-scheme": parseInt(nval?.currentTarget?.value) } })}>
                                        <option key="0">0</option>
                                        <option key="1">1</option>
                                        <option key="2">2</option>
                                    </HTMLSelect>
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Resolution of the multi-level clustering, used in the modularity calculation.Larger values yield more fine-grained clusters.(defaults to 0.5)" position={Position.RIGHT} openOnTargetFocus={false}>
                                            Resolution
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="0.5" value={tmpInputParams["cluster"]["clus-res"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-res": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Approximate Nearest Neighbor ?" position={Position.RIGHT} openOnTargetFocus={false}>
                                            Use ANN ?
                                        </Tooltip2>
                                    </Text>
                                    <Switch style={{marginTop:"4px"}}  checked={tmpInputParams["cluster"]["clus-approx"]} label="(toggle true/false)" onChange={(e) => { setTmpInputParams({ ...tmpInputParams, "cluster": { ...tmpInputParams["cluster"], "clus-approx": e.target.checked } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">
                                        <Tooltip2 className="row-tooltip" content="Graph Clustering Algorithm to use (currently only supports snn_graph)" position={Position.RIGHT} openOnTargetFocus={false}>
                                            Method
                                        </Tooltip2>
                                    </Text>
                                    <select style={{marginTop:"4px"}} defaultValue={tmpInputParams["cluster"]["clus-method"]}>
                                        <option>{tmpInputParams["cluster"]["clus-method"]}</option>
                                    </select>
                                    
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H5><Tag round={true}>6</Tag>
                                <Tooltip2 className="row-tooltip" content="Compute t-SNE embeddings and Visualize cells" position={Position.RIGHT} openOnTargetFocus={false}>
                                    t-SNE
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">Iterations (defaults to 500)</Text>
                                    <NumericInput
                                        placeholder="500" value={tmpInputParams["tsne"]["tsne-iter"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "tsne": { ...tmpInputParams["tsne"], "tsne-iter": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Perplexity (defaults to 30)</Text>
                                    <NumericInput
                                        placeholder="30" value={tmpInputParams["tsne"]["tsne-perp"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "tsne": { ...tmpInputParams["tsne"], "tsne-perp": nval } }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H5><Tag round={true}>6</Tag>
                                <Tooltip2 className="row-tooltip" content="Compute UMAP embeddings and Visualize cells" position={Position.RIGHT} openOnTargetFocus={false}>
                                    UMAP
                                </Tooltip2>
                            </H5>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">Num of Neighbors (defaults to 15)</Text>
                                    <NumericInput
                                        placeholder="15" value={tmpInputParams["umap"]["umap-nn"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-nn": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Epochs (defaults to 500)</Text>
                                    <NumericInput
                                        placeholder="500" value={tmpInputParams["umap"]["umap-epoch"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-epoch": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Min Distance (defaults to 0.01)</Text>
                                    <NumericInput
                                        placeholder="0.01" value={tmpInputParams["umap"]["umap-min_dist"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { ...tmpInputParams["umap"], "umap-min_dist": nval } }) }} />
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