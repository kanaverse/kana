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
  Switch,
  NumericInput,
} from "@blueprintjs/core";

import "./index.css";

import { AppContext } from "../../context/AppContext";

import { generateUID } from "../../utils/utils";
import { Popover2, Tooltip2, Classes as popclass } from "@blueprintjs/popover2";

import { MODALITIES } from "../../utils/utils";

export function ParameterSelection({ open, setOpen, openIndex, ...props }) {
  const handleClose = () => setOpen(false);

  // minimise info box on the right
  const [openInfo, setOpenInfo] = useState(true);

  // which helper to show? (on the right info box)
  const [showStepHelper, setShowStepHelper] = useState("qc");

  // access app context
  const { params, setParams } = useContext(AppContext);

  // new params, so that they can be discarded later
  const [tmpParams, setTmpParams] = useState(params);

  const render_stepinfo = () => {
    return (
      <>
        {showStepHelper === "qc" && (
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
                href="https://github.com/jkanche/kana/blob/master/public/scran/mito.js"
              >
                <strong>
                  in-built list of Ensembl identifiers and gene symbols for
                  mitochondrial genes in human and mouse genomes?
                </strong>
              </a>
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
        {showStepHelper === "pca" && (
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
        {showStepHelper === "adtclus" && (
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
        {showStepHelper === "weights" && (
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
      </>
    );
  };

  const get_input_qc = () => {
    return (
      <div className="col">
        <div>
          <H5 className="section-title">
            <span
              className={
                showStepHelper == 2
                  ? "row-tooltip row-tooltip-highlight"
                  : "row-tooltip"
              }
              onMouseEnter={() => setShowStepHelper(2)}
            >
              Quality control (RNA)
            </span>
          </H5>
          <div className="row">
            <Label className="row-input">
              <Text className="text-100">
                <span
                  className={
                    showStepHelper == 2
                      ? "row-tooltip row-tooltip-highlight"
                      : "row-tooltip"
                  }
                  onMouseEnter={() => setShowStepHelper(2)}
                >
                  Skip
                </span>
              </Text>
              <Switch
                style={{ marginTop: "10px" }}
                large={true}
                checked={tmpParams["qc"]["skip"]}
                innerLabelChecked="yes"
                innerLabel="no"
                onChange={(e) => {
                  setTmpParams({
                    ...tmpParams,
                    qc: { ...tmpParams["qc"], skip: e.target.checked },
                  });
                }}
              />
            </Label>
            {tmpParams?.qc?.skip !== true && (
              <>
                <Label className="row-input">
                  <Text className="text-100">
                    <span
                      className={
                        showStepHelper == 2
                          ? "row-tooltip row-tooltip-highlight"
                          : "row-tooltip"
                      }
                      onMouseEnter={() => setShowStepHelper(2)}
                    >
                      Number of MADs
                    </span>
                  </Text>
                  <NumericInput
                    placeholder="3"
                    value={tmpParams["qc"]["qc-nmads"]}
                    onValueChange={(nval, val) => {
                      setTmpParams({
                        ...tmpParams,
                        qc: { ...tmpParams["qc"], "qc-nmads": nval },
                      });
                    }}
                  />
                </Label>
                <Label className="row-input">
                  <Text className="text-100">
                    <span
                      className={
                        showStepHelper == 2
                          ? "row-tooltip row-tooltip-highlight"
                          : "row-tooltip"
                      }
                      onMouseEnter={() => setShowStepHelper(2)}
                    >
                      Use default mitochondrial list ?
                    </span>
                  </Text>
                  <Switch
                    style={{ marginTop: "10px" }}
                    large={true}
                    checked={tmpParams["qc"]["qc-usemitodefault"]}
                    innerLabelChecked="yes"
                    innerLabel="no"
                    onChange={(e) => {
                      setTmpParams({
                        ...tmpParams,
                        qc: {
                          ...tmpParams["qc"],
                          "qc-usemitodefault": e.target.checked,
                        },
                      });
                    }}
                  />
                </Label>
                {!tmpParams["qc"]["qc-usemitodefault"] && (
                  <Label className="row-input">
                    <Text className="text-100">
                      <span
                        className={
                          showStepHelper == 2
                            ? "row-tooltip row-tooltip-highlight"
                            : "row-tooltip"
                        }
                        onMouseEnter={() => setShowStepHelper(2)}
                      >
                        Mitochondrial gene prefix
                      </span>
                    </Text>
                    <InputGroup
                      leftIcon="filter"
                      onChange={(nval, val) => {
                        setTmpParams({
                          ...tmpParams,
                          qc: {
                            ...tmpParams["qc"],
                            "qc-mito": nval?.target?.value,
                          },
                        });
                      }}
                      placeholder="mt-"
                      value={tmpParams["qc"]["qc-mito"]}
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
              <strong> Set or Modify parameters. </strong>A number of defaults
              are chosen for various analysis steps in Kana.
            </p>

            <p>
              <strong>
                <i>
                  you can choose to set parameters now, but be aware that this
                  might change based on what type of dataset is imported into
                  Kana.
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
            <Collapse isOpen={openInfo}>{render_stepinfo()}</Collapse>
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
