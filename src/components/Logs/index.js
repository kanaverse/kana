import {
    Button,
    Classes,
    Drawer,
    Position,
} from "@blueprintjs/core";
import React, { useState } from 'react';

import "./logs.css";

const Logs = (props) => {

    const [state, setState] = useState({
        autoFocus: true,
        canEscapeKeyClose: true,
        canOutsideClickClose: true,
        enforceFocus: true,
        hasBackdrop: true,
        isOpen: false,
        position: Position.RIGHT,
        size: undefined,
        usePortal: true,
    });

    const handleOpen = () => setState({ isOpen: true });

    const handleClose = () => setState({ isOpen: false });

    return (
        <>
            <Button onClick={handleOpen} icon="wrench" outlined={true}
                intent="warning"></Button>
            <Drawer
                icon="info-sign"
                onClose={handleClose}
                title="What's happening ?"
                {...state}
            >
                <div className={Classes.DRAWER_BODY}>
                    <div className={Classes.DIALOG_BODY}>
                        <div className="logs-container">
                            {
                                props?.logs.map((x, i) => (
                                    <pre className={`logs-${x[0]}`} key={i}>{x[1]}</pre>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </Drawer>
        </>
    )
}

export default Logs;
