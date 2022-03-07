import React from "react";
import './CellLabelTable.css';

const CellLabelTable = (props) => {
    return (
        <div className="table-container">
            <table>
                <tr>
                    <td></td>
                    {/* <th scope="col">CLUSTERS</th> */}
                    {
                        Object.keys(props?.data).map(x => <th scope="col">{x}</th>)
                    }
                </tr>
                {
                    props?.data[Object.keys(props?.data)].map((x, i) => {
                        return (
                            <tr>
                                <th scope="row">Cluster {i + 1}</th>
                                {
                                    Object.keys(props?.data).map(y => <td style={{ fontStyle: 'italic' }}>{props?.data[y][i]}</td>)
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