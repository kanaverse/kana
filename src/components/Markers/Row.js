import { Button, H4, Select, SelectProps, Collapse, Pre } from "@blueprintjs/core";
import { Virtuoso } from 'react-virtuoso';
import { useEffect, useContext, useState, useMemo } from 'react';

import './markers.css'
import { AppContext } from "../../context/AppContext";
import Histogram from "../Plots/Histogram";

const Row = (props) => {
    const { setGene, geneExprData } = useContext(AppContext);
    const [isOpen, setIsOpen] = useState(false);
    console.log(props.index);
    return (
        <>
            {/* <Row {...props} /> */}
            <div className='row-container'>
                <div>
                    <span>{props.row.gene}::</span>
                    <span>Mean: {props.row.mean} </span>
                    <span>Cohen: {props.row.cohen} </span>
                    <span>Detected: {props.row.detected} </span>
                </div>
                <div>
                    <Button
                        onClick={(x) => {
                            setIsOpen(!isOpen);
                            let gene = parseInt(props.row.gene.replace("Gene ", ''));
                            setGene(gene - 1);
                        }}
                        size="small"
                        outlined={true}
                        minimal={true}
                    >
                        Set Color</Button>
                </div>
            </div>
            <Collapse isOpen={isOpen}>
                <Histogram data={geneExprData} />
            </Collapse>
        </>
    );
}

export default Row;