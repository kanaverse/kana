import { useState, useCallback, useContext, useEffect } from "react";

import {
  Label,
  Text,
  HTMLSelect,
  Card,
  Elevation,
  Button,
  Divider,
  Callout,
  H2,
  Collapse,
  H5,
  InputGroup,
  Switch,
  NumericInput,
  Checkbox,
  ButtonGroup,
  Tabs,
  Tab,
} from "@blueprintjs/core";

import "./index.css";

import { AppContext } from "../../context/AppContext";

import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";

export function ParameterSelection({
  open,
  setOpen,
  openIndex,
  setStateIndeterminate,
  setShowPanel,
  ...props
}) {
  const handleClose = () => setOpen(false);

  // minimise info box on the right
  const [openInfo, setOpenInfo] = useState(true);

  // which helper to show? (on the right info box)
  const [showStepHelper, setShowStepHelper] = useState("rnaqc");

  // expand RNA section?
  const [showRNA, setShowRNA] = useState(true);
  const [showADT, setShowADT] = useState(true);
  const [showCRISPR, setShowCRISPR] = useState(true);

  // access app context
  const { params, setParams, fsetEnrichCollections } = useContext(AppContext);

  // new params, so that they can be discarded later
  const [tmpParams, setTmpParams] = useState(params);

  const handleRunAnalysis = () => {
    setStateIndeterminate(false);
    setParams(tmpParams);
    setShowPanel("results");
  };

  const render_stepinfo = () => {
    return (
      <>
        {(showStepHelper === null || showStepHelper === undefined) && (
          <Callout intent="primary">
            Mouse over a parameter to show detailed information.
          </Callout>
        )}
        {showStepHelper === "rnaqc" && (
          <Callout intent="primary">
            <p>
              Remove low-quality cells to ensure that they do not interfere with
              downstream steps. This is achieved by computing per-cell quality
              control (QC) metrics such as the total count per cell, the total
              number of detected features and (if the feature annotation is
              supplied) the mitochondrial proportion in each cell. Cells with
              low total counts/number of detected features or high mitochondrial
              proportions are filtered out. We use an outlier-based approach to
              define the filter threshold for each metric, under the assumption
              that most cells in the dataset are of acceptable quality.
            </p>
            <p>
              <strong>Number of MADs</strong>: Number of median absolute
              deviations (MADs) from the median, used to define a filter
              threshold in the appropriate direction for each QC metric.
              Increasing this value will reduce the stringency of the filtering.
            </p>
            <p>
              <strong>Use default mitochondrial list</strong>: Should we
              identify mitochondrial genes in the dataset based on the{" "}
              <a
                target="_blank"
                href="https://github.com/kanaverse/bakana/blob/master/src/steps/mito.js"
              >
                <strong>
                  in-built list of Ensembl identifiers and gene symbols for
                  mitochondrial genes in human and mouse genomes?
                </strong>
              </a>{" "}
              This assumes that the dataset contains feature annotation with
              Ensembl identifiers or gene symbols.
            </p>
            <p>
              <strong>Mitochondrial gene prefix</strong>: Prefix to use to
              identify the mitochondrial genes from the feature annotation. Only
              used if we choose to not use the default mitochondrial list.
            </p>
            <p>
              <strong>Skip</strong>: Skip all quality control on the RNA count
              matrix. This is occasionally desirable if the input data has
              already been subjected to QC (e.g., as part of a published paper),
              in which case no further filtering should be applied.
            </p>
          </Callout>
        )}
        {showStepHelper === "fs" && (
          <Callout intent="primary">
            <p>
              Identify highly variable genes (HVGs) while accounting for the
              mean-variance relationship. We do so by fitting a mean-dependent
              trend to the variances computed from the log-transformed
              normalized expression values. HVGs are defined as those genes with
              the largest positive residuals from the trend, as these are more
              variable than expected from the trend. The aim is to only use the
              HVGs in some downstream steps like the principal components
              analysis, thereby improving computational efficiency and reducing
              uninteresting technical noise.
            </p>
            <p>
              <strong>Lowess span</strong>: The span of the LOWESS smoother for
              fitting the mean-variance trend. Larger values increase the
              smoothness of the global trend at the cost of decreasing
              sensitivity to local variations.
            </p>
          </Callout>
        )}
        {showStepHelper === "rnapca" && (
          <Callout intent="primary">
            <p>
              Perform a principal components analysis (PCA) to obtain per-cell
              coordinates in a low-dimensional space. Specifically, we obtain a
              compact representation of the dataset by only taking the top
              principal components (PCs) that explain the largest variance. This
              improves the efficiency of downstream steps as we only have to
              perform calculations on a few (usually 10-50) PCs rather than the
              thousands of gene expression profiles. It also has the advantage
              of removing uninteresting high-dimensional noise by discarding the
              later PCs. This ensures that downstream steps focus on the largest
              factors of variation that - hopefully - correspond to biologically
              interesting heterogeneity.
            </p>
            <p>
              <strong>Number of HVGs</strong>: Number of highly variable genes
              to use to perform the PCA. Larger values will capture more
              biological signal at the cost of increasing noise and
              computational work.
            </p>
            <p>
              <strong>Number of PCs</strong>: Number of principal components
              with the highest variance to retain in downstream analyses. Larger
              values will capture more biological signal at the cost of
              increasing noise and computational work.
            </p>
          </Callout>
        )}
        {showStepHelper === "clus" && (
          <Callout intent="primary">
            <p>
              Cluster cells into discrete groupings based on their relative
              similarity in the low-dimensional PC space. The set of clusters
              should be treated as a summary of the cellular heterogeneity in
              the population, allowing us to easily perform further
              characterization on subpopulations of interest, e.g., with marker
              detection. Different clustering methods or parameters may provide
              different perspectives on the population structure in the dataset.
            </p>
            <p>
              <strong>Method</strong>: Clustering algorithm to use. Currently,
              we support k-means clustering with kmeans++ initialization and
              Hartigon-Wong refinement; or multi-level community detection on an
              shared nearest neighbor (SNN) graph, where the cells are the nodes
              and edges are created between neighboring cells.
            </p>
            <p>
              <strong>Number of clusters (k-means)</strong>: Number of clusters
              to create in k-means clustering. This is capped at 40 for
              performance purposes.
            </p>
            <p>
              <strong>Number of neighbors (SNN)</strong>: Number of neighbors to
              use to construct the SNN graph. Larger values result in broader
              clusters.
            </p>
            <p>
              <strong>Use ANN (SNN)</strong>: Use an approximate method to speed
              up the nearest neighbor search. This sacrifices some accuracy for
              speed in larger datasets.
            </p>
            <p>
              <strong>Weighting scheme (SNN)</strong>: Weighting scheme to use
              for the edges of the SNN graph. The <em>Rank</em> approach derives
              a weight from the rank of the closest shared neighbor; the{" "}
              <em>Number</em> approach uses the number of shared neighbors; and
              the Jaccard approach uses the <em>Jaccard</em> index of the
              neighbor sets.
            </p>
            <p>
              <strong>Resolution (SNN)</strong>: Resolution parameter for the
              multi-level clustering, used to adjust the modularity calculation
              during community optimization. Larger values yield more
              fine-grained clusters.
            </p>
          </Callout>
        )}
        {showStepHelper === "tsne" && (
          <Callout intent="primary">
            <p>
              Compute a t-SNE to visualize cells in two dimensions, because our
              feeble human minds cannot interpret high-dimensional spaces.
              Neighboring cells in the PC space are kept adjacent in the 2D
              embedding, while dissimilar cells are placed (arbitrarily) far
              away.
            </p>
            <p>
              <strong>Perplexity</strong>: Perplexity parameter, which
              determines the size of the neighborhood of each cell. Larger
              values will favor preservation of global structure in the 2D
              embedding.
            </p>
            <p>
              <strong>Iterations</strong>: Number of t-SNE iterations. Doesn't
              usually have much of an effect if you leave it as it is.
            </p>
          </Callout>
        )}
        {showStepHelper === "umap" && (
          <Callout intent="primary">
            <p>
              Create a UMAP plot to visualize cells in two dimensions. Like the
              t-SNE, this aims to map cells from a high-dimensional space into a
              2D embedding, where neighboring cells are kept close together and
              dissimilar cells are placed far apart.
            </p>
            <p>
              <strong>Number of neighbors</strong>: Number of neighbors to use
              when defining the size of the local neighborhood. Larger values
              will favor preservation of global structure.
            </p>
            <p>
              <strong>Minimum distance</strong>: Minimum distance between
              points. Smaller values result in a more tightly packed embedding
              and favor local structure.
            </p>
            <p>
              <strong>Epochs</strong>: Number of epochs to use for convergence.
              This doesn't really change all too much in the results.
            </p>
          </Callout>
        )}
        {showStepHelper === "cellann" && (
          <Callout intent="primary">
            <p>
              Perform cell type annotation for human and mouse datasets. This
              uses the{" "}
              <a
                target="_blank"
                href="https://bioconductor.org/packages/release/bioc/html/SingleR.html"
              >
                SingleR
              </a>{" "}
              algorithm to label clusters based on their similarity to reference
              expression profiles of curated cell types. Similarity is
              quantified using Spearman correlations on the top marker genes for
              each reference type, with additional fine-tuning iterations to
              improve resolution between closely related labels.
            </p>
            <p>
              <strong>Reference Datasets</strong>: A selection of references are
              available from the{" "}
              <a
                target="_blank"
                href="https://bioconductor.org/packages/release/data/experiment/html/celldex.html"
              >
                celldex
              </a>{" "}
              package. Classification of the clusters is performed separately
              for each reference. If multiple references are selected, an
              additional round of scoring is performed to determine which
              reference has the best label for each cluster.
            </p>
          </Callout>
        )}
        {showStepHelper === "ann" && (
          <Callout intent="primary">
            <p>
              Build the index for the nearest neighbor search. This is used for
              a variety of steps including the graph-based clustering, t-SNE and
              UMAP.
            </p>
            <p>
              <strong>Approximate</strong>: Use an approximate neighbor search
              algorithm - in this case, the{" "}
              <a href="https://github.com/spotify/Annoy">Annoy</a> method. This
              sacrifices some search accuracy for speed, which is usually
              acceptable for single-cell applications. Otherwise, an exact
              algorithm is used.
            </p>
          </Callout>
        )}
        {showStepHelper === "batch" && (
          <Callout intent="primary">
            <p>
              Remove batch effects between cells from different samples. This
              places all cells in a common coordinate space for consistent
              clustering and visualization. Otherwise, the interpretation of
              downstream analysis results may be complicated by large
              sample-sample differences, obscuring the heterogeneity within
              samples that is usually of interest.
            </p>
            <p>
              <strong>Correction method</strong>: Which correction method to use
              - no correction, linear regression or mutual nearest neighbor
              (MNN) correction. MNN correction is the default and handles
              situations with differences in cell type composition across
              samples. Linear regression is simpler but assumes that all samples
              have the same proportions of cell types, with a consistent batch
              effect in each cell type. Users may also choose not to correct if,
              e.g., the sample-sample differences are interesting.
            </p>
            <p>
              <strong>Number of neighbors</strong>: Number of neighbors to use
              to identify MNN pairs. Using larger values will yield a more
              stable correction but also increases the risk of incorrectly
              merging unrelated populations across samples.
            </p>
          </Callout>
        )}
        {showStepHelper === "adtqc" && (
          <Callout intent="primary">
            <p>
              Remove low-quality cells based on the ADT counts. This uses the
              number of detected features and, if available, the total count for
              isotype (IgG) controls. Cells with few detected features or high
              isotype counts are filtered out; this is combined with the
              RNA-based filters to ensure that cells are only retained if they
              are informative in both modalities. We again use an outlier-based
              approach to define the filter threshold for each metric.
            </p>
            <p>
              <strong>Number of MADs</strong>: Number of median absolute
              deviations (MADs) from the median, used to define a filter
              threshold in the appropriate direction for each QC metric.
              Increasing this value will reduce the stringency of the filtering.
            </p>
            <p>
              <strong>Isotype prefix</strong>: Prefix to use to identify
              features in the dataset that are isotype controls. This is not
              case-sensitive.
            </p>
            <p>
              <strong>Skip</strong>: Skip all quality control on the ADT count
              matrix. This is occasionally desirable if the input data has
              already been subjected to QC (e.g., as part of a published paper),
              in which case no further filtering should be applied.
            </p>
          </Callout>
        )}
        {showStepHelper === "adtnorm" && (
          <Callout intent="primary">
            <p>
              Log-normalize the ADT count data. This involves some more work
              than the RNA counterpart as the composition biases can be much
              stronger in ADT data. We use a simple approach where we cluster
              cells based on their ADT counts, normalize for composition biases
              between clusters using an median-based method, normalize for
              library size differences between cells within clusters, and then
              combine both to obtain per-cell factors.
            </p>
            <p>
              <strong>Number of clusters</strong>: Number of clusters to use in
              the initial k-means clustering. This clustering will not be used
              in any downstream steps; it is only used here to separate major
              subpopulations with strong DE. Any rough clustering is fine and it
              should not be necessary to spend much time fine-tuning this
              parameter. Overclustering is acceptable - and possibly even
              desirable - provided that each cluster still contains enough cells
              for stable median calculations.
            </p>
            <p>
              <strong>Number of PCs</strong>: Number of principal components to
              use for the clustering. We perform a PCA to compress the data for
              faster clustering - this has no bearing on later choices of the
              number of PCs. Again, as long as a reasonable clustering is
              obtained, it should not be necessary to spend much time
              fine-tuning this parameter. In fact, if the requested number of
              PCs is greater than the number of ADTs, this parameter will have
              no effect.
            </p>
          </Callout>
        )}
        {showStepHelper === "adtpca" && (
          <Callout intent="primary">
            <p>
              Perform a principal components analysis (PCA) on the
              log-normalized ADT matrix. As for RNA, the PCA is used for
              compression and denoising prior to downstream steps like
              clustering and visualization. However, unlike RNA, no feature
              selection is performed here as there are relatively few ADTs in
              the first place.
            </p>
            <p>
              <strong>Number of PCs</strong>: Number of principal components
              with the highest variance to retain in downstream analyses. Larger
              values will capture more biological signal at the cost of
              increasing noise and computational work. If more PCs are requested
              than ADTs are available, the latter is used instead.
            </p>
          </Callout>
        )}
        {showStepHelper === "crisprqc" && (
          <Callout intent="primary">
            <p>Remove low-quality cells based on the Crispr counts.</p>
            <p>
              <strong>Number of MADs</strong>: Number of median absolute
              deviations (MADs) from the median, used to define a filter
              threshold in the appropriate direction for each QC metric.
              Increasing this value will reduce the stringency of the filtering.
            </p>
            <p>
              <strong>Skip</strong>: Skip all quality control on the ADT count
              matrix. This is occasionally desirable if the input data has
              already been subjected to QC (e.g., as part of a published paper),
              in which case no further filtering should be applied.
            </p>
          </Callout>
        )}
        {showStepHelper === "crisprpca" && (
          <Callout intent="primary">
            <p>
              Perform a principal components analysis (PCA) on the
              log-normalized CRISPR matrix.
            </p>
            <p>
              <strong>Number of PCs</strong>: Number of principal components
              with the highest variance to retain in downstream analyses. Larger
              values will capture more biological signal at the cost of
              increasing noise and computational work.
            </p>
          </Callout>
        )}
        {showStepHelper === "combweights" && (
          <Callout intent="primary">
            <p>
              Combine PC embeddings from multiple modalities. This yields a
              single matrix that can be used in downstream analyses like
              clustering, allowing us to incorporate information from multiple
              modalities. By default, each modality is given equal weight in the
              combined matrix.
            </p>
            <p>
              <strong>Modality weights</strong>: Weight for each modality. A
              larger value indicates that the corresponding modality will
              contribute more to the population heterogeneity in the combined
              embedding. A value of zero indicates that the corresponding
              modality should be ignored in downstream analysis.
            </p>
          </Callout>
        )}
        {showStepHelper === "markdet" && (
          <Callout intent="primary">
            <p>Marker Detection</p>
            <p>
              <strong>Compute AUC</strong>:
            </p>
            <p>
              <strong>Log-FC threshold</strong>:
            </p>
          </Callout>
        )}
      </>
    );
  };

  const render_rna_qc = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "rnaqc"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("rnaqc")}
            >
              Quality control (RNA)
            </span>
          </H5>
          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "rnaqc"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("rnaqc")}
                >
                  Filter cells?
                </span>
              </Text>
              <Switch
                style={{ marginTop: "10px" }}
                large={true}
                checked={tmpParams["cell_filtering"]["use_rna"]}
                innerLabelChecked="yes"
                innerLabel="no"
                onChange={(e) => {
                  setTmpParams({
                    ...tmpParams,
                    cell_filtering: {
                      ...tmpParams["use_rna"],
                      use_rna: e.target.checked,
                    },
                  });
                }}
              />
            </Label>
            {tmpParams?.cell_filtering?.use_rna === true && (
              <>
                <Label className="param-row-input">
                  <Text className="param-text-100">
                    <span
                      className={
                        showStepHelper == "rnaqc"
                          ? "param-row-tooltip param-row-tooltip-highlight"
                          : "param-row-tooltip"
                      }
                      onMouseEnter={() => setShowStepHelper("rnaqc")}
                    >
                      Number of MADs
                    </span>
                  </Text>
                  <NumericInput
                    placeholder="3"
                    value={tmpParams["rna_quality_control"]["nmads"]}
                    onValueChange={(nval, val) => {
                      setTmpParams({
                        ...tmpParams,
                        rna_quality_control: {
                          ...tmpParams["rna_quality_control"],
                          nmads: nval,
                        },
                      });
                    }}
                  />
                </Label>
                <Label className="param-row-input">
                  <Text className="param-text-100">
                    <span
                      className={
                        showStepHelper == "rnaqc"
                          ? "param-row-tooltip param-row-tooltip-highlight"
                          : "param-row-tooltip"
                      }
                      onMouseEnter={() => setShowStepHelper("rnaqc")}
                    >
                      Use default mitochondrial prefix ?
                    </span>
                  </Text>
                  <Switch
                    style={{ marginTop: "10px" }}
                    large={true}
                    checked={
                      tmpParams["rna_quality_control"]["use_reference_mito"]
                    }
                    innerLabelChecked="yes"
                    innerLabel="no"
                    onChange={(e) => {
                      setTmpParams({
                        ...tmpParams,
                        rna_quality_control: {
                          ...tmpParams["rna_quality_control"],
                          use_reference_mito: e.target.checked,
                        },
                      });
                    }}
                  />
                </Label>
                {!tmpParams["rna_quality_control"]["use_reference_mito"] && (
                  <Label className="param-row-input">
                    <Text className="param-text-100">
                      <span
                        className={
                          showStepHelper == "rnaqc"
                            ? "param-row-tooltip param-row-tooltip-highlight"
                            : "param-row-tooltip"
                        }
                        onMouseEnter={() => setShowStepHelper("rnaqc")}
                      >
                        Mitochondrial gene prefix
                      </span>
                    </Text>
                    <InputGroup
                      leftIcon="filter"
                      onChange={(nval, val) => {
                        setTmpParams({
                          ...tmpParams,
                          rna_quality_control: {
                            ...tmpParams["rna_quality_control"],
                            mito: nval?.target?.value,
                          },
                        });
                      }}
                      placeholder="mt-"
                      value={tmpParams["rna_quality_control"]["mito"]}
                    />
                  </Label>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const render_fs = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "fs"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("fs")}
            >
              Feature selection (RNA)
            </span>
          </H5>
          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "fs"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("fs")}
                >
                  Lowess span
                </span>
              </Text>
              <NumericInput
                placeholder="0.3"
                stepSize={0.1}
                minorStepSize={0.1}
                value={tmpParams["feature_selection"]["span"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    feature_selection: {
                      ...tmpParams["feature_selection"],
                      span: val,
                    },
                  });
                }}
              />
            </Label>
          </div>
        </div>
      </div>
    );
  };

  const render_rna_pca = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "rnapca"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("rnapca")}
            >
              Principal components analysis (RNA)
            </span>
          </H5>
          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "rnapca"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("rnapca")}
                >
                  Number of HVGs
                </span>
              </Text>
              <NumericInput
                placeholder="2500"
                value={tmpParams["rna_pca"]["num_hvgs"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    rna_pca: { ...tmpParams["rna_pca"], num_hvgs: nval },
                  });
                }}
              />
            </Label>
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "rnapca"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("rnapca")}
                >
                  Number of PCs
                </span>
              </Text>
              <NumericInput
                placeholder="25"
                value={tmpParams["rna_pca"]["num_pcs"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    rna_pca: { ...tmpParams["rna_pca"], num_pcs: nval },
                  });
                }}
              />
            </Label>
          </div>
        </div>
      </div>
    );
  };

  const render_clus = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "clus"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("clus")}
            >
              Clustering
            </span>
          </H5>
          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "clus"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("clus")}
                >
                  Method
                </span>
              </Text>
              <HTMLSelect
                onChange={(e) => {
                  setTmpParams({
                    ...tmpParams,
                    choose_clustering: {
                      ...tmpParams["choose_clustering"],
                      method: e.target.value,
                    },
                  });
                }}
                defaultValue={tmpParams["choose_clustering"]["method"]}
              >
                <option value="kmeans">K-means</option>
                <option value="snn_graph">SNN graph</option>
              </HTMLSelect>
            </Label>
            {tmpParams["choose_clustering"]["method"] == "kmeans" && (
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "clus"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("clus")}
                  >
                    Number of clusters (k)
                  </span>
                </Text>
                <NumericInput
                  placeholder="10"
                  max="40"
                  value={tmpParams["kmeans_cluster"]["k"]}
                  onValueChange={(nval, val) => {
                    setTmpParams({
                      ...tmpParams,
                      kmeans_cluster: {
                        ...tmpParams["kmeans_cluster"],
                        k: nval,
                      },
                    });
                  }}
                />
              </Label>
            )}
            {tmpParams["choose_clustering"]["method"] == "snn_graph" && (
              <>
                <Label className="param-row-input">
                  <Text className="param-text-100">
                    <span
                      className={
                        showStepHelper == "clus"
                          ? "param-row-tooltip param-row-tooltip-highlight"
                          : "param-row-tooltip"
                      }
                      onMouseEnter={() => setShowStepHelper("clus")}
                    >
                      Number of neighbors (k)
                    </span>
                  </Text>
                  <NumericInput
                    placeholder="10"
                    value={tmpParams["snn_graph_cluster"]["k"]}
                    onValueChange={(nval, val) => {
                      setTmpParams({
                        ...tmpParams,
                        snn_graph_cluster: {
                          ...tmpParams["snn_graph_cluster"],
                          k: nval,
                        },
                      });
                    }}
                  />
                </Label>
                <Label className="param-row-input">
                  <Text className="param-text-100">
                    <span
                      className={
                        showStepHelper == "clus"
                          ? "param-row-tooltip param-row-tooltip-highlight"
                          : "param-row-tooltip"
                      }
                      onMouseEnter={() => setShowStepHelper("clus")}
                    >
                      Weighting scheme
                    </span>
                  </Text>
                  <HTMLSelect
                    onChange={(e) => {
                      setTmpParams({
                        ...tmpParams,
                        snn_graph_cluster: {
                          ...tmpParams["snn_graph_cluster"],
                          scheme: e.target.value,
                        },
                      });
                    }}
                    defaultValue={tmpParams["snn_graph_cluster"]["scheme"]}
                  >
                    <option value="rank">Rank</option>
                    <option value="number">Number</option>
                    <option value="jaccard">Jaccard</option>
                  </HTMLSelect>
                </Label>
                <Label className="param-row-input">
                  <Text className="param-text-100">
                    <span
                      className={
                        showStepHelper == "clus"
                          ? "param-row-tooltip param-row-tooltip-highlight"
                          : "param-row-tooltip"
                      }
                      onMouseEnter={() => setShowStepHelper("clus")}
                    >
                      Choose SNN graph clustering algorithm
                    </span>
                  </Text>
                  <HTMLSelect
                    onChange={(e) => {
                      setTmpParams({
                        ...tmpParams,
                        snn_graph_cluster: {
                          ...tmpParams["snn_graph_cluster"],
                          algorithm: e.target.value,
                        },
                      });
                    }}
                    defaultValue={tmpParams["snn_graph_cluster"]["algorithm"]}
                  >
                    <option value="leiden">Leiden</option>
                    <option value="multilevel">multilevel</option>
                    <option value="walktrap">Walktrap</option>
                  </HTMLSelect>
                </Label>
                {tmpParams["snn_graph_cluster"]["algorithm"] ==
                  "multilevel" && (
                  <>
                    <Label className="param-row-input">
                      <Text className="param-text-100">
                        <span
                          className={
                            showStepHelper == "clus"
                              ? "param-row-tooltip param-row-tooltip-highlight"
                              : "param-row-tooltip"
                          }
                          onMouseEnter={() => setShowStepHelper("clus")}
                        >
                          Multilevel Resolution
                        </span>
                      </Text>
                      <NumericInput
                        placeholder="0.5"
                        value={
                          tmpParams["snn_graph_cluster"][
                            "multilevel_resolution"
                          ]
                        }
                        stepSize={0.1}
                        minorStepSize={0.1}
                        onValueChange={(nval, val) => {
                          setTmpParams({
                            ...tmpParams,
                            snn_graph_cluster: {
                              ...tmpParams["snn_graph_cluster"],
                              multilevel_resolution: val,
                            },
                          });
                        }}
                      />
                    </Label>
                  </>
                )}
                {tmpParams["snn_graph_cluster"]["algorithm"] === "leiden" && (
                  <>
                    <Label className="param-row-input">
                      <Text className="param-text-100">
                        <span
                          className={
                            showStepHelper == "clus"
                              ? "param-row-tooltip param-row-tooltip-highlight"
                              : "param-row-tooltip"
                          }
                          onMouseEnter={() => setShowStepHelper("clus")}
                        >
                          Leiden Resolution
                        </span>
                      </Text>
                      <NumericInput
                        placeholder="0.5"
                        value={
                          tmpParams["snn_graph_cluster"]["leiden_resolution"]
                        }
                        stepSize={0.1}
                        minorStepSize={0.1}
                        onValueChange={(nval, val) => {
                          setTmpParams({
                            ...tmpParams,
                            snn_graph_cluster: {
                              ...tmpParams["snn_graph_cluster"],
                              leiden_resolution: val,
                            },
                          });
                        }}
                      />
                    </Label>
                  </>
                )}
                {tmpParams["snn_graph_cluster"]["algorithm"] == "walktrap" && (
                  <>
                    <Label className="param-row-input">
                      <Text className="param-text-100">
                        <span
                          className={
                            showStepHelper == "clus"
                              ? "param-row-tooltip param-row-tooltip-highlight"
                              : "param-row-tooltip"
                          }
                          onMouseEnter={() => setShowStepHelper("clus")}
                        >
                          Walktrap Steps
                        </span>
                      </Text>
                      <NumericInput
                        placeholder="4"
                        value={tmpParams["snn_graph_cluster"]["walktrap_steps"]}
                        stepSize={1}
                        minorStepSize={1}
                        onValueChange={(nval, val) => {
                          setTmpParams({
                            ...tmpParams,
                            snn_graph_cluster: {
                              ...tmpParams["snn_graph_cluster"],
                              walktrap_steps: val,
                            },
                          });
                        }}
                      />
                    </Label>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const render_markdet = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "markdet"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("markdet")}
            >
              Marker detection
            </span>
          </H5>
          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "markdet"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("markdet")}
                >
                  Compute AUC?
                </span>
              </Text>
              <Switch
                style={{ marginTop: "10px" }}
                large={true}
                checked={tmpParams["marker_detection"]["compute_auc"]}
                innerLabelChecked="yes"
                innerLabel="no"
                onChange={(e) => {
                  setTmpParams({
                    ...tmpParams,
                    marker_detection: {
                      ...tmpParams["compute_auc"],
                      compute_auc: e.target.checked,
                    },
                  });
                }}
              />
            </Label>
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "markdet"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("markdet")}
                >
                  Log-FC threshold
                </span>
              </Text>
              <NumericInput
                placeholder="0"
                value={tmpParams["marker_detection"]["lfc_threshold"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    marker_detection: {
                      ...tmpParams["marker_detection"],
                      lfc_threshold: nval,
                    },
                  });
                }}
              />
            </Label>
          </div>
        </div>
      </div>
    );
  };

  const render_tsne = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "tsne"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("tsne")}
            >
              t-SNE
            </span>
          </H5>
          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "tsne"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("tsne")}
                >
                  Perplexity
                </span>
              </Text>
              <NumericInput
                placeholder="30"
                value={tmpParams["tsne"]["perplexity"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    tsne: { ...tmpParams["tsne"], perplexity: nval },
                  });
                }}
              />
            </Label>
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "tsne"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("tsne")}
                >
                  Iterations
                </span>
              </Text>
              <NumericInput
                placeholder="500"
                value={tmpParams["tsne"]["iterations"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    tsne: { ...tmpParams["tsne"], iterations: nval },
                  });
                }}
              />
            </Label>
          </div>
        </div>
      </div>
    );
  };

  const render_umap = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "umap"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("umap")}
            >
              UMAP
            </span>
          </H5>
          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "umap"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("umap")}
                >
                  Number of neighbors
                </span>
              </Text>
              <NumericInput
                placeholder="15"
                value={tmpParams["umap"]["num_neighbors"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    umap: { ...tmpParams["umap"], num_neighbors: nval },
                  });
                }}
              />
            </Label>
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == 7
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper(7)}
                >
                  Minimum distance
                </span>
              </Text>
              <NumericInput
                placeholder="0.01"
                stepSize={0.01}
                minorStepSize={0.01}
                value={tmpParams["umap"]["min_dist"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    umap: { ...tmpParams["umap"], min_dist: val },
                  });
                }}
              />
            </Label>
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == 7
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper(7)}
                >
                  Epochs
                </span>
              </Text>
              <NumericInput
                placeholder="500"
                value={tmpParams["umap"]["num_epochs"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    umap: { ...tmpParams["umap"], num_epochs: nval },
                  });
                }}
              />
            </Label>
          </div>
        </div>
      </div>
    );
  };

  const render_fsetenrich = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "fsetenrich"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("fsetenrich")}
            >
              Feature set enrichment
            </span>
          </H5>
          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "fsetenrich"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("fsetenrich")}
                >
                  Number of top markers
                </span>
              </Text>
              <NumericInput
                placeholder="100"
                value={tmpParams["feature_set_enrichment"]["top_markers"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    feature_set_enrichment: {
                      ...tmpParams["feature_set_enrichment"],
                      top_markers: nval,
                    },
                  });
                }}
              />
            </Label>
            {fsetEnrichCollections && (
              <>
                <Label className="param-row-input">
                  <Text className="param-text-100">
                    <span
                      className={
                        showStepHelper == "fsetenrich"
                          ? "param-row-tooltip param-row-tooltip-highlight"
                          : "param-row-tooltip"
                      }
                      onMouseEnter={() => setShowStepHelper("fsetenrich")}
                    >
                      Choose species
                    </span>
                  </Text>
                  <HTMLSelect
                    onChange={(e) => {
                      setTmpParams({
                        ...tmpParams,
                        feature_set_enrichment: {
                          ...tmpParams["feature_set_enrichment"],
                          species: e.target.value,
                        },
                      });
                    }}
                    defaultValue={
                      tmpParams["feature_set_enrichment"]["species"]
                        ? tmpParams["feature_set_enrichment"]["species"]
                        : "none"
                    }
                  >
                    <option value="none">none</option>
                    <option value="10090">Mouse</option>
                    <option value="9606">Human</option>
                    <option value="6239">Worm</option>
                    <option value="10116">Rat</option>
                    <option value="7227">Fly</option>
                    <option value="7955">Zebrafish</option>
                    <option value="9598">Chimp</option>
                  </HTMLSelect>
                </Label>
                {tmpParams["feature_set_enrichment"]["species"] !== null &&
                  tmpParams["feature_set_enrichment"]["species"] !== "none" && (
                    <Label className="param-row-input">
                      <Text className="param-text-100">
                        <span
                          className={
                            showStepHelper == "fsetenrich"
                              ? "param-row-tooltip param-row-tooltip-highlight"
                              : "param-row-tooltip"
                          }
                          onMouseEnter={() => setShowStepHelper("fsetenrich")}
                        >
                          Choose species
                        </span>
                      </Text>
                      <select
                        multiple={true}
                        onChange={(e) => {
                          let new_coll = [];
                          e.target.selectedOptions.forEach((x) => {
                            new_coll.push(x.value);
                          });
                          setTmpParams({
                            ...tmpParams,
                            feature_set_enrichment: {
                              ...tmpParams["feature_set_enrichment"],
                              collections: new_coll,
                            },
                          });
                        }}
                      >
                        {/* <option value="none">none</option> */}
                        {fsetEnrichCollections[
                          tmpParams["feature_set_enrichment"]["species"]
                        ].map((x, i) => (
                          <option value={x}>{x}</option>
                        ))}
                      </select>
                    </Label>
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  function handleCheckbox(e, species, key) {
    let tmpAnnoCells = [...tmpParams["cell_labelling"]["references"]];
    if (e.target.checked) {
      if (!tmpAnnoCells.includes(key)) {
        tmpAnnoCells.push(key);
      }
    } else {
      tmpAnnoCells = tmpAnnoCells.filter((y) => {
        return y !== key;
      });
    }

    let tmpAnno = {
      ...tmpParams["cell_labelling"],
    };

    tmpAnno["references"] = tmpAnnoCells;

    setTmpParams({
      ...tmpParams,
      cell_labelling: tmpAnno,
    });
  }

  function isCheckIncluded(species, key) {
    return tmpParams["cell_labelling"]["references"].includes(key);
  }

  const render_cellann = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "cellann"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("cellann")}
            >
              Cell type annotation
            </span>
          </H5>
          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "cellann"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("cellann")}
                >
                  Choose reference datasets
                </span>
              </Text>
              <div
                style={{
                  marginTop: "10px",
                }}
              >
                <span
                  style={{
                    marginRight: "10px",
                    textTransform: "capitalize",
                    fontWeight: "bold",
                  }}
                >
                  Human:{" "}
                </span>
                <Checkbox
                  defaultChecked={isCheckIncluded("human", "BlueprintEncode")}
                  inline={true}
                  label="Blueprint Encode"
                  onChange={(e) => {
                    handleCheckbox(e, "human", "BlueprintEncode");
                  }}
                />
                <Checkbox
                  defaultChecked={isCheckIncluded(
                    "human",
                    "DatabaseImmuneCellExpression"
                  )}
                  inline={true}
                  label="Database ImmuneCell Expression"
                  onChange={(e) => {
                    handleCheckbox(e, "human", "DatabaseImmuneCellExpression");
                  }}
                />
                <Checkbox
                  defaultChecked={isCheckIncluded(
                    "human",
                    "HumanPrimaryCellAtlas"
                  )}
                  inline={true}
                  label="Human Primary Cell Atlas"
                  onChange={(e) => {
                    handleCheckbox(e, "human", "HumanPrimaryCellAtlas");
                  }}
                />
                <Checkbox
                  defaultChecked={isCheckIncluded("human", "MonacoImmune")}
                  inline={true}
                  label="Monaco Immune"
                  onChange={(e) => {
                    handleCheckbox(e, "human", "MonacoImmune");
                  }}
                />
                <Checkbox
                  defaultChecked={isCheckIncluded(
                    "human",
                    "NovershternHematopoietic"
                  )}
                  inline={true}
                  label="Novershtern Hematopoietic"
                  onChange={(e) => {
                    handleCheckbox(e, "human", "NovershternHematopoietic");
                  }}
                />
              </div>
              <div>
                <span
                  style={{
                    marginRight: "10px",
                    textTransform: "capitalize",
                    fontWeight: "bold",
                  }}
                >
                  Mouse:{" "}
                </span>
                <Checkbox
                  defaultChecked={isCheckIncluded("mouse", "ImmGen")}
                  inline={true}
                  label="ImmGen"
                  onChange={(e) => {
                    handleCheckbox(e, "mouse", "ImmGen");
                  }}
                />
                <Checkbox
                  defaultChecked={isCheckIncluded("mouse", "MouseRNAseq")}
                  inline={true}
                  label="Mouse RNA-seq"
                  onChange={(e) => {
                    handleCheckbox(e, "mouse", "MouseRNAseq");
                  }}
                />
              </div>
            </Label>
          </div>
        </div>
      </div>
    );
  };

  const render_ann = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "ann"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("ann")}
            >
              Nearest neighbor search
            </span>
          </H5>

          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "ann"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("ann")}
                >
                  Approximate
                </span>
              </Text>
              <Switch
                style={{ marginTop: "10px" }}
                large={true}
                checked={tmpParams["neighbor_index"]["approximate"]}
                innerLabelChecked="yes"
                innerLabel="no"
                onChange={(e) => {
                  setTmpParams({
                    ...tmpParams,
                    neighbor_index: {
                      ...tmpParams["neighbor_index"],
                      approximate: e.target.checked,
                    },
                  });
                }}
              />
            </Label>
          </div>
        </div>
      </div>
    );
  };

  const render_batch_correction = () => {
    return (
      <div className="col">
        <div>
          <H5 className="param-section-title">
            <span
              className={
                showStepHelper == "batch"
                  ? "param-row-tooltip param-row-tooltip-highlight"
                  : "param-row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper("batch")}
            >
              Batch Correction
            </span>
          </H5>

          <div className="param-row">
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "batch"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("batch")}
                >
                  Method
                </span>
              </Text>
              <HTMLSelect
                onChange={(e) => {
                  setTmpParams({
                    ...tmpParams,
                    batch_correction: {
                      ...tmpParams["batch_correction"],
                      method: e.target.value,
                    },
                  });
                }}
                defaultValue={tmpParams["batch_correction"]["method"]}
              >
                <option value="mnn">MNN correction</option>
                <option value="regress">Linear regression</option>
                <option value="none">No correction</option>
              </HTMLSelect>
            </Label>
            <Label className="param-row-input">
              <Text className="param-text-100">
                <span
                  className={
                    showStepHelper == "batch"
                      ? "param-row-tooltip param-row-tooltip-highlight"
                      : "param-row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper("batch")}
                >
                  Number of neighbors
                </span>
              </Text>
              <NumericInput
                placeholder="15"
                value={tmpParams["batch_correction"]["num_neighbors"]}
                onValueChange={(nval, val) => {
                  setTmpParams({
                    ...tmpParams,
                    batch_correction: {
                      ...tmpParams["batch_correction"],
                      num_neighbors: nval,
                    },
                  });
                }}
              />
            </Label>
          </div>
        </div>
      </div>
    );
  };

  const render_adtqc = () => {
    return (
      <div className="col">
        <div>
          <div>
            <H5 className="param-section-title">
              <span
                className={
                  showStepHelper == "adtqc"
                    ? "param-row-tooltip param-row-tooltip-highlight"
                    : "param-row-tooltip"
                }
                onMouseEnter={() => setShowStepHelper("adtqc")}
              >
                Quality control (ADT)
              </span>
            </H5>
            <div className="param-row">
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "adtqc"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("adtqc")}
                  >
                    Filter cells?
                  </span>
                </Text>
                <Switch
                  style={{ marginTop: "10px" }}
                  large={true}
                  checked={tmpParams["cell_filtering"]["use_adt"]}
                  innerLabelChecked="yes"
                  innerLabel="no"
                  onChange={(e) => {
                    setTmpParams({
                      ...tmpParams,
                      cell_filtering: {
                        ...tmpParams["cell_filtering"],
                        use_adt: e.target.checked,
                      },
                    });
                  }}
                />
              </Label>
              {tmpParams?.cell_filtering?.use_adt === true && (
                <>
                  <Label className="param-row-input">
                    <Text className="param-text-100">
                      <span
                        className={
                          showStepHelper == "adtqc"
                            ? "param-row-tooltip param-row-tooltip-highlight"
                            : "param-row-tooltip"
                        }
                        onMouseEnter={() => setShowStepHelper("adtqc")}
                      >
                        Number of MADs
                      </span>
                    </Text>
                    <NumericInput
                      placeholder="3"
                      value={tmpParams["adt_quality_control"]["nmads"]}
                      onValueChange={(nval, val) => {
                        setTmpParams({
                          ...tmpParams,
                          adt_quality_control: {
                            ...tmpParams["adt_quality_control"],
                            nmads: nval,
                          },
                        });
                      }}
                    />
                  </Label>
                  <Label className="param-row-input">
                    <Text className="param-text-100">
                      <span
                        className={
                          showStepHelper == "adtqc"
                            ? "param-row-tooltip param-row-tooltip-highlight"
                            : "vrow-tooltip"
                        }
                        onMouseEnter={() => setShowStepHelper("adtqc")}
                      >
                        Minimum Detected Drop
                      </span>
                    </Text>
                    <NumericInput
                      placeholder="0.1"
                      stepSize={0.01}
                      minorStepSize={0.01}
                      value={
                        tmpParams["adt_quality_control"]["min_detected_drop"]
                      }
                      onValueChange={(nval, val) => {
                        setTmpParams({
                          ...tmpParams,
                          adt_quality_control: {
                            ...tmpParams["adt_quality_control"],
                            min_detected_drop: val,
                          },
                        });
                      }}
                    />
                  </Label>
                  <Label className="param-row-input">
                    <Text className="param-text-100">
                      <span
                        className={
                          showStepHelper == "adtqc"
                            ? "param-row-tooltip param-row-tooltip-highlight"
                            : "param-row-tooltip"
                        }
                        onMouseEnter={() => setShowStepHelper("adtqc")}
                      >
                        Prefix for isotype controls
                      </span>
                    </Text>
                    <InputGroup
                      leftIcon="filter"
                      onChange={(nval, val) => {
                        setTmpParams({
                          ...tmpParams,
                          adt_quality_control: {
                            ...tmpParams["adt_quality_control"],
                            igg_prefix: nval?.target?.value,
                          },
                        });
                      }}
                      placeholder="IgG"
                      value={tmpParams["adt_quality_control"]["igg_prefix"]}
                    />
                  </Label>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const render_adtnorm = () => {
    return (
      <div className="col">
        <div>
          <div>
            <H5 className="param-section-title">
              <span
                className={
                  showStepHelper == "adtnorm"
                    ? "param-row-tooltip param-row-tooltip-highlight"
                    : "param-row-tooltip"
                }
                onMouseEnter={() => setShowStepHelper("adtnorm")}
              >
                Normalization (ADT)
              </span>
            </H5>
            <div className="param-row">
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "adtnorm"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("adtnorm")}
                  >
                    Number of PC's
                  </span>
                </Text>
                <NumericInput
                  placeholder="25"
                  value={tmpParams["adt_normalization"]["num_pcs"]}
                  onValueChange={(nval, val) => {
                    setTmpParams({
                      ...tmpParams,
                      adt_normalization: {
                        ...tmpParams["adt_normalization"],
                        num_pcs: nval,
                      },
                    });
                  }}
                />
              </Label>
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "adtnorm"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("adtnorm")}
                  >
                    Number of Clusters
                  </span>
                </Text>
                <NumericInput
                  placeholder="20"
                  value={tmpParams["adt_normalization"]["num_clusters"]}
                  onValueChange={(nval, val) => {
                    setTmpParams({
                      ...tmpParams,
                      adt_normalization: {
                        ...tmpParams["adt_normalization"],
                        num_clusters: nval,
                      },
                    });
                  }}
                />
              </Label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const render_adtpca = () => {
    return (
      <div className="col">
        <div>
          <div>
            <H5 className="param-section-title">
              <span
                className={
                  showStepHelper == "adtpca"
                    ? "param-row-tooltip param-row-tooltip-highlight"
                    : "param-row-tooltip"
                }
                onMouseEnter={() => setShowStepHelper("adtpca")}
              >
                Principal components analysis (ADT)
              </span>
            </H5>
            <div className="param-row">
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "adtpca"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("adtpca")}
                  >
                    Number of PC's
                  </span>
                </Text>
                <NumericInput
                  placeholder="25"
                  value={tmpParams["adt_pca"]["num_pcs"]}
                  onValueChange={(nval, val) => {
                    setTmpParams({
                      ...tmpParams,
                      adt_pca: { ...tmpParams["adt_pca"], num_pcs: nval },
                    });
                  }}
                />
              </Label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const render_combweights = () => {
    return (
      <div className="col">
        <div>
          <div>
            <H5 className="param-section-title">
              <span
                className={
                  showStepHelper == "combweights"
                    ? "param-row-tooltip param-row-tooltip-highlight"
                    : "param-row-tooltip"
                }
                onMouseEnter={() => setShowStepHelper("combweights")}
              >
                Combined Embedding
              </span>
            </H5>
            <div className="param-row">
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "combweights"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("combweights")}
                  >
                    RNA Weight
                  </span>
                </Text>
                <NumericInput
                  placeholder="1"
                  defaultValue={tmpParams["combine_embeddings"]["rna_weight"]}
                  min={0}
                  value={tmpParams["combine_embeddings"]["rna_weight"]}
                  onValueChange={(nval, val) => {
                    let gip = { ...tmpParams };
                    gip["combine_embeddings"]["rna_weight"] = nval;
                    setTmpParams(gip);
                  }}
                />
              </Label>
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "combweights"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("combweights")}
                  >
                    ADT Weight
                  </span>
                </Text>
                <NumericInput
                  placeholder="1"
                  min={0}
                  defaultValue={tmpParams["combine_embeddings"]["adt_weight"]}
                  value={tmpParams["combine_embeddings"]["adt_weight"]}
                  onValueChange={(nval, val) => {
                    let gip = { ...tmpParams };
                    gip["combine_embeddings"]["adt_weight"] = nval;
                    setTmpParams(gip);
                  }}
                />
              </Label>
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "combweights"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("combweights")}
                  >
                    CRISPR Weight
                  </span>
                </Text>
                <NumericInput
                  placeholder="1"
                  min={0}
                  defaultValue={
                    tmpParams["combine_embeddings"]["crispr_weight"]
                  }
                  value={tmpParams["combine_embeddings"]["crispr_weight"]}
                  onValueChange={(nval, val) => {
                    let gip = { ...tmpParams };
                    gip["combine_embeddings"]["crispr_weight"] = nval;
                    setTmpParams(gip);
                  }}
                />
              </Label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const render_crisprqc = () => {
    return (
      <div className="col">
        <div>
          <div>
            <H5 className="param-section-title">
              <span
                className={
                  showStepHelper == "crisprqc"
                    ? "param-row-tooltip param-row-tooltip-highlight"
                    : "param-row-tooltip"
                }
                onMouseEnter={() => setShowStepHelper("crisprqc")}
              >
                Quality control (CRISPR)
              </span>
            </H5>
            <div className="param-row">
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "crisprqc"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("crisprqc")}
                  >
                    Filter cells?
                  </span>
                </Text>
                <Switch
                  style={{ marginTop: "10px" }}
                  large={true}
                  checked={tmpParams["cell_filtering"]["use_crispr"]}
                  innerLabelChecked="yes"
                  innerLabel="no"
                  onChange={(e) => {
                    setTmpParams({
                      ...tmpParams,
                      cell_filtering: {
                        ...tmpParams["cell_filtering"],
                        use_crispr: e.target.checked,
                      },
                    });
                  }}
                />
              </Label>
              {tmpParams?.cell_filtering?.use_crispr === true && (
                <>
                  <Label className="param-row-input">
                    <Text className="param-text-100">
                      <span
                        className={
                          showStepHelper == "crisprqc"
                            ? "param-row-tooltip param-row-tooltip-highlight"
                            : "param-row-tooltip"
                        }
                        onMouseEnter={() => setShowStepHelper("crisprqc")}
                      >
                        Number of MADs
                      </span>
                    </Text>
                    <NumericInput
                      placeholder="3"
                      value={tmpParams["crispr_quality_control"]["nmads"]}
                      onValueChange={(nval, val) => {
                        setTmpParams({
                          ...tmpParams,
                          crispr_quality_control: {
                            ...tmpParams["crispr_quality_control"],
                            nmads: nval,
                          },
                        });
                      }}
                    />
                  </Label>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const render_crisprnorm = () => {
    return (
      <div className="col">
        <div>
          <div>
            <H5 className="param-section-title">
              <span
                className={
                  showStepHelper == "crisprqc"
                    ? "param-row-tooltip param-row-tooltip-highlight"
                    : "param-row-tooltip"
                }
                onMouseEnter={() => setShowStepHelper("crisprqc")}
              >
                Normalization (CRISPR)
              </span>
            </H5>
            <div className="param-row"></div>
          </div>
        </div>
      </div>
    );
  };

  const render_crisprpca = () => {
    return (
      <div className="col">
        <div>
          <div>
            <H5 className="param-section-title">
              <span
                className={
                  showStepHelper == "crisprpca"
                    ? "param-row-tooltip param-row-tooltip-highlight"
                    : "param-row-tooltip"
                }
                onMouseEnter={() => setShowStepHelper("crisprpca")}
              >
                Principal components analysis (CRISPR)
              </span>
            </H5>
            <div className="param-row">
              <Label className="param-row-input">
                <Text className="param-text-100">
                  <span
                    className={
                      showStepHelper == "crisprpca"
                        ? "param-row-tooltip param-row-tooltip-highlight"
                        : "param-row-tooltip"
                    }
                    onMouseEnter={() => setShowStepHelper("crisprpca")}
                  >
                    Number of PC's
                  </span>
                </Text>
                <NumericInput
                  placeholder="25"
                  value={tmpParams["crispr_pca"]["num_pcs"]}
                  onValueChange={(nval, val) => {
                    setTmpParams({
                      ...tmpParams,
                      crispr_pca: { ...tmpParams["crispr_pca"], num_pcs: nval },
                    });
                  }}
                />
              </Label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card
      className="param-section"
      interactive={false}
      elevation={Elevation.ZERO}
    >
      <div className="param-section-header">
        <H2 className="param-section-header-title">Analysis Parameters</H2>
      </div>
      <Divider />
      <div className="param-section-content">
        <div className="param-section-content-body">
          <Callout icon="airplane">
            <p>
              <strong> Set or Modify parameters. </strong>A number of defaults
              are chosen for various analysis steps in Kana.
            </p>

            <p>
              <strong>
                <i>
                  you can choose to set parameters now, but be aware the
                  available parameters depends on the type of analysis (batch,
                  multi-modal etc) & dataset imported into Kana.
                </i>
              </strong>
            </p>
          </Callout>
          <Divider />
          <Tabs
            defaultSelectedTabId={"rnaqc"}
            vertical={true}
            onChange={(ntab, otab) => {
              setShowStepHelper(ntab);
            }}
          >
            <Tab
              id="rnaqc"
              title="Quality control (RNA)"
              panel={
                <>
                  {render_stepinfo()}
                  {render_rna_qc()}
                </>
              }
            ></Tab>
            <Tab
              id="fs"
              title="Feature Selection (RNA)"
              panel={
                <>
                  {render_stepinfo()}
                  {render_fs()}
                </>
              }
            ></Tab>
            <Tab
              id="rnapca"
              title="Principal components analysis (RNA)"
              panel={
                <>
                  {render_stepinfo()}
                  {render_rna_pca()}
                </>
              }
            ></Tab>
            <Tab
              id="adtqc"
              title="Quality control (ADT)"
              panel={
                <>
                  {render_stepinfo()}
                  {render_adtqc()}
                </>
              }
            ></Tab>
            <Tab
              id="adtnorm"
              title="Normalization (ADT)"
              panel={
                <>
                  {render_stepinfo()}
                  {render_adtnorm()}
                </>
              }
            ></Tab>
            <Tab
              id="adtpca"
              title="Principal components analysis (ADT)"
              panel={
                <>
                  {render_stepinfo()}
                  {render_adtpca()}
                </>
              }
            ></Tab>
            <Tab
              id="crisprqc"
              title="Quality control (CRISPR)"
              panel={
                <>
                  {render_stepinfo()}
                  {render_crisprqc()}
                </>
              }
            ></Tab>
            <Tab
              id="crisprpca"
              title="Principal components analysis (CRISPR)"
              panel={
                <>
                  {render_stepinfo()}
                  {render_crisprpca()}
                </>
              }
            ></Tab>
            <Tab
              id="batch"
              title="Batch correction"
              panel={
                <>
                  {render_stepinfo()}
                  {render_batch_correction()}
                </>
              }
            ></Tab>
            <Tab
              id="clus"
              title="Clustering"
              panel={
                <>
                  {render_stepinfo()}
                  {render_clus()}
                </>
              }
            ></Tab>
            <Tab
              id="ann"
              title="Nearest neighbor search"
              panel={<>{render_ann()}</>}
            ></Tab>
            <Tab
              id="markdet"
              title="Marker detection"
              panel={
                <>
                  {render_stepinfo()}
                  {render_markdet()}
                </>
              }
            ></Tab>
            <Tab
              id="tsne"
              title="t-SNE"
              panel={
                <>
                  {render_stepinfo()}
                  {render_tsne()}
                </>
              }
            ></Tab>
            <Tab
              id="umap"
              title="UMAP"
              panel={
                <>
                  {render_stepinfo()}
                  {render_umap()}
                </>
              }
            ></Tab>
            <Tab
              id="cellann"
              title="Cell type annotation"
              panel={
                <>
                  {render_stepinfo()}
                  {render_cellann()}
                </>
              }
            ></Tab>
            <Tab
              id="combweights"
              title="Combined embedding"
              panel={
                <>
                  {render_stepinfo()}
                  {render_combweights()}
                </>
              }
            ></Tab>
            <Tab
              id="fsetenrich"
              title="Feature set enrichment"
              panel={
                <>
                  {render_stepinfo()}
                  {render_fsetenrich()}
                </>
              }
            ></Tab>
          </Tabs>
        </div>
      </div>
      <Divider />
      <div className="param-section-footer">
        <Tooltip2 content="Cancel changes" placement="left">
          <Button
            icon="cross"
            intent={"danger"}
            large={true}
            onClick={handleClose}
          >
            Discard
          </Button>
        </Tooltip2>
        <Tooltip2
          content="Update parameters and run analysis!"
          placement="right"
        >
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
