import { analysisDefaults } from "bakana";
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
  const [annotationCols, setAnnotationCols] = useState({});
  const [annotationObj, setAnnotationObj] = useState({});

  // default params
  const [params, setParams] = useState(analysisDefaults());

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
