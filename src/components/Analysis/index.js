import { Button, Classes, Dialog, FormGroup, FileInput, NumericInput } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import { useContext, useState, useCallback } from "react";

import { AppContext } from "../../context/AppContext";

function AnalysisDialog({
    buttonText,
    includeFooter,
    ...props
}) {
    const [isOpen, setIsOpen] = useState(false);
    const handleButtonClick = useCallback(() => setIsOpen(!isOpen), []);
    const handleClose = useCallback(() => setIsOpen(false), []);
    const { inputFiles, setInputFiles, 
        params, setParams  } = useContext(AppContext);

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
            <Button onClick={handleButtonClick} text={buttonText} />
            <Dialog {...props} isOpen={isOpen} onClose={handleClose}>
                <div className={Classes.DIALOG_BODY}>
                    <div>
                        <FormGroup
                            helperText="Import Single cell dataset (mtx, gene and barcode file)"
                            inline={true}
                            label="Import Files"
                            labelInfo="(required)"
                        >
                            <FileInput text={inputText?.mtx} onInputChange={(msg) => { setInputText({ ...inputText, "mtx": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "mtx": msg.target.files }) }} />
                            <FileInput text={inputText?.gene} onInputChange={(msg) => { setInputText({ ...inputText, "gene": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "gene": msg.target.files }) }} />
                            <FileInput text={inputText?.barcode} onInputChange={(msg) => { setInputText({ ...inputText, "barcode": msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, "barcode": msg.target.files }) }} />
                        </FormGroup>
                    </div>
                    <div>
                        <FormGroup
                            helperText="Generate per cell QC metrics and filter cells"
                            label="QC"
                        // labelInfo="Generate per cell QC metrics and filter cells"
                        >
                            <NumericInput label="NMADS: Number of MADs from the median, to use for defining outliers. (defaults to 3)"
                                placeholder="3" value={tmpInputParams["qc"]["qc-nmads"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "qc": { "qc-nmads": nval } }) }} />
                        </FormGroup>
                        <FormGroup
                            helperText="Model the variance of the log-expression values for each gene, accounting for the mean-variance trend."
                            label="Feature Selection"
                        // labelInfo="Generate per cell QC metrics and filter cells"
                        >
                            <NumericInput label="Span factor: The span of the LOWESS smoother for fitting the mean-variance trend. (defaults to 0.3)"
                                placeholder="0.3" value={tmpInputParams["fSelection"]["fsel-span"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "fSelection": { "fsel-span": nval } }) }} />
                        </FormGroup>
                        <FormGroup
                            helperText="Perform a principal components analysis to obtain per-cell coordinates in low-dimensional space."
                            label="PCA"
                        // labelInfo="Generate per cell QC metrics and filter cells"
                        >
                            <NumericInput label="Choose # of PCs (defaults to 5)"
                                placeholder="5" value={tmpInputParams["pca"]["pca-npc"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "pca": { "pca-npc": nval } }) }} />
                        </FormGroup>
                        <FormGroup
                            helperText="Generate SNN graph and cluster cells"
                            label="Cluster Analysis"
                        // labelInfo="Generate per cell QC metrics and filter cells"
                        >
                            <NumericInput label="Number of neighbors to use to construct the nearest neighbor graph. (defaults to 10)"
                                placeholder="10" value={tmpInputParams["cluster"]["clus-k"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { "clus-k": nval } }) }} />
                            <NumericInput label="Resolution of the multi-level clustering, used in the modularity calculation. Larger values yield more fine-grained clusters. (defaults to 0.5)"
                                placeholder="0.5" value={tmpInputParams["cluster"]["clus-res"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "cluster": { "clus-res": nval } }) }} />
                        </FormGroup>
                        <FormGroup
                            helperText="Compute t-SNE embeddings and Visualize cells"
                            label="t-SNE"
                        // labelInfo="Generate per cell QC metrics and filter cells"
                        >
                            <NumericInput label="Choose Iterations (defaults to 500)"
                                placeholder="500" value={tmpInputParams["tsne"]["tsne-iter"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "tsne": { "tsne-iter": nval } }) }} />
                            <NumericInput label="Choose Perplexity (defaults to 30)"
                                placeholder="30" value={tmpInputParams["tsne"]["tsne-perp"]}
                                onValueChange={(nval, val) => { setTmpInputParams({ ...tmpInputParams, "tsne": { "tsne-perp": nval } }) }} />
                        </FormGroup>
                    </div>
                </div>
                {includeFooter ? (
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Tooltip2 content="Import Files and Run Analysis">
                                <Button onClick={handleImport}>Analyze</Button>
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