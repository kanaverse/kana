import React from "react";
import './CellLabelTable.css';

const CellLabelTable = (props) => {
    return (
        <div className="table-container">
            <table>
                <tr>
                    <td></td>
                    {
                        Object.keys(props?.data?.per_reference).map(x => <th key={x} scope="col">{x}</th>)
                    }
                </tr>
                {
                    props?.data?.per_reference[Object.keys(props?.data?.per_reference)[0]].map((x, i) => {
                        return (
                            <tr key={i} >
                                <th scope="row">Cluster {i + 1}</th>
                                {
                                    Object.keys(props?.data?.per_reference).map((y, j) => <td key={j} className={Array.isArray(props?.data?.integrated) && props?.data?.integrated[i] === y ? "td-highlight" : ""}>{props?.data?.per_reference[y][i]}</td>)
                                }
                            </tr>
                        )
                    })
                }
            </table>
        </div>
    );
};

export default React.memo(CellLabelTable);