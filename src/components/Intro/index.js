import {
    Button, Classes, Dialog, H5, Card, Elevation
} from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import React, { useContext, useState, useCallback } from "react";

import { AppContext } from "../../context/AppContext";

function IntroDialog({
    buttonText,
    includeFooter,
    ...props
}) {
    const { setOpenInput } = useContext(AppContext);

    const [isOpen, setIsOpen] = useState(true);
    const [showClose, setShowClose] = useState(false);

    const handleButtonClick = useCallback(() => {
        setIsOpen(!isOpen);
        setShowClose(true);
    }, [isOpen]);
    const handleClose = useCallback(() => setIsOpen(false), []);

    const handleInputs = () => {
        setOpenInput(true);
        handleClose();
    }

    return (
        <>
            <Button onClick={handleButtonClick} icon="info-sign" intent="primary" text="Info" />
            <Dialog {...props} isOpen={isOpen} onClose={handleClose}>
                <div className={Classes.DIALOG_BODY}>
                    <p>
                        This app does amazing things, you should try it out, copying things from the README
                    </p>
                    <Card elevation={Elevation.ZERO}>
                        <H5>Overview</H5>
                        <p>SCRAN.js is built on top of react and allows users to interactively analyze and explore single-cell RNA-seq (scRNA-seq)
                            datasets in the browser. The app uses our underlying scran.js WASM library to efficiently perform various steps
                            of the workflow parallely using Web Workers, thus speeding up interactive analysis and exploration.</p>
                        <ul>
                            <li>Explore QC Metrics (sums, detected and proportion)</li>
                            <li>Perform log-normalization and model gene mean-variance relationships</li>
                            <li>Compute PC's & explore variance explained by each PC</li>
                            <li>Construct a Nearest Neighbor search index</li>
                            <li>Perform Graph Clustering to identify clusters</li>
                            <li>Compute t-SNE and UMAP embeddings (these are spun off in parallel using web workers)</li>
                        </ul>
                        <Button icon="git-repo">SCRAN.JS.app</Button><span> </span><Button icon="git-repo">SCRAN.JS</Button>
                    </Card>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        {
                            showClose ? <Button icon="cross" onClick={handleClose}>Close</Button>
                                :
                                <Tooltip2 content="(「行くぞ) lets go">
                                    <Button icon="bring-data" onClick={handleInputs}>Ikuzo</Button>
                                </Tooltip2>
                        }
                    </div>
                </div>
            </Dialog>
        </>
    );
}



export default IntroDialog;