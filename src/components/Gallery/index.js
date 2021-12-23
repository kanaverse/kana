import React from "react";
import PCABarPlot from "../Plots/PCABarPlot";
import ClusterBarPlot from "../Plots/ClusterBarPlot";
import { useContext } from 'react';
import { AppContext } from './../../context/AppContext';
import { Card, Elevation, Callout } from "@blueprintjs/core";
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
          <Stats />
        </Callout>
        {
          clusterData ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>Cells per Cluster</h5>
              <ClusterBarPlot data={clusterData} />
            </Card>
            : ""
        }
        {
          pcaVarExp ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>PCA (Variance explained by cluster)</h5>
              <PCABarPlot pca={pcaVarExp} />
            </Card>
            : ""
        }
        {
          qcData && qcData?.["thresholds"] ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5>QC Statistics</h5>
              <QCPlotMgr data={qcData}/>
            </Card>
            : ""
        }
      </div>
    </>
  );
};

export default Gallery;
