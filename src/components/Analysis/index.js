import { Button, Classes, Dialog, Text, FileInput, NumericInput, 
    Label, H4, Tag, Icon, Position, HTMLSelect } from "@blueprintjs/core";
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
    const handleButtonClick = useCallback(() => setIsOpen(!isOpen), []);
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

    const [popover2State] = React.useState({
        inheritDarkTheme: true,
        interactionKind: "hover",
        modifiers: {
            arrow: { enabled: true },
            flip: { enabled: true },
            preventOverflow: { enabled: true },
        },
        placement: "auto",
        usePortal: true,
      });

    return (
        <>
            <Button onClick={handleButtonClick} icon="social-media" intent="primary" text={buttonText} />
            <Dialog className="analysis-dialog" {...props} isOpen={isOpen} onClose={handleClose}>
                <div className={Classes.DIALOG_BODY}>
                    <div className="col">
                        <div>
                            <H4><Tag large={true} round={true}>1</Tag> Import Single cell dataset</H4>
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
                            <H4><Tag large={true} round={true}>2</Tag> QC: Generate per cell QC metrics and filter cells</H4>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">NMADS
                                        <Tooltip2 className="row-tooltip" content="Number of MADs from the median, to use for defining outliers.(defaults to 3)" position={Position.RIGHT} openOnTargetFocus={false}>
                                            <Icon icon="help"></Icon>
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="3" value={tmpInputParams["qc"]["qc-nmads"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "qc": { "qc-nmads": nval } }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H4><Tag large={true} round={true}>3</Tag> Feature Selection: Model the variance of the log-expression values for each gene, accounting for the mean-variance trend</H4>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">Span factor
                                        <Tooltip2 className="row-tooltip" content="The span of the LOWESS smoother for fitting the mean-variance trend.(defaults to 0.3)" position={Position.RIGHT} openOnTargetFocus={false}>
                                            <Icon icon="help"></Icon>
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="0.3" value={tmpInputParams["fSelection"]["fsel-span"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "fSelection": { "fsel-span": nval } }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H4><Tag large={true} round={true}>4</Tag> PCA: Perform a principal components analysis to obtain per-cell coordinates in low-dimensional space</H4>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100"># of PCs (defaults to 5)</Text>
                                    <NumericInput
                                        placeholder="5" value={tmpInputParams["pca"]["pca-npc"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "pca": { "pca-npc": nval } }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H4><Tag large={true} round={true}>5</Tag> Cluster Analysis: Generate SNN graph and cluster cells</H4>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100"># of neighbors
                                        <Tooltip2 className="row-tooltip" content="Number of neighbors to use to construct the nearest neighbor graph.(defaults to 10)" position={Position.RIGHT} openOnTargetFocus={false}>
                                            <Icon icon="help"></Icon>
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="10" value={tmpInputParams["cluster"]["clus-k"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { "clus-k": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Scheme
                                        <Tooltip2 className="row-tooltip" content="0 for approx, 1 ..., 2 for jaccard index" position={Position.RIGHT} openOnTargetFocus={false}>
                                            <Icon icon="help"></Icon>
                                        </Tooltip2>
                                    </Text>
                                    <HTMLSelect onChange={(nval, val) => setTmpInputParams({...tmpInputParams, "cluster": { "clus-scheme": parseInt(nval?.currentTarget?.value) }})}>
                                        <option key="0">0</option>
                                        <option key="1">1</option>
                                        <option key="2">2</option>
                                    </HTMLSelect>
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Resolution
                                        <Tooltip2 className="row-tooltip" content="Resolution of the multi-level clustering, used in the modularity calculation.Larger values yield more fine-grained clusters.(defaults to 0.5)" position={Position.RIGHT} openOnTargetFocus={false}>
                                            <Icon icon="help"></Icon>
                                        </Tooltip2>
                                    </Text>
                                    <NumericInput
                                        placeholder="0.5" value={tmpInputParams["cluster"]["clus-res"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { "clus-res": nval } }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H4><Tag large={true} round={true}>6</Tag> t-SNE: Compute t-SNE embeddings and Visualize cells</H4>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">Iterations (defaults to 500)</Text>
                                    <NumericInput
                                        placeholder="500" value={tmpInputParams["tsne"]["tsne-iter"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "tsne": { "tsne-iter": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Perplexity (defaults to 30)</Text>
                                    <NumericInput
                                        placeholder="30" value={tmpInputParams["tsne"]["tsne-perp"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "tsne": { "tsne-perp": nval } }) }} />
                                </Label>
                            </div>
                        </div>
                    </div>

                    <div className="col">
                        <div>
                            <H4><Tag large={true} round={true}>6</Tag> UMAP: Compute UMAP embeddings and Visualize cells</H4>
                            <div className="row">
                                <Label className="row-input">
                                    <Text className="text-100">Num of Neighbors (defaults to 15)</Text>
                                    <NumericInput
                                        placeholder="15" value={tmpInputParams["umap"]["umap-nn"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { "umap-nn": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Epochs (defaults to 500)</Text>
                                    <NumericInput
                                        placeholder="500" value={tmpInputParams["umap"]["umap-epoch"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { "umap-epoch": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Min Distance (defaults to 0.01)</Text>
                                    <NumericInput
                                        placeholder="0.01" value={tmpInputParams["umap"]["umap-min_dist"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { "umap-min_dist": nval } }) }} />
                                </Label>
                                <Label className="row-input">
                                    <Text className="text-100">Use Approximate Neighbor Search ? (true for fast UMAP calculation))</Text>
                                    <NumericInput
                                        placeholder="0.01" value={tmpInputParams["umap"]["umap-approx_nn"]}
                                        onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "umap": { "umap-approx_nn": nval } }) }} />
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