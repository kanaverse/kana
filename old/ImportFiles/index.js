import { Button, Classes, Dialog, FormGroup, FileInput } from "@blueprintjs/core";
import { Tooltip2 } from "@blueprintjs/popover2";
import { useContext, useState, useCallback } from "react";

import { AppContext } from "../../context/AppContext";

function ImportFilesDialog({
    buttonText,
    includeFooter,
    ...props
}) {
    const [isOpen, setIsOpen] = useState(false);
    const handleButtonClick = useCallback(() => setIsOpen(!isOpen), []);
    const handleClose = useCallback(() => setIsOpen(false), []);
    const { inputFiles, setInputFiles } = useContext(AppContext);

    let [tmpInputFiles, setTmpInputFiles] = useState(inputFiles);

    const [inputText, setInputText] = useState({
        mtx: "Choose mtx file...",
        gene: "Choose gene file...",
        barcode: "Choose barcode file...",
    });
    
    function handleImport() {
        handleClose();
        setInputFiles(tmpInputFiles);
    }

    return (
        <>
            <Button onClick={handleButtonClick} text={buttonText} />
            <Dialog {...props} isOpen={isOpen} onClose={handleClose}>
                <div className={Classes.DIALOG_BODY}>
                    <FormGroup
                        helperText="Import Single cell dataset (mtx, gene and barcode file)"
                        inline={true}
                        label="Import Files"
                        labelInfo="(required)"
                    >
                        <FileInput text={inputText?.mtx} onInputChange={(msg) => { setInputText({ ...inputText, ["mtx"]: msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, ["mtx"]: msg.target.files }) }} />
                        <FileInput text={inputText?.gene} onInputChange={(msg) => { setInputText({ ...inputText, ["gene"]: msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, ["gene"]: msg.target.files }) }} />
                        <FileInput text={inputText?.barcode} onInputChange={(msg) => { setInputText({ ...inputText, ["barcode"]: msg.target.files[0].name }); setTmpInputFiles({ ...tmpInputFiles, ["barcode"]: msg.target.files }) }} />
                    </FormGroup>
                </div>
                {includeFooter ? (
                    <div className={Classes.DIALOG_FOOTER}>
                        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                            <Tooltip2 content="Import Files into the app">
                                <Button onClick={handleImport}>Import Dataset</Button>
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



export default ImportFilesDialog;