import React from "react";
import BarPlot from "../Plots/PCABarPlot";
import ClusterBarPlot from "../Plots/ClusterBarPlot";
import { useState, useEffect, useContext } from 'react';
import { AppContext } from './../../context/AppContext';
import { Button, Card, Elevation, Callout, Code, H5 } from "@blueprintjs/core";
import QCPlotMgr from "../Plots/QCPlotMgr";
import Stats from '../Stats';

import './Gallery.css';

const Gallery = () => {
  const { pcaVarExp, qcData, clusterData } = useContext(AppContext);

  return (
    <>
      <div className="gallery-cont">
        <Callout className="gallery-text" title="Analysis results">
          This sections shows visualizations to explore the performance
          or metrics at each step of the analysis. <br />
          <Code><Stats /></Code>
        </Callout>
        {
          qcData ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>QC Statistics</h5>
              <QCPlotMgr />
            </Card>
            : ""
        }
        {
          pcaVarExp ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>PCA (Variance explained by cluster)</h5>
              <BarPlot pca={pcaVarExp} />
            </Card>
            : ""
        }
        {
          clusterData ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>Cells per Cluster</h5>
              <ClusterBarPlot data={clusterData} />
            </Card>
            : ""
        }
      </div>
    </>
  );
};

export default Gallery;
