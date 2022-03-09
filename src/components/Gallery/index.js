import React from "react";
import PCABarPlot from "../Plots/PCABarPlot";
import ClusterBarPlot from "../Plots/ClusterBarPlot";
import { useContext } from 'react';
import { AppContext } from './../../context/AppContext';
import { Card, Elevation } from "@blueprintjs/core";
import QCPlotMgr from "../Plots/QCPlotMgr";

import './Gallery.css';
import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';

import ImgPlot from "../Plots/ImgPlot";
import {Responsive, WidthProvider} from 'react-grid-layout';

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
        <ResponsiveReactGridLayout
          className="layout"
          layouts={layout}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        >

          {
            props?.qcData && props?.qcData?.["thresholds"] ?
              <div key="qc" className="gallery-elem" >
                <Card elevation={Elevation.ONE}>
                  <h5>QC Statistics</h5>
                  <QCPlotMgr title={datasetName.split(" ").join("_")} data={props?.qcData} />
                </Card>
              </div>

              : ""
          }
          {
            props?.pcaVarExp ?
              <div key="pca" className="gallery-elem">
                <Card elevation={Elevation.ONE}>
                  <h5>PCA (% variance explained)</h5>
                  <PCABarPlot title={datasetName.split(" ").join("_")} pca={props?.pcaVarExp} />
                </Card>
              </div>

              : ""
          }
          {
            props?.clusterData && props?.clusterColors ?
              <div key="cluster" className="gallery-elem">
                <Card elevation={Elevation.ONE}>
                  <h5># of cells per cluster</h5>
                  <ClusterBarPlot data={props?.clusterData} clusterColors={props?.clusterColors} />
                </Card>
              </div>

              : ""
          }
          {
            props?.savedPlot ?
              props?.savedPlot.map((x, i) => (
                <div key={i} className="gallery-elem">
                  <Card elevation={Elevation.ONE}>
                    <ImgPlot data={x} gene={props?.gene} />
                  </Card>
                </div>

              )
              ) : ""
          }
        </ResponsiveReactGridLayout>
      </div>
    </>
  );
};

export default React.memo(Gallery);
