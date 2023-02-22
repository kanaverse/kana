// import { useState, useCallback, useContext, useEffect } from "react";

// import {
//   Label,
//   Text,
//   HTMLSelect,
//   Card,
//   Elevation,
//   Button,
//   Divider,
//   Callout,
//   H2,
//   Collapse,
//   H5,
//   InputGroup,
//   Switch,
//   NumericInput,
//   Checkbox,
// } from "@blueprintjs/core";
// import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";
// import { ResizeEntry, ResizeSensor } from "@blueprintjs/core";

// import "./index.css";

// import { AppContext } from "../../context/AppContext";

// import DimPlot from "../Plots/DimPlot";

// import SplitPane from "react-split-pane";

// export function AnnResults() {
//   const [windowWidth, setWindowWidth] = useState(0);

//   const handleResize = () => {
//     setWindowWidth(window.innerWidth);
//   };

//   useEffect(() => {}, []);
//   return (
//     <ResizeSensor onResize={handleResize}>
//       <SplitPane
//         defaultSize="80%"
//         split={windowWidth >= 900 ? "vertical" : "horizontal"}
//       >
//         <SplitPane
//           defaultSize="30%"
//           minSize={200}
//           split="vertical"
//           primary="second"
//         >
//           <div className="results-dims">
//             <DimPlot
//               className={"effect-opacitygrayscale"}
//               tsneData={tsneData}
//               umapData={umapData}
//               animateData={animateData}
//               redDims={redDims}
//               defaultRedDims={defaultRedDims}
//               setDefaultRedDims={setDefaultRedDims}
//               showAnimation={showAnimation}
//               setShowAnimation={setShowAnimation}
//               setTriggerAnimation={setTriggerAnimation}
//               selectedClusterSummary={selectedClusterSummary}
//               setSelectedClusterSummary={setSelectedClusterSummary}
//               selectedClusterIndex={selectedClusterIndex}
//               selectedCluster={selectedCluster}
//               savedPlot={savedPlot}
//               setSavedPlot={setSavedPlot}
//               clusterData={clusterData}
//               customSelection={customSelection}
//               setCustomSelection={setCustomSelection}
//               setGene={setGene}
//               gene={gene}
//               clusterColors={clusterColors}
//               setClusterColors={setClusterColors}
//               setDelCustomSelection={setDelCustomSelection}
//               setReqAnnotation={setReqAnnotation}
//               selectedPoints={selectedPoints}
//               setSelectedPoints={setSelectedPoints}
//               restoreState={restoreState}
//               setRestoreState={setRestoreState}
//               setHighlightPoints={setHighlightPoints}
//               clusHighlight={clusHighlight}
//               setClusHighlight={setClusHighlight}
//               clusHighlightLabel={clusHighlightLabel}
//               setClusHighlightLabel={setClusHighlightLabel}
//               colorByAnnotation={colorByAnnotation}
//               setColorByAnnotation={setColorByAnnotation}
//               selectedModality={selectedModality}
//             />
//           </div>
//           <div className="results-markers">
//             <MarkerPlot
//               selectedClusterSummary={selectedClusterSummary}
//               setSelectedClusterSummary={setSelectedClusterSummary}
//               selectedClusterIndex={selectedClusterIndex}
//               selectedCluster={selectedCluster}
//               setSelectedCluster={setSelectedCluster}
//               selectedVSCluster={selectedVSCluster}
//               setSelectedVSCluster={setSelectedVSCluster}
//               setClusterRank={setClusterRank}
//               clusterData={clusterData}
//               customSelection={customSelection}
//               setGene={setGene}
//               gene={gene}
//               clusterColors={clusterColors}
//               setReqGene={setReqGene}
//               modality={modality}
//               selectedModality={selectedModality}
//               setSelectedModality={setSelectedModality}
//             />
//           </div>
//         </SplitPane>
//         <div className="results-gallery">
//           <Gallery
//             qcData={qcData}
//             pcaVarExp={pcaVarExp}
//             savedPlot={savedPlot}
//             setSavedPlot={setSavedPlot}
//             clusterData={clusterData}
//             clusterColors={clusterColors}
//             cellLabelData={cellLabelData}
//             gene={gene}
//             showQCLoader={showQCLoader}
//             showPCALoader={showPCALoader}
//             showNClusLoader={showNClusLoader}
//             showCellLabelLoader={showCellLabelLoader}
//             tsneData={tsneData}
//             umapData={umapData}
//             redDims={redDims}
//             selectedPoints={selectedPoints}
//             setSelectedPoints={setSelectedPoints}
//             restoreState={restoreState}
//             setRestoreState={setRestoreState}
//             highlightPoints={highlightPoints}
//             clusHighlight={clusHighlight}
//             clusHighlightLabel={clusHighlightLabel}
//             setClusHighlight={setClusHighlight}
//             colorByAnnotation={colorByAnnotation}
//           />
//         </div>
//       </SplitPane>
//     </ResizeSensor>
//   );
// }
