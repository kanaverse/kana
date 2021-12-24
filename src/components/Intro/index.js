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
                    <Card elevation={Elevation.ZERO}>
                        <p><strong>haggis</strong> performs a standard scRNA-seq data analysis directly inside the browser.
                        With just a few clicks, you can get a UMAP/t-SNE and marker genes in an intuitive interface for further exploration. 
                        No need to transfer data, no need to install software, no need to configure a backend server - 
                        just point to a Matrix Market file and we'll analyze <em>your</em> data on <em>your</em> computer, no questions asked.
                        </p>
                        <p>Check out our <a href="https://github.com/jkanche/scran.js.app" target="_blank">GitHub page</a> for more details.
                        Or you could just play around with the app to see what it can do - after all, it's totally free!
                        </p>
                        <H5>Authors</H5>
                        Jayaram Kancherla (<a href="https://github.com/jkanche" target="_blank"><strong>@jkanche</strong></a>),
                        Aaron Lun (<a href="https://github.com/LTLA" target="_blank"><strong>@LTLA</strong></a>)
                    </Card>
                </div>
                <div className={Classes.DIALOG_FOOTER}>
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        {
                            showClose ? <Button icon="cross" onClick={handleClose}>Close</Button>
                                : 
                                <Tooltip2 content="行くぞ!">
                                    <Button icon="bring-data" onClick={handleInputs}>Get started</Button>
                                </Tooltip2>
                        }
                    </div>
                </div>
            </Dialog>
        </>
    );
}



export default IntroDialog;
