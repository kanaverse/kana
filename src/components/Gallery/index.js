import React from "react";
import PCABarPlot from "../Plots/PCABarPlot";
import ClusterBarPlot from "../Plots/ClusterBarPlot";
import CellLabelTable from "../Plots/CellLabelTable";

import { useContext } from 'react';
import { AppContext } from './../../context/AppContext';
import { Card, Elevation, Classes } from "@blueprintjs/core";
import QCPlotMgr from "../Plots/QCPlotMgr";

import './Gallery.css';
import ImgPlot from "../Plots/ImgPlot";

import { Popover2 } from "@blueprintjs/popover2";

const Gallery = (props) => {
  const { datasetName } = useContext(AppContext);

  return (
    <>
      <div className="gallery-cont">
        {
          props?.qcData && props?.qcData?.["thresholds"] ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>QC Statistics</h5>
              <QCPlotMgr title={datasetName.split(" ").join("_")} data={props?.qcData} />
            </Card>
            : ""
        }
        {
          props?.pcaVarExp ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>PCA (% variance explained)</h5>
              <PCABarPlot title={datasetName.split(" ").join("_")} pca={props?.pcaVarExp} />
            </Card>
            : ""
        }
        {
          props?.clusterData && props?.clusterColors ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5># of cells per cluster</h5>
              <ClusterBarPlot data={props?.clusterData} clusterColors={props?.clusterColors} />
            </Card>
            : ""
        }
        {
          props?.cellLabelData && Object.keys(props?.cellLabelData?.per_reference).length > 0 ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>
                <Popover2
                  popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                  hasBackdrop={false}
                  interactionKind="hover"
                  placement='auto'
                  hoverOpenDelay={50}
                  modifiers={{
                    arrow: { enabled: true },
                    flip: { enabled: true },
                    preventOverflow: { enabled: true },
                  }}
                  content={
                    <Card style={{
                      width: '450px'
                    }} elevation={Elevation.ZERO}>
                      <p>
                        Perform cell type annotation for human and mouse datasets.
                        This uses the <a target="_blank" href="https://bioconductor.org/packages/release/bioc/html/SingleR.html">SingleR</a> algorithm
                        to label clusters based on their similarity to reference expression profiles of curated cell types.
                        Similarity is quantified using Spearman correlations on the top marker genes for each reference type,
                        with additional fine-tuning iterations to improve resolution between closely related labels.
                      </p>
                      <p>
                        <strong>Best match</strong>:
                        Classification of the clusters is performed separately for each chosen reference reference.
                        If multiple references are selected, an additional round of scoring is performed to determine which reference has the best label for each cluster.
                      </p>
                    </Card>
                  }>
                  <span style={{
                    textDecoration: "underline",
                    cursor: "help"
                  }}>
                    Cell Labels
                  </span>
                </Popover2>
                <span style={{
                  fontStyle: "italic",
                  color: "#2B95D6",
                  fontWeight: "bold"
                }}> (best match)</span></h5>
              <CellLabelTable data={props?.cellLabelData} />
            </Card>
            : ""
        }
        {
          props?.savedPlot ?
            props?.savedPlot.map((x, i) => (
              <Card key={i} className="gallery-elem" elevation={Elevation.ONE}>
                <ImgPlot data={x} gene={props?.gene} />
              </Card>
            )
            ) : ""
        }
      </div>
    </>
  );
};

export default React.memo(Gallery);
