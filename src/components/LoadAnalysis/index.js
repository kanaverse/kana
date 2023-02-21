import { useState, useCallback, useContext, useEffect } from "react";

import {
  Tabs,
  Tab,
  Classes,
  Drawer,
  Label,
  Text,
  HTMLSelect,
  FileInput,
  Icon,
  Card,
  Elevation,
  Button,
  Divider,
  Callout,
  Code,
  H2,
  Collapse,
  Tag,
  OverflowList,
  H5,
  H6,
  FormGroup,
  InputGroup,
  EditableText,
  ButtonGroup,
} from "@blueprintjs/core";

import "./index.css";

import { AppContext } from "../../context/AppContext";

import { generateUID } from "../../utils/utils";
import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";

import { MODALITIES } from "../../utils/utils";

export function LoadAnalysis({ open, setOpen, openIndex, ...props }) {
  const handleClose = () => setOpen(false);

  // minimise info box on the right
  const [openInfo, setOpenInfo] = useState(true);
  
  // const get_input_qc = () => {
  //   return (
  //     <div className="col">
  //       <div>
  //         <H5 className="section-title">
  //           <span
  //             className={
  //               showStepHelper == 2
  //                 ? "row-tooltip row-tooltip-highlight"
  //                 : "row-tooltip"
  //             }
  //             onMouseEnter={() => setShowStepHelper(2)}
  //           >
  //             Quality control (RNA)
  //           </span>
  //         </H5>
  //         <div className="row">
  //           <Label className="row-input">
  //             <Text className="text-100">
  //               <span
  //                 className={
  //                   showStepHelper == 2
  //                     ? "row-tooltip row-tooltip-highlight"
  //                     : "row-tooltip"
  //                 }
  //                 onMouseEnter={() => setShowStepHelper(2)}
  //               >
  //                 Skip
  //               </span>
  //             </Text>
  //             <Switch
  //               style={{ marginTop: "10px" }}
  //               large={true}
  //               checked={tmpInputParams["qc"]["skip"]}
  //               innerLabelChecked="yes"
  //               innerLabel="no"
  //               onChange={(e) => {
  //                 setTmpInputParams({
  //                   ...tmpInputParams,
  //                   qc: { ...tmpInputParams["qc"], skip: e.target.checked },
  //                 });
  //               }}
  //             />
  //           </Label>
  //           {tmpInputParams?.qc?.skip !== true && (
  //             <>
  //               <Label className="row-input">
  //                 <Text className="text-100">
  //                   <span
  //                     className={
  //                       showStepHelper == 2
  //                         ? "row-tooltip row-tooltip-highlight"
  //                         : "row-tooltip"
  //                     }
  //                     onMouseEnter={() => setShowStepHelper(2)}
  //                   >
  //                     Number of MADs
  //                   </span>
  //                 </Text>
  //                 <NumericInput
  //                   placeholder="3"
  //                   value={tmpInputParams["qc"]["qc-nmads"]}
  //                   onValueChange={(nval, val) => {
  //                     setTmpInputParams({
  //                       ...tmpInputParams,
  //                       qc: { ...tmpInputParams["qc"], "qc-nmads": nval },
  //                     });
  //                   }}
  //                 />
  //               </Label>
  //               <Label className="row-input">
  //                 <Text className="text-100">
  //                   <span
  //                     className={
  //                       showStepHelper == 2
  //                         ? "row-tooltip row-tooltip-highlight"
  //                         : "row-tooltip"
  //                     }
  //                     onMouseEnter={() => setShowStepHelper(2)}
  //                   >
  //                     Use default mitochondrial list ?
  //                   </span>
  //                 </Text>
  //                 <Switch
  //                   style={{ marginTop: "10px" }}
  //                   large={true}
  //                   checked={tmpInputParams["qc"]["qc-usemitodefault"]}
  //                   innerLabelChecked="yes"
  //                   innerLabel="no"
  //                   onChange={(e) => {
  //                     setTmpInputParams({
  //                       ...tmpInputParams,
  //                       qc: {
  //                         ...tmpInputParams["qc"],
  //                         "qc-usemitodefault": e.target.checked,
  //                       },
  //                     });
  //                   }}
  //                 />
  //               </Label>
  //               {!tmpInputParams["qc"]["qc-usemitodefault"] && (
  //                 <Label className="row-input">
  //                   <Text className="text-100">
  //                     <span
  //                       className={
  //                         showStepHelper == 2
  //                           ? "row-tooltip row-tooltip-highlight"
  //                           : "row-tooltip"
  //                       }
  //                       onMouseEnter={() => setShowStepHelper(2)}
  //                     >
  //                       Mitochondrial gene prefix
  //                     </span>
  //                   </Text>
  //                   <InputGroup
  //                     leftIcon="filter"
  //                     onChange={(nval, val) => {
  //                       setTmpInputParams({
  //                         ...tmpInputParams,
  //                         qc: {
  //                           ...tmpInputParams["qc"],
  //                           "qc-mito": nval?.target?.value,
  //                         },
  //                       });
  //                     }}
  //                     placeholder="mt-"
  //                     value={tmpInputParams["qc"]["qc-mito"]}
  //                   />
  //                 </Label>
  //               )}
  //             </>
  //           )}
  //         </div>
  //       </div>
  //     </div>
  //   );
  // };

  return (
    <Card className="section" interactive={false} elevation={Elevation.ZERO}>
      <div className="section-header">
        <H2 className="section-header-title">Analysis Parameters</H2>
      </div>
      <Divider />
      <div className="section-content">
        <div className="section-content-body">
          <Callout icon="airplane">
            <p>
              <strong> Import your dataset to get started. </strong>We currently
              support several common file formats for single-cell RNA-seq count
              data.
            </p>

            <p>
              <strong>Batch correction:</strong> You can import more than one
              dataset to integrate and analyze datasets. If you only import a
              single dataset, specify the annotation column that contains the
              batch information.
            </p>

            <p>
              <strong>
                <i>
                  To quickly explore the features Kana provides, choose an
                  ExperimentHub dataset.
                </i>
              </strong>
            </p>
          </Callout>
        </div>
        <div className="section-info">
          <div>
            {openInfo && (
              <Button
                outlined={true}
                fill={true}
                intent="warning"
                text="Hide Info"
                onClick={() => setOpenInfo(false)}
              />
            )}
            {!openInfo && (
              <Button
                outlined={true}
                fill={true}
                intent="warning"
                text="Show Info"
                onClick={() => setOpenInfo(true)}
              />
            )}
            <Collapse isOpen={openInfo}>
              <Callout intent="primary">
                <p>Data formats we currently support -</p>
                <p>
                  <strong>
                    A count matrix in the Matrix Market (<Code>*.mtx</Code>)
                    format.{" "}
                  </strong>
                  This file may be Gzip-compressed, in which case we expect it
                  to have a <Code>*.mtx.gz</Code> extension. We assume that the
                  matrix has already been filtered to remove empty droplets. We
                  also recommend supplying the feature annotation as an
                  additional TSV file with gene identifiers and symbols - this
                  is usually called <Code>features.tsv.gz</Code> or{" "}
                  <Code>genes.tsv</Code> in the output of processing pipelines
                  like Cellranger.
                </p>
                <p>
                  <strong>
                    A count matrix in the 10X HDF5 feature-barCode matrix
                    format.{" "}
                  </strong>
                  We assume that the matrix has already been filtered to remove
                  empty droplets. This is usually called something like{" "}
                  <Code>filtered_feature_bc_matrix.h5</Code> in the output of
                  processing pipelines like Cellranger. (See{" "}
                  <strong>
                    <a
                      target="_blank"
                      href="https://support.10xgenomics.com/single-cell-gene-expression/software/pipelines/latest/advanced/h5_matrices"
                    >
                      here
                    </a>
                  </strong>{" "}
                  for details. Do not confuse this with the molecule information
                  file, which is something different altogether.)
                </p>
                <p>
                  <strong>
                    A count matrix in the H5AD (<Code>*.h5ad</Code>) format.{" "}
                  </strong>
                  We assume that the count matrix is stored in the{" "}
                  <Code>X</Code> group. We will also try to guess which field in
                  the <Code>obs</Code> annotation contains gene symbols.
                </p>

                <p>
                  <strong>
                    A SummarizedExperiment object saved in the RDS (
                    <Code>*.rds</Code>) format.{" "}
                  </strong>
                  We support any SummarizedExperiment subclass containing a
                  dense or sparse count matrix (identified as any assay with
                  name starting with "counts", or if none exist, just the first
                  assay). For a SingleCellExperiment, any alternative experiment
                  with name starting with "hto", "adt" or "antibody" is assumed
                  to represent CITE-seq data.
                </p>

                <p>
                  <strong>
                    A Dataset saved to <Code>ExperimentHub</Code>.{" "}
                  </strong>
                  We support any SummarizedExperiment subclass containing a
                  dense or sparse count matrix (identified as any assay with
                  name starting with "counts", or if none exist, just the first
                  assay). For a SingleCellExperiment, any alternative experiment
                  with name starting with "hto", "adt" or "antibody" is assumed
                  to represent CITE-seq data.
                </p>
              </Callout>
            </Collapse>
          </div>
        </div>
      </div>
      <Divider />
      <div className="section-footer">
        <Tooltip2 content="Cancel Analysis" placement="left">
          <Button
            icon="cross"
            intent={"warning"}
            large={true}
            // onClick={handleClose}
          >
            Cancel
          </Button>
        </Tooltip2>
        <Tooltip2 content="Run Analysis" placement="right">
          <Button
            icon="function"
            // onClick={handleRunAnalysis}
            intent={"primary"}
            large={true}
          >
            Analyze
          </Button>
        </Tooltip2>
      </div>
    </Card>
  );
}