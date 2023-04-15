import { useState, useContext, useEffect } from "react";

import {
  Tabs,
  Tab,
  Label,
  Text,
  HTMLSelect,
  FileInput,
  Card,
  Elevation,
  Button,
  Divider,
  Callout,
  Code,
  H2,
  Collapse,
  Checkbox,
  NumericInput,
  Tag,
  H5,
  Switch,
} from "@blueprintjs/core";
import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";
import { ItemRenderer, MultiSelect2 } from "@blueprintjs/select";

import "./index.css";

import { AppContext } from "../../context/AppContext";

import { generateUID } from "../../utils/utils";
import { v4 as uuidv4 } from "uuid";

import { MatrixMarket } from "./MatrixMarketCard";
import { ExperimentHub } from "./ExperimentHubCard";
import { TenxHDF5 } from "./TenxHDF5Card";

import { code } from "../../utils/utils";
import { H5AD } from "./H5ADCard";
import { RDSSE } from "./RDSSECard";

export function NewAnalysis({ setShowPanel, setStateIndeterminate, ...props }) {
  // close the entire panel
  const handleClose = () => {
    setTmpFiles([]);
    setInputOptions([]);

    setPreInputOptionsStatus(null);
    setPreInputFilesStatus(null);

    setEhubSel("none");

    setOpenInfo(true);
  };

  const initTmpFile = () => {
    return {
      name: uuidv4(),
      format: tabSelected,
    };
  };

  // minimise info box on the right
  const [openInfo, setOpenInfo] = useState(true);

  // default ehub dataset selection
  const [ehubSel, setEhubSel] = useState("none");

  // Access App Context
  const {
    ehubDatasets,
    setPreInputFiles,
    preInputFilesStatus,
    setPreInputOptions,
    preInputOptionsStatus,
    setInputFiles,
    setPreInputOptionsStatus,
    setPreInputFilesStatus,
    tmpFiles,
    setTmpFiles,
  } = useContext(AppContext);

  // what tab was selected to identify format
  const [tabSelected, setTabSelected] = useState("ExperimentHub");

  // contains the full list of inputs
  // const [newInputs, setNewInputs] = useState([]);

  // contains batch selection
  const [batch, setBatch] = useState(null);

  // contains subset selection
  const [subset, setSubset] = useState({
    subset: null,
  });

  // final inputs for confirmation with options
  const [inputOptions, setInputOptions] = useState([]);

  // contains the tmp list of inputs so we can discard if needed
  const [tmpNewInputs, setTmpNewInputs] = useState({
    name: uuidv4(),
    format: tabSelected,
  });

  // should i enable the add button?
  const [tmpStatusValid, setTmpStatusValid] = useState(null);

  // show batch field?
  const [showBatch, setShowBatch] = useState(false);

  // show subset field?
  const [showSubset, setShowSubset] = useState(false);

  // default code for none
  const default_none = `${code}::none`;

  const handleAddDataset = () => {
    tmpNewInputs["uid"] = generateUID(tmpNewInputs);

    setTmpFiles([...tmpFiles, tmpNewInputs]);
    setOpenInfo(false);

    setEhubSel("none");

    setTmpNewInputs(initTmpFile());
  };

  const handleRunAnalysis = () => {
    if (Array.isArray(tmpFiles) && Array.isArray(inputOptions)) {
      if (tmpFiles.length != inputOptions.length) {
        console.error("forgot to set options?");
      } else {
        let mapFiles = {};
        for (let i = 0; i < tmpFiles.length; i++) {
          let f = tmpFiles[i],
            o = inputOptions[i];

          mapFiles[f.name] = {
            ...f,
            options: o,
          };
        }

        let fInputFiles = { files: mapFiles };

        if (!(batch === "none" || batch === null)) {
          fInputFiles["batch"] = batch;
        } else {
          fInputFiles["batch"] = null;
        }

        if (!(subset["subset"] === "none" || subset["subset"] === null)) {
          fInputFiles["subset"] = {
            field: subset["subset"],
          };

          if ("values" in subset) {
            fInputFiles.subset.values = Array.from(subset.values);
          } else {
            fInputFiles.subset.ranges = [subset.chosen_minmax];
          }
        } else {
          fInputFiles["subset"] = null;
        }

        setInputFiles(fInputFiles);

        setShowPanel("results");
      }
    }
  };

  const handleRunAndParams = () => {
    if (Array.isArray(tmpFiles) && Array.isArray(inputOptions)) {
      if (tmpFiles.length != inputOptions.length) {
        console.error("forgot to set options?");
      } else {
        setStateIndeterminate(true);

        let mapFiles = {};
        for (let i = 0; i < tmpFiles.length; i++) {
          let f = tmpFiles[i],
            o = inputOptions[i];

          mapFiles[f.name] = {
            ...f,
            options: o,
          };
        }

        let fInputFiles = { files: mapFiles };

        if (!(batch === "none" || batch === null)) {
          fInputFiles["batch"] = batch;
        } else {
          fInputFiles["batch"] = null;
        }

        if (!(subset["subset"] === "none" || subset["subset"] === null)) {
          fInputFiles["subset"] = {
            field: subset["subset"],
          };

          if ("values" in subset) {
            fInputFiles.subset.values = Array.from(subset.values);
          } else {
            fInputFiles.subset.ranges = [subset.chosen_minmax];
          }
        } else {
          fInputFiles["subset"] = null;
        }

        setInputFiles(fInputFiles);
        setShowPanel("params");
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
    if (Array.isArray(tmpFiles) && tmpFiles.length > 0) {
      let mapFiles = {};
      let counter = 0;
      for (const f of tmpFiles) {
        f.options = inputOptions[counter];
        mapFiles[f.name] = f;
        counter++;
      }

      setPreInputFiles({
        files: mapFiles,
        batch: batch,
      });
    }
  }, [tmpFiles]);

  // compute intersection when options change
  useEffect(() => {
    if (Array.isArray(tmpFiles) && tmpFiles.length > 0 && preInputFilesStatus) {
      setPreInputOptions({
        options: inputOptions,
      });
    }
  }, [inputOptions]);

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
          title="ExperimentHub"
          panel={
            <>
              <div className="row">
                <Callout intent="primary">
                  <p>
                    Pull a published dataset from Bioconductor's{" "}
                    <a
                      href="http://bioconductor.org/packages/ExperimentHub"
                      target="_blank"
                    >
                      ExperimentHub
                    </a>{" "}
                    database. A curated selection of small datasets is provided
                    here for demonstration purposes.
                  </p>
                </Callout>
              </div>
              <div className="row">
                <Label className="row-input">
                  <Text className="text-100">
                    <span>Choose an ExperimentHub dataset</span>
                  </Text>
                  {Array.isArray(ehubDatasets) ? (
                    <HTMLSelect
                      value={ehubSel}
                      onChange={(e) => {
                        if (e.target.value && e.target.value !== "none") {
                          setTmpNewInputs({
                            ...tmpNewInputs,
                            id: e.target.value,
                          });

                          setEhubSel(e.target.value);
                        }
                      }}
                    >
                      <option value="none">--- no selection ---</option>
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
            </>
          }
        />
        <Tab
          id="MatrixMarket"
          title="10X MatrixMarket"
          panel={
            <>
              <div className="row">
                <Callout intent="primary">
                  <p>
                    Load a 10X MatrixMarket file, typically produced by
                    processing pipelines like Cellranger. We assume that the
                    data has already been filtered to remove empty droplets.
                  </p>
                  <p>
                    The count matrix should have an <Code>*.mtx</Code> or (if
                    Gzip-compressed) <Code>*.mtx.gz</Code> extension.
                  </p>
                  <p>
                    We recommend supplying the feature annotation as an
                    additional TSV file with gene identifiers and symbols - this
                    is usually called <Code>features.tsv.gz</Code> or{" "}
                    <Code>genes.tsv</Code>.
                  </p>
                  <p>
                    You may optionally supply an additional TSV file with
                    per-barcode annotations, e.g., sample assignments for each
                    cell, previously generated clusters.
                  </p>
                </Callout>
              </div>
              <div className="row">
                <Label className="row-input">
                  <Text className="text-100">
                    <span>Choose a count matrix file</span>
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
                    <span>Choose a barcode annotation file (optional)</span>
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
            </>
          }
        />
        <Tab
          id="10X"
          title="10X HDF5"
          panel={
            <>
              <div className="row">
                <Callout intent="primary">
                  <p>
                    Load a HDF5 file in the 10X feature-barcode format,
                    typically produced by processing pipelines like Cellranger.
                    We assume that the data has already been filtered to remove
                    empty droplets. This is usually called something like{" "}
                    <Code>filtered_feature_bc_matrix.h5</Code> in the output of
                    processing pipelines like Cellranger.
                  </p>
                  <p>
                    See{" "}
                    <strong>
                      <a
                        target="_blank"
                        href="https://support.10xgenomics.com/single-cell-gene-expression/software/pipelines/latest/advanced/h5_matrices"
                      >
                        here
                      </a>
                    </strong>{" "}
                    for details. Do not confuse this with the molecule
                    information file, which is something totally different!
                  </p>
                </Callout>
              </div>
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
            </>
          }
        />
        <Tab
          id="H5AD"
          title="H5AD"
          panel={
            <>
              <div className="row">
                <Callout intent="primary">
                  <p>
                    Load a H5AD (<Code>*.h5ad</Code>) file containing a count
                    matrix in one of its layers. Gene annotations should be
                    present in the <Code>vars</Code>.
                  </p>
                </Callout>
              </div>
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
            </>
          }
        />
        <Tab
          id="SummarizedExperiment"
          title="RDS"
          panel={
            <>
              <div className="row">
                <Callout intent="primary">
                  <p>
                    Load an RDS (<Code>*.rds</Code>) file containing a single{" "}
                    <Code>SummarizedExperiment</Code> object. We support any
                    instance of a <Code>SummarizedExperiment</Code> subclass
                    containing a dense or sparse count matrix. If a{" "}
                    <Code>SingleCellExperiment</Code> object is provided, other
                    modalities can be extracted from the alternative
                    experiments.
                  </p>
                </Callout>
              </div>
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
            </>
          }
        />
      </Tabs>
    );
  };

  const render_batch_correction = () => {
    return (
      <>
        <Callout
          className="section-input-item"
          intent="primary"
          title="Batch correction by annotation"
          icon="issue"
        >
          <p>
            If you upload a single dataset, you can optionally tell{" "}
            <strong>kana</strong> to perform batch correction based on batch
            assignments from a single annotation column.
          </p>
          <Label className="row-input">
            <HTMLSelect
              defaultValue={default_none}
              onChange={(e) => {
                let tmpBatch = null;

                tmpBatch = e.target.value;
                if (e.target.value === default_none) {
                  tmpBatch = null;
                }
                setBatch(tmpBatch);
              }}
            >
              <option key={default_none} value={default_none}>
                --- no selection ---
              </option>
              {Object.keys(
                preInputFilesStatus[tmpFiles[0].name].cells["columns"]
              ).map((x, i) => (
                <option key={i} value={x}>
                  {x}
                </option>
              ))}
            </HTMLSelect>
          </Label>
        </Callout>
        <Callout
          className="section-input-item"
          intent="primary"
          title="Subsetting by annotation"
          icon="issue"
        >
          <p>
            If you upload a single dataset, you can optionally tell{" "}
            <strong>kana</strong> to subset the cells based on a single
            annotation column. You can select groups of interest (for
            categorical fields) or a range of values (for continuous fields) to
            define a subset of cells that will be used in the downstream
            analysis. For categorical fields, only the first 50 levels are
            shown.
          </p>
          <Label className="row-input">
            <HTMLSelect
              defaultValue={default_none}
              onChange={(e) => {
                let tmpSubset = { ...subset };

                tmpSubset["subset"] = e.target.value;
                if (e.target.value === default_none) {
                  tmpSubset["subset"] = null;
                } else {
                  if (
                    preInputFilesStatus[tmpFiles[0].name].cells["columns"][
                      tmpSubset["subset"]
                    ].type === "categorical"
                  ) {
                    tmpSubset["values"] = [];
                  } else {
                    tmpSubset["minmax"] = [
                      preInputFilesStatus[tmpFiles[0].name].cells["columns"][
                        tmpSubset["subset"]
                      ].min,
                      preInputFilesStatus[tmpFiles[0].name].cells["columns"][
                        tmpSubset["subset"]
                      ].max,
                    ];
                    tmpSubset["chosen_minmax"] = [
                      preInputFilesStatus[tmpFiles[0].name].cells["columns"][
                        tmpSubset["subset"]
                      ].min,
                      preInputFilesStatus[tmpFiles[0].name].cells["columns"][
                        tmpSubset["subset"]
                      ].max,
                    ];
                  }
                }

                setSubset(tmpSubset);
              }}
            >
              <option key={default_none} value={default_none}>
                --- no selection ---
              </option>
              {Object.keys(
                preInputFilesStatus[tmpFiles[0].name].cells["columns"]
              ).map((x, i) => (
                <option key={i} value={x}>
                  {x}
                </option>
              ))}
            </HTMLSelect>
          </Label>
          {subset?.["subset"] !== null && (
            <>
              {(() => {
                if (
                  preInputFilesStatus[tmpFiles[0].name].cells["columns"][
                    subset["subset"]
                  ].type == "categorical"
                ) {
                  return (
                    <div className="subset-section">
                      {preInputFilesStatus[tmpFiles[0].name].cells["columns"][
                        subset["subset"]
                      ].values.map((x) => (
                        <Checkbox
                          key={"subset-" + x}
                          checked={subset.values.includes(x)}
                          label={x}
                          inline={true}
                          onChange={(e) => {
                            let gip = { ...subset };

                            if (e.target.checked) {
                              if (!gip.values.includes(x)) gip.values.push(x);
                            } else {
                              if (gip.values.includes(x))
                                gip.values = gip.values.filter((y) => y !== x);
                            }

                            setSubset(gip);
                          }}
                        />
                      ))}
                      {preInputFilesStatus[tmpFiles[0].name].cells["columns"][
                        subset["subset"]
                      ].truncated && "... and more"}
                    </div>
                  );
                } else {
                  return (
                    <>
                      <div className="subset-section">
                        <div className="subset-range-field">
                          <H5>from</H5>
                          <NumericInput
                            min={
                              isFinite(subset.minmax[0])
                                ? subset.minmax[0]
                                : undefined
                            }
                            max={
                              isFinite(subset.minmax[1])
                                ? subset.minmax[1]
                                : undefined
                            }
                            value={
                              isFinite(subset.chosen_minmax[0])
                                ? subset.chosen_minmax[0]
                                : undefined
                            }
                            onValueChange={(e) => {
                              let gip = { ...subset };
                              gip["chosen_minmax"][0] = e;
                              setSubset(gip);
                            }}
                          />
                        </div>
                        <div className="subset-range-field">
                          <H5>to</H5>
                          <NumericInput
                            min={
                              isFinite(subset.minmax[0])
                                ? subset.minmax[0]
                                : undefined
                            }
                            max={
                              isFinite(subset.minmax[1])
                                ? subset.minmax[1]
                                : undefined
                            }
                            value={
                              isFinite(subset.chosen_minmax[1])
                                ? subset.chosen_minmax[1]
                                : undefined
                            }
                            onValueChange={(e) => {
                              let gip = { ...subset };
                              gip["chosen_minmax"][1] = e;
                              setSubset(gip);
                            }}
                          />
                        </div>
                      </div>
                    </>
                  );
                }
              })()}
            </>
          )}
        </Callout>
      </>
    );
  };

  const render_multi_summary = () => {
    return (
      <Callout
        className="section-input-item"
        intent="primary"
        title="Incorporating multiple datasets"
        icon="issue"
      >
        <p>
          If you load multiple datasets, we only use modalities that are present
          in each dataset. For each modality, we only use the intersection of
          features across datasets. This is done using the{" "}
          <em>primary feature IDs</em> for each modality, which you can
          customize manually for each dataset to improve the size of the
          intersections
          {preInputOptionsStatus &&
          Object.keys(preInputOptionsStatus).length > 0
            ? ":"
            : "."}
        </p>
        {preInputOptionsStatus &&
        Object.keys(preInputOptionsStatus).length > 0 ? (
          <ul>
            {Object.keys(preInputOptionsStatus).map((x, i) => {
              return (
                <li>
                  <Code>{x}</Code>: {preInputOptionsStatus[x]} common features
                </li>
              );
            })}
          </ul>
        ) : (
          ""
        )}
        <p>
          Each dataset is treated as a separate batch during batch correction.
          This default behavior can be changed in the analysis parameters.
        </p>
      </Callout>
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
          <Callout>
            <p>
              <strong> Import your dataset to get started.</strong> Choose from
              a range of common single-cell formats below.
            </p>
          </Callout>
          {tmpFiles && render_inputs()}
          <Button
            outlined={false}
            fill={true}
            intent="primary"
            icon="add"
            text="ADD DATASET"
            disabled={!tmpStatusValid}
            onClick={handleAddDataset}
          ></Button>
          {preInputFilesStatus && tmpFiles && tmpFiles.length === 1 && (
            <>
              <Divider />
              {render_batch_correction()}
            </>
          )}
        </div>
        <div className="section-info">
          {(tmpNewInputs.mtx || tmpNewInputs.h5 || tmpNewInputs.rds) &&
            !tmpStatusValid && (
              <Callout
                intent="danger"
                title="Incorrect file format"
                style={{
                  marginBottom: "10px",
                }}
              >
                <p>Upload files in one of these formats -</p>
                <ul>
                  <li>
                    Matrix Market - <code>*.mtx</code> or <code>*.mtx.gz</code>.
                    For features or genes, these files can be either{" "}
                    <code>*.tsv</code> or <code>*.tsv.gz</code>.
                  </li>
                  <li>
                    {" "}
                    For h5 based formats (10X or H5AD) - files must end in
                    <code>*.h5</code> or <code>*.hdf5</code> or{" "}
                    <code>*.h5ad</code>
                  </li>
                  <li>
                    {" "}
                    Summarized or single cell experiment object stored as RDS
                    files must end with <code>*.rds</code>
                  </li>
                </ul>
                Note: Names of each dataset must be unique!
              </Callout>
            )}
          {preInputOptionsStatus && tmpFiles.length > 1 && (
            <>{render_multi_summary()}</>
          )}
          <div className="section-inputs">
            {tmpFiles.map((x, i) => {
              if (x.format == "ExperimentHub") {
                return (
                  <ExperimentHub
                    key={i}
                    expand={i + 1 === tmpFiles.length}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={tmpFiles}
                    setInputs={setTmpFiles}
                  />
                );
              } else if (x.format == "MatrixMarket") {
                return (
                  <MatrixMarket
                    key={i}
                    expand={i + 1 === tmpFiles.length}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={tmpFiles}
                    setInputs={setTmpFiles}
                  />
                );
              } else if (x.format == "10X") {
                return (
                  <TenxHDF5
                    key={i}
                    expand={i + 1 === tmpFiles.length}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={tmpFiles}
                    setInputs={setTmpFiles}
                  />
                );
              } else if (x.format == "H5AD") {
                return (
                  <H5AD
                    key={i}
                    expand={i + 1 === tmpFiles.length}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={tmpFiles}
                    setInputs={setTmpFiles}
                  />
                );
              } else if (x.format == "SummarizedExperiment") {
                return (
                  <RDSSE
                    key={i}
                    expand={i + 1 === tmpFiles.length}
                    resource={x}
                    index={i}
                    preflight={
                      preInputFilesStatus && preInputFilesStatus[x.name]
                    }
                    inputOpts={inputOptions}
                    setInputOpts={setInputOptions}
                    inputs={tmpFiles}
                    setInputs={setTmpFiles}
                  />
                );
              }
            })}
          </div>
        </div>
      </div>
      <Divider />
      <div className="section-footer">
        <Tooltip2 content="Clear loaded datasets" placement="left">
          <Button
            icon="cross"
            intent={"danger"}
            large={true}
            onClick={handleClose}
          >
            Clear
          </Button>
        </Tooltip2>
        {tmpFiles.length > 0 && (
          <Tooltip2 content="Run Analysis" placement="top">
            <Button
              icon="flame"
              onClick={handleRunAnalysis}
              intent={"warning"}
              large={true}
              disabled={tmpFiles.length == 0}
            >
              Analyze
            </Button>
          </Tooltip2>
        )}
        {tmpFiles.length > 0 && (
          <Tooltip2
            content="Update or modify default analysis parameters"
            placement="right"
          >
            <Button
              icon="arrow-right"
              onClick={handleRunAndParams}
              large={true}
              disabled={tmpFiles.length == 0}
            >
              Modify analysis parameters
            </Button>
          </Tooltip2>
        )}
      </div>
    </Card>
  );
}
