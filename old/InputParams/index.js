import { Button, Classes, Dialog, FormGroup, NumericInput } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import { useContext, useState, useCallback } from "react";

import { AppContext } from "../../context/AppContext";

function InputParamsDialog({
    buttonText,
    includeFooter,
    ...props
}) {
    const [isOpen, setIsOpen] = useState(false);
    const handleButtonClick = useCallback(() => setIsOpen(!isOpen), []);
    const handleClose = useCallback(() => setIsOpen(false), []);
    const { params, setParams } = useContext(AppContext);

    let [tmpInputParams, setTmpInputParams] = useState(params);

    function handleSave() {
        handleClose();
        setParams(tmpInputParams);
    }

    return (
        <>
            <Button onClick={handleButtonClick} text={buttonText} />
            <Dialog {...props} isOpen={isOpen} onClose={handleClose}>
                <div className={Classes.DIALOG_BODY}>
                    <FormGroup
                        helperText="Generate per cell QC metrics and filter cells"
                        label="QC"
                        inline={true}
                    // labelInfo="Generate per cell QC metrics and filter cells"
                    >
                        <NumericInput label="NMADS: Number of MADs from the median, to use for defining outliers. (defaults to 3)"
                            placeholder="3" value={tmpInputParams["qc"]["qc-nmads"]}
                            onValueChange={(_v, val) => { setTmpInputParams({ ...tmpInputParams, ["qc"]: { ["qc-nmads"]: val } }) }} />
                    </FormGroup>
                    <FormGroup
                        helperText="Model the variance of the log-expression values for each gene, accounting for the mean-variance trend."
                        label="Feature Selection"
                        inline={true}
                    // labelInfo="Generate per cell QC metrics and filter cells"
                    >
                        <NumericInput label="Span factor: The span of the LOWESS smoother for fitting the mean-variance trend. (defaults to 0.3)"
                            placeholder="0.3" value={tmpInputParams["fSelection"]["fsel-span"]}
                            onValueChange={(_v, val) => { setTmpInputParams({ ...tmpInputParams, ["fSelection"]: { ["fsel-span"]: val } }) }} />
                    </FormGroup>
                    <FormGroup
                        helperText="Perform a principal components analysis to obtain per-cell coordinates in low-dimensional space."
                        label="PCA"
                        inline={true}
                    // labelInfo="Generate per cell QC metrics and filter cells"
                    >
                        <NumericInput label="Choose # of PCs (defaults to 5)"
                            placeholder="5" value={tmpInputParams["pca"]["pca-npc"]}
                            onValueChange={(_v, val) => { setTmpInputParams({ ...tmpInputParams, ["pca"]: { ["pca-npc"]: val } }) }} />
                    </FormGroup>
                    <FormGroup
                        helperText="Generate SNN graph and cluster cells"
                        label="Cluster Analysis"
                        inline={true}
                    // labelInfo="Generate per cell QC metrics and filter cells"
                    >
                        <NumericInput label="Number of neighbors to use to construct the nearest neighbor graph. (defaults to 10)"
                            placeholder="10" value={tmpInputParams["cluster"]["clus-k"]}
                            onValueChange={(_v, val) => { setTmpInputParams({ ...tmpInputParams, ["cluster"]: { ["clus-k"]: val } }) }} />
                        <NumericInput label="Resolution of the multi-level clustering, used in the modularity calculation. Larger values yield more fine-grained clusters. (defaults to 0.5)"
                            placeholder="0.5" value={tmpInputParams["cluster"]["clus-res"]}
                            onValueChange={(_v, val) => { setTmpInputParams({ ...tmpInputParams, ["cluster"]: { ["clus-res"]: val } }) }} />
                    </FormGroup>
                    <FormGroup
                        helperText="Compute t-SNE embeddings and Visualize cells"
                        label="t-SNE"
                        inline={true}
                    // labelInfo="Generate per cell QC metrics and filter cells"
                    >
                        <NumericInput label="Choose Iterations (defaults to 500)"
                            placeholder="500" value={tmpInputParams["tsne"]["tsne-iter"]}
                            onValueChange={(_v, val) => { setTmpInputParams({ ...tmpInputParams, ["tsne"]: { ["tsne-iter"]: val } }) }} />
                        <NumericInput label="Choose Perplexity (defaults to 30)"
                            placeholder="30" value={tmpInputParams["tsne"]["tsne-perp"]}
                            onValueChange={(_v, val) => { setTmpInputParams({ ...tmpInputParams, ["tsne"]: { ["tsne-perp"]: val } }) }} />
                    </FormGroup>
                </div>
                {includeFooter ? (
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Tooltip2 content="This button is hooked up to close the dialog.">
                                <Button onClick={handleSave}>Save</Button>
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

export default InputParamsDialog;