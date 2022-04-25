import React from "react";
import PCABarPlot from "../Plots/PCABarPlot";
import ClusterBarPlot from "../Plots/ClusterBarPlot";
import CellLabelTable from "../Plots/CellLabelTable";

import { useContext } from 'react';
import { AppContext } from './../../context/AppContext';
import { Card, Elevation, Classes } from "@blueprintjs/core";
import QCPlotMgr from "../Plots/QCPlotMgr";

import { isObject } from "../../context/utils.js";

import './Gallery.css';
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';

import ImgPlot from "../Plots/ImgPlot";
import {Responsive, WidthProvider} from 'react-grid-layout';

import { Popover2 } from "@blueprintjs/popover2";

const Gallery = (props) => {
  const { datasetName } = useContext(AppContext);
  const ResponsiveReactGridLayout = WidthProvider(Responsive);

  const layout = {
    lg: [
      { i: "qc", x: 0, y: 0, w: 6.3, h: 2, minW:6.3, minH:2},
      { i: "pca", x: 6.4, y: 0, w: 4, h: 2, minW: 4, minH:2},
      { i: "cluster", x: 0, y: 3, w: 4, h: 2, minW: 4, minH:2 }
    ]
  };

  return (
    <>
      <div className="gallery-cont">
        {
          props?.qcData && isObject(props?.qcData?.data) ?
            Object.keys(props?.qcData?.data).map((x) => {
              let tqc = {
                "data": props?.qcData?.data[x],
                "ranges": props?.qcData?.ranges[x],
                "thresholds": props?.qcData?.thresholds[x]
              };
              return (
                <Card key={x} className={props?.showQCLoader ? "gallery-elem effect-opacitygrayscale" : "gallery-elem"} elevation={Elevation.ONE}>
                  <h5>QC for {x}</h5>
                  <QCPlotMgr title={x} data={tqc} />
                </Card>
              )
            })
            : ""
        }
        {
          props?.pcaVarExp ?
            <Card className={props?.showPCALoader ? "gallery-elem effect-opacitygrayscale" : "gallery-elem"} elevation={Elevation.ONE}>
              <h5>PCA (% variance explained)</h5>
              <PCABarPlot title={datasetName.split(" ").join("_")} pca={props?.pcaVarExp} />
            </Card>
            : ""
        }
        {
          props?.clusterData && props?.clusterColors ?
            <Card className={props?.showNClusLoader ? "gallery-elem effect-opacitygrayscale" : "gallery-elem"} elevation={Elevation.ONE}>
              <h5># of cells per cluster</h5>
              <ClusterBarPlot data={props?.clusterData} clusterColors={props?.clusterColors} />
            </Card>
            : ""
        }
        {
          props?.cellLabelData && Object.keys(props?.cellLabelData?.per_reference).length > 0 ?
            <Card className={props?.showCellLabelLoader ? "gallery-elem effect-opacitygrayscale" : "gallery-elem"} elevation={Elevation.ONE}>
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
