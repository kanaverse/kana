import React from "react";
import PCABarPlot from "../Plots/PCABarPlot";
import ClusterBarPlot from "../Plots/ClusterBarPlot";
import { useContext } from 'react';
import { AppContext } from './../../context/AppContext';
import { Card, Elevation } from "@blueprintjs/core";
import QCPlotMgr from "../Plots/QCPlotMgr";

import './Gallery.css';
import ImgPlot from "../Plots/ImgPlot";

const Gallery = (props) => {
  const { clusterData, datasetName } = useContext(AppContext);

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
          clusterData ?
            <Card className="gallery-elem" elevation={Elevation.ONE}>
              <h5># of cells per cluster</h5>
              <ClusterBarPlot data={clusterData} />
            </Card>
            : ""
        }
        {
          props?.savedPlot ?
            props?.savedPlot.map((x, i) => (
              <Card key={i} className="gallery-elem" elevation={Elevation.ONE}>
                <ImgPlot data={x} />
              </Card>
            )
            ) : ""
        }
      </div>
    </>
  );
};

export default React.memo(Gallery);
