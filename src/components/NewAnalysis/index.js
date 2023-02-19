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

import { MatrixMarket } from "./MatrixMarketCard";
import { ExperimentHub } from "./ExperimentHubCard";
import { TenxHDF5 } from "./TenxHDF5Card";

export function NewAnalysis({ open, setOpen, ...props }) {
  // close the entire panel
  const handleClose = () => {
    setNewInputs([]);
    setInputOptions([]);
    setOpen(false);
  };

  const initTmpFile = () => {
    return {
      name: `Dataset-${newInputs.length + 2}`,
      format: tabSelected,
    };
  };

  // minimise info box on the right
  const [openInfo, setOpenInfo] = useState(true);

  // Access App Context
  const { ehubDatasets, setPreInputFiles, preInputFilesStatus, setInputFiles } =
    useContext(AppContext);

  // what tab was selected to identify format
  const [tabSelected, setTabSelected] = useState("ExperimentHub");

  // contains the full list of inputs
  const [newInputs, setNewInputs] = useState([]);

  // final inputs for confirmation with options
  const [inputOptions, setInputOptions] = useState([]);

  // contains the tmp list of inputs so we can discard if needed
  const [tmpNewInputs, setTmpNewInputs] = useState({
    name: `Dataset-1`,
    format: tabSelected,
  });

  // should i enable the add button?
  const [tmpStatusValid, setTmpStatusValid] = useState(false);

  const handleAddDataset = () => {
    tmpNewInputs["uid"] = generateUID(tmpNewInputs);

    setNewInputs([...newInputs, tmpNewInputs]);
    setOpenInfo(false);

    setPreInputFiles([...newInputs, tmpNewInputs]);

    // setTimeout(() => {
    setTmpNewInputs(initTmpFile());
    // }, 1000);
  };

  const handleRunAnalysis = () => {
    if (Array.isArray(newInputs) && Array.isArray(inputOptions)) {
      if (newInputs.length != inputOptions.length) {
        console.error("forgot to set options?");
      } else {
        let mapFiles = {};
        for (let i = 0; i < newInputs.length; i++) {
          let f = newInputs[i],
            o = inputOptions[i];

          mapFiles[f.name] = {
            ...f,
            options: o,
          };
        }

        let newInputFiles = { files: mapFiles };
        let mapkeys = Object.keys(mapFiles);
        if (mapkeys.length == 1) {
          let first = mapFiles[mapkeys[0]];
          if (first.batch == undefined || first.batch == "none") {
            newInputFiles.batch = null;
          } else {
            newInputFiles.batch = first.batch;
          }
        } else {
          newInputFiles.batch = null;
        }

        //   if (tmpInputParams.subset == undefined || tmpInputParams.subset.field == "none") {
        //     newInputFiles.subset = null;
        // } else {
        //     newInputFiles.subset = { field: tmpInputParams.subset.field };
        //     if ("values" in tmpInputParams.subset) {
        //         newInputFiles.subset.values = Array.from(tmpInputParams.subset.values);
        //     } else {
        //         newInputFiles.subset.ranges = [[tmpInputParams.subset.chosen_min, tmpInputParams.subset.chosen_max]];
        //     }
        // }
        newInputFiles.subset = null;
        setInputFiles(newInputFiles);
      }
    }
  };

  // making sure tmpNewInputs are valid as the user chooses datasets
  useEffect(() => {
    if (tmpNewInputs) {
      let all_valid = true;
      let x = tmpNewInputs;
      if (x.format === "MatrixMarket") {
        if (
          (x?.mtx &&
            !(
              x?.mtx.name.toLowerCase().endsWith("mtx") ||
              x?.mtx.name.toLowerCase().endsWith("mtx.gz")
            )) ||
          (x?.genes &&
            !(
              x?.genes.name.toLowerCase().endsWith("tsv") ||
              x?.genes.name.toLowerCase().endsWith("tsv.gz")
            )) ||
          (x?.annotations &&
            !(
              x?.annotations.name.toLowerCase().endsWith("tsv") ||
              x?.annotations.name.toLowerCase().endsWith("tsv.gz")
            ))
        ) {
          all_valid = false;
        }

        if (!x.mtx) all_valid = false;
      } else if (x.format === "10X") {
        if (
          x?.h5 &&
          !(
            x?.h5.name.toLowerCase().endsWith("hdf5") ||
            x?.h5.name.toLowerCase().endsWith("h5")
          )
        ) {
          all_valid = false;
        }

        if (!x.h5) all_valid = false;
      } else if (x.format === "H5AD") {
        if (x?.h5 && !x?.h5.name.toLowerCase().endsWith("h5ad")) {
          all_valid = false;
        }

        if (!x.h5) all_valid = false;
      } else if (x.format === "SummarizedExperiment") {
        if (x?.rds && !x?.rds.name.toLowerCase().endsWith("rds")) {
          all_valid = false;
        }

        if (!x.rds) all_valid = false;
      } else if (x.format === "ExperimentHub") {
        if (x?.id && !(ehubDatasets.indexOf(x?.id) !== -1)) {
          all_valid = false;
        }

        if (!x.id) all_valid = false;
      }

      setTmpStatusValid(all_valid);
    }
  }, [tmpNewInputs]);

  // send a preflight req out everytime a new dataset is added
  useEffect(() => {
    if (Array.isArray(newInputs) && newInputs.length > 0) {
      let mapFiles = {};
      for (const f of newInputs) {
        mapFiles[f.name] = f;
      }

      setPreInputFiles({
        files: mapFiles,
      });
    }
  }, [newInputs]);

  const render_inputs = () => {
    return (
      <Tabs
        animate={true}
        renderActiveTabPanelOnly={true}
        vertical={true}
        defaultSelectedTabId={tabSelected}
        onChange={(ntab, otab) => {
          let tmp = { ...tmpNewInputs };
          tmp["format"] = ntab;
          setTmpNewInputs(tmp);
          setTabSelected(ntab);
        }}
      >
        <Tab
          id="ExperimentHub"
          title="Experiment Hub"
          panel={
            <div className="row">
              <Label className="row-input">
                <Text className="text-100">
                  <span>Choose an ExperimentHub dataset</span>
                </Text>
                {Array.isArray(ehubDatasets) ? (
                  <HTMLSelect
                    defaultValue={"none"}
                    onChange={(e) => {
                      if (e.target.value && e.target.value !== "none") {
                        setTmpNewInputs({
                          ...tmpNewInputs,
                          id: e.target.value,
                        });
                      }
                    }}
                  >
                    <option value="none">None</option>
                    {ehubDatasets.map((x, i) => (
                      <option key={i} value={x}>
                        {x}
                      </option>
                    ))}
                  </HTMLSelect>
                ) : (
                  "No ExperimentHub datasets available"
                )}
              </Label>
            </div>
          }
        />
        <Tab
          id="MatrixMarket"
          title="Matrix Market"
          panel={
            <div className="row">
              <Label className="row-input">
                <Text className="text-100">
                  <span>Choose a count file</span>
                </Text>
                <FileInput
                  style={{
                    marginTop: "5px",
                  }}
                  text={
                    tmpNewInputs?.mtx
                      ? tmpNewInputs?.mtx.name
                      : ".mtx or .mtx.gz"
                  }
                  onInputChange={(msg) => {
                    if (msg.target.files) {
                      setTmpNewInputs({
                        ...tmpNewInputs,
                        mtx: msg.target.files[0],
                      });
                    }
                  }}
                />
              </Label>
              <Label className="row-input">
                <Text className="text-100">
                  <span>Choose a feature or gene file</span>
                </Text>
                <FileInput
                  style={{
                    marginTop: "5px",
                  }}
                  text={
                    tmpNewInputs?.genes
                      ? tmpNewInputs?.genes.name
                      : ".tsv or .tsv.gz"
                  }
                  onInputChange={(msg) => {
                    if (msg.target.files) {
                      setTmpNewInputs({
                        ...tmpNewInputs,
                        genes: msg.target.files[0],
                      });
                    }
                  }}
                />
              </Label>
              <Label className="row-input">
                <Text className="text-100">
                  <span>Choose an annotation or barcode file</span>
                </Text>
                <FileInput
                  style={{
                    marginTop: "5px",
                  }}
                  text={
                    tmpNewInputs?.annotations
                      ? tmpNewInputs?.annotations.name
                      : ".tsv or .tsv.gz"
                  }
                  onInputChange={(msg) => {
                    if (msg.target.files) {
                      setTmpNewInputs({
                        ...tmpNewInputs,
                        annotations: msg.target.files[0],
                      });
                    }
                  }}
                />
              </Label>
            </div>
          }
        />
        <Tab
          id="10X"
          title="10X HDF5 Matrix"
          panel={
            <div className="row">
              <Label className="row-input">
                <Text className="text-100">
                  <span>Choose a 10X HDF5 file</span>
                </Text>
                <FileInput
                  style={{
                    marginTop: "5px",
                  }}
                  text={
                    tmpNewInputs?.h5 ? tmpNewInputs?.h5.name : ".h5 or .hdf5"
                  }
                  onInputChange={(msg) => {
                    if (msg.target.files) {
                      setTmpNewInputs({
                        ...tmpNewInputs,
                        h5: msg.target.files[0],
                      });
                    }
                  }}
                />
              </Label>
            </div>
          }
        />
        <Tab
          id="H5AD"
          title="H5AD"
          panel={
            <div className="row">
              <Label className="row-input">
                <Text className="text-100">
                  <span>Choose a H5AD dataset</span>
                </Text>
                <FileInput
                  style={{
                    marginTop: "5px",
                  }}
                  text={tmpNewInputs?.h5 ? tmpNewInputs?.h5.name : ".h5ad"}
                  onInputChange={(msg) => {
                    if (msg.target.files) {
                      setTmpNewInputs({
                        ...tmpNewInputs,
                        h5: msg.target.files[0],
                      });
                    }
                  }}
                />
              </Label>
            </div>
          }
        />
        <Tab
          id="SummarizedExperiment"
          title="SummarizedExperiment (RDS)"
          panel={
            <div className="row">
              <Label className="row-input">
                <Text className="text-100">
                  <span>Choose an RDS File</span>
                </Text>
                <FileInput
                  style={{
                    marginTop: "5px",
                  }}
                  text={tmpNewInputs?.rds ? tmpNewInputs?.rds.name : ".rds"}
                  onInputChange={(msg) => {
                    if (msg.target.files) {
                      setTmpNewInputs({
                        ...tmpNewInputs,
                        rds: msg.target.files[0],
                      });
                    }
                  }}
                />
              </Label>
            </div>
          }
        />
      </Tabs>
    );
  };

  return (
    <Card className="section" interactive={false} elevation={Elevation.ZERO}>
      <div className="section-header">
        <H2 className="section-header-title">Start a New Analysis</H2>
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
            {/* <div className="section-footer">
              {openInfo && (
                <Button
                  outlined={true}
                  text="Hide Info"
                  onClick={() => setOpenInfo(false)}
                />
              )}
              {!openInfo && (
                <Button
                  outlined={true}
                  text="Show Info"
                  onClick={() => setOpenInfo(true)}
                />
              )}
            </div> */}
          </Callout>
          {newInputs && render_inputs()}
          <Button
            outlined={false}
            fill={true}
            intent="primary"
            icon="add"
            text="ADD DATASET"
            disabled={!tmpStatusValid}
            onClick={handleAddDataset}
          ></Button>
          {/* <Divider /> */}
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
          <div className="section-inputs">
            {newInputs.map((x, i) => {
              if (x.format == "ExperimentHub") {
                return (
                  <ExperimentHub
                    key={i}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={newInputs}
                    setInputs={setNewInputs}
                  />
                );
              } else if (x.format == "MatrixMarket") {
                return (
                  <MatrixMarket
                    key={i}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={newInputs}
                    setInputs={setNewInputs}
                  />
                );
              } else if (x.format == "10X") {
                return (
                  <TenxHDF5
                    key={i}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={newInputs}
                    setInputs={setNewInputs}
                  />
                );
              }
            })}
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
            onClick={handleClose}
          >
            Cancel
          </Button>
        </Tooltip2>
        <Tooltip2 content="Run Analysis" placement="right">
          <Button
            icon="function"
            onClick={handleRunAnalysis}
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