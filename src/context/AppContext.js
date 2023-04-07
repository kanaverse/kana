import React, { createContext, useState } from "react";

export const AppContext = createContext(null);

const AppContextProvider = ({ children }) => {
  // Input State
  const [inputFiles, setInputFiles] = useState({
    format: null,
    files: null,
  });

  // Load State
  const [loadFiles, setLoadFiles] = useState({
    format: null,
    files: null,
  });

  // Explore State
  const [exploreFiles, setExploreFiles] = useState({
    format: null,
    files: null,
  });

  // sets app mode
  const [appMode, setAppMode] = useState(null);

  // creates a default dataset name
  const [datasetName, setDatasetName] = useState("My Analysis Title");

  // storing tmp files
  const [tmpFiles, setTmpFiles] = useState([]);

  // Pre flight Input State
  const [preInputFiles, setPreInputFiles] = useState(null);

  // Pre flight Input Status
  const [preInputFilesStatus, setPreInputFilesStatus] = useState(null);

  // Pre flight Options
  const [preInputOptions, setPreInputOptions] = useState(null);

  // Pre flight Options Status
  const [preInputOptionsStatus, setPreInputOptionsStatus] = useState(null);

  // Ehub datasets
  const [ehubDatasets, setEhubDatasets] = useState(null);

  // featureset enrichment collection
  const [fsetEnrichCollections, setFsetEnrichCollections] = useState(null);

  // app import state - params loading first time ?
  const [initLoadState, setInitLoadState] = useState(false);
  // app export state - .kana file
  const [exportState, setExportState] = useState(false);

  // wasm state and error
  const [wasmInitialized, setWasmInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Response State for various components - these are state that are spread
  // allover the app so its better they are at the context level
  // Gene details
  const [genesInfo, setGenesInfo] = useState(null);
  // default column to show in markers table
  const [geneColSel, setGeneColSel] = useState({
    RNA: null,
    ADT: null,
    CRISPR: null,
  });

  // all cell annotations available
  const [annotationCols, setAnnotationCols] = useState([]);
  const [annotationObj, setAnnotationObj] = useState({});

  // default params
  const [params, setParams] = useState({
    feature_selection: {
      span: 0.3,
    },
    combine_embeddings: {
      rna_weight: 1,
      adt_weight: 1,
      crispr_weight: 0,
      approximate: true,
    },
    batch_correction: {
      method: "mnn",
      num_neighbors: 15,
      approximate: true,
    },
    tsne: {
      perplexity: 30,
      iterations: 500,
      animate: false,
    },
    umap: {
      num_neighbors: 15,
      num_epochs: 500,
      min_dist: 0.1,
      animate: false,
    },
    kmeans_cluster: {
      k: 10,
    },
    choose_clustering: {
      method: "snn_graph",
    },
    cell_labelling: {
      references: [],
      automatic: true,
      species: [],
      gene_id_column: null,
      gene_id_type: "ENSEMBL",
    },
    inputs: {
      block_factor: null,
      subset: null,
    },
    rna_quality_control: {
      use_reference_mito: true,
      mito_prefix: "mt-",
      nmads: 3,
      automatic: true,
      gene_id_column: null,
      gene_id_type: "ENSEMBL",
      species: [],
    },
    adt_quality_control: {
      igg_prefix: "IgG",
      nmads: 3,
      min_detected_drop: 0.1,
      automatic: true,
      tag_id_column: null,
    },
    crispr_quality_control: {
      nmads: 3,
    },
    cell_filtering: {
      use_rna: true,
      use_adt: true,
      use_crispr: true,
    },
    rna_normalization: {},
    adt_normalization: {
      num_pcs: 25,
      num_clusters: 20,
    },
    crispr_normalization: {},
    rna_pca: {
      num_hvgs: 2000,
      num_pcs: 20,
      block_method: "none",
    },
    adt_pca: {
      num_pcs: 20,
      block_method: "none",
    },
    crispr_pca: {
      num_pcs: 20,
      block_method: "none",
    },
    neighbor_index: {
      approximate: true,
    },
    snn_graph_cluster: {
      k: 10,
      scheme: "rank",
      algorithm: "multilevel",
      multilevel_resolution: 1,
      leiden_resolution: 1,
      walktrap_steps: 4,
    },
    marker_detection: {
      lfc_threshold: 0,
      compute_auc: true,
    },
    custom_selections: {
      lfc_threshold: 0,
      compute_auc: true,
    },
    feature_set_enrichment: {
      collections: [
        "mouse-GO",
        "human-GO",
        "worm-GO",
        "rat-GO",
        "fly-GO",
        "zebrafish-GO",
        "chimp-GO",
      ],
      species: null,
      automatic: true,
      gene_id_column: null,
      gene_id_type: "ENSEMBL",
      top_markers: 100,
    },
  });

  // load params from pre-saved analysis
  // params from worker for stored analysis (kana file)
  const [loadParams, setLoadParams] = useState(null);

  // auto load the ziesel dataset
  const [loadZiesel, setLoadZiesel] = useState(false);

  return (
    <AppContext.Provider
      value={{
        inputFiles,
        setInputFiles,
        preInputFiles,
        setPreInputFiles,
        preInputFilesStatus,
        setPreInputFilesStatus,
        ehubDatasets,
        setEhubDatasets,
        params,
        setParams,
        initLoadState,
        setInitLoadState,
        wasmInitialized,
        setWasmInitialized,
        error,
        setError,
        genesInfo,
        setGenesInfo,
        geneColSel,
        setGeneColSel,
        annotationCols,
        setAnnotationCols,
        annotationObj,
        setAnnotationObj,
        datasetName,
        setDatasetName,
        loadFiles,
        setLoadFiles,
        loadParams,
        setLoadParams,
        exploreFiles,
        setExploreFiles,
        appMode,
        setAppMode,
        fsetEnrichCollections,
        setFsetEnrichCollections,
        loadZiesel,
        setLoadZiesel,
        preInputOptions,
        setPreInputOptions,
        preInputOptionsStatus,
        setPreInputOptionsStatus,
        tmpFiles,
        setTmpFiles,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default React.memo(AppContextProvider);
