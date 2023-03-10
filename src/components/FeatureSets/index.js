import React, { useEffect, useContext, useState, useMemo } from "react";
import {
  Button,
  H4,
  H5,
  Icon,
  Collapse,
  InputGroup,
  Text,
  Switch,
  RangeSlider,
  Tag,
  HTMLSelect,
  Classes,
  Card,
  Elevation,
  Label,
  Divider,
  MenuItem,
} from "@blueprintjs/core";
import { Popover2, Tooltip2 } from "@blueprintjs/popover2";
import { Virtuoso } from "react-virtuoso";
import * as d3 from "d3";

import { AppContext } from "../../context/AppContext";

import PvalCell from "../Plots/PValCell";
import HeatmapCell from "../Plots/HeatmapCell";
import Cell from "../Plots/Cell";

import { code, getMinMax, defaultColor } from "../../utils/utils";
import "./fsea.css";
import { Select2 } from "@blueprintjs/select";

const FeatureSetEnrichment = (props) => {
  const { genesInfo, geneColSel, annotationObj } = useContext(AppContext);

  const default_cluster = `${code}::CLUSTERS`;
  const default_selection = `${code}::SELECTION`;

  const [showSettings, setShowSettings] = useState(false);
  const [showCounts, setShowCounts] = useState(true);
  const [showPvalues, setShowPvalues] = useState(true);

  const [showFilters, setShowFilters] = useState(false);

  // what cluster is selected
  const [clusSel, setClusSel] = useState(null);

  // feature set search
  const [searchInput, setSearchInput] = useState(null);

  // ranges for various feature set stats
  const [countsMinMax, setCountsMinMax] = useState(null);
  const [pvalMinMax, setPValMinMax] = useState(null);
  const [minMaxs, setMinMaxs] = useState(null);

  // stores range filters from UI
  const [fsetFilter, setFsetFilter] = useState({});
  // records after collection selection
  // const [selectedCollectionRecs, setSelectedCollectionRecs] = useState(null);
  // records to show after filtering
  const [preProsRecords, setPreProsRecords] = useState(null);
  const [prosRecords, setProsRecords] = useState(null);

  // scale to use for gradients on expression bar
  const detectedScale = d3.interpolateRdYlBu; //d3.interpolateRdBu;

  useEffect(() => {
    let width = 350;

    if (!showCounts) width -= 45;
    if (!showPvalues) width -= 55;

    props?.setFsetWidth(width);
  }, [showCounts, showPvalues]);

  // update clusters when custom selection is made in the UI
  useEffect(() => {
    if (default_cluster === props?.selectedFsetAnnotation) {
      if (annotationObj[props?.selectedFsetAnnotation]) {
        let max_clusters = getMinMax(
          annotationObj[props?.selectedFsetAnnotation]
        )[1];

        let clus = [];
        for (let i = 0; i < max_clusters + 1; i++) {
          clus.push(i + 1);
        }

        setClusSel(clus);
        if (props?.selectedFsetCluster === null) {
          props?.setSelectedFsetCluster(0);
        }
      }
    }
  }, [props?.selectedFsetAnnotation, annotationObj]);

  useEffect(() => {
    if (props?.fsetEnirchDetails !== null && props?.selectedFsetColl !== null) {
      if (
        `${props?.selectedFsetCluster}-${props?.fsetClusterRank}` in
          props?.fsetEnirchSummary &&
        props?.selectedFsetColl in
          props?.fsetEnirchSummary[
            `${props?.selectedFsetCluster}-${props?.fsetClusterRank}`
          ]
      ) {
        let tcountMinMax = d3.extent(
          props?.fsetEnirchSummary[
            `${props?.selectedFsetCluster}-${props?.fsetClusterRank}`
          ][props?.selectedFsetColl]["counts"]
        );
        let tcountval = tcountMinMax[1] === 0 ? 0.01 : tcountMinMax[1];
        setCountsMinMax([
          parseFloat(tcountMinMax[0].toFixed(2)),
          parseFloat(tcountval.toFixed(2)),
        ]);

        let tpvalMinMax = d3.extent(
          props?.fsetEnirchSummary[
            `${props?.selectedFsetCluster}-${props?.fsetClusterRank}`
          ][props?.selectedFsetColl]["pvalues"]
        );
        let tpvalval = tpvalMinMax[1] === 0 ? 0.01 : tpvalMinMax[1];
        setPValMinMax([
          parseFloat(tpvalMinMax[0].toFixed(2)),
          parseFloat(tpvalval.toFixed(2)),
        ]);

        setMinMaxs({
          count: [
            parseFloat(tcountMinMax[0].toFixed(2)),
            parseFloat(tcountval.toFixed(2)),
          ],
          pvalue: [0, 1],
        });

        setFsetFilter({
          count: fsetFilter?.count
            ? fsetFilter?.count
            : [0, parseFloat(tcountval.toFixed(2))],
          pvalue: fsetFilter?.pvalue ? fsetFilter?.pvalue : [0, 1],
        });

        let trecs = [];

        props?.fsetEnirchDetails[props?.selectedFsetColl].names.map((x, i) => {
          trecs.push({
            _index: i,
            name: x,
            description:
              props?.fsetEnirchDetails[props?.selectedFsetColl].descriptions[i],
            size: props?.fsetEnirchDetails[props?.selectedFsetColl].sizes[i],
            count:
              props?.fsetEnirchSummary[
                `${props?.selectedFsetCluster}-${props?.fsetClusterRank}`
              ][props?.selectedFsetColl]["counts"][i],
            pvalue:
              props?.fsetEnirchSummary[
                `${props?.selectedFsetCluster}-${props?.fsetClusterRank}`
              ][props?.selectedFsetColl]["pvalues"][i],
            // fscores: props?.featureScoreCache[i],
            // geneIndices: props?.fsetGeneIndxCache[i],
            expanded: false,
          });
        });

        let sortedRows = trecs.sort((a, b) => a.pvalue - b.pvalue);
        setPreProsRecords(sortedRows);
      }
    }
  }, [props?.fsetEnirchDetails, props?.fsetEnirchSummary]);

  useEffect(() => {
    if (preProsRecords !== null) {
      let tmp = [...preProsRecords];
      tmp.map((x, i) => {
        x.fscores = props?.featureScoreCache[x._index];
        x.geneIndices = props?.fsetGeneIndxCache[x._index];
      });

      setProsRecords(tmp);
    }
  }, [preProsRecords, props?.featureScoreCache, props?.fsetGeneIndxCache]);

  const sortedRows = useMemo(() => {
    if (!prosRecords) return [];

    let tsortedRows = [...prosRecords];
    if (fsetFilter) {
      for (let key in fsetFilter) {
        let range = fsetFilter[key];
        if (!range) continue;
        if (range[0] === minMaxs[key][0] && range[1] === minMaxs[key][1])
          continue;
        tsortedRows = tsortedRows.filter(
          (x) => x[key] >= range[0] && x[key] <= range[1]
        );
      }
    }

    if (!searchInput || searchInput === "") return tsortedRows;

    tsortedRows = tsortedRows.filter(
      (x) =>
        x.name.toLowerCase().indexOf(searchInput.toLowerCase()) !== -1 ||
        x.description.toLowerCase().indexOf(searchInput.toLowerCase()) !== -1
    );
    return tsortedRows;
  }, [prosRecords, searchInput, fsetFilter]);

  const getRowWidths = () => {
    let action = 52;
    let rem_width = props?.fsetWidth - action - 35;
    let widths = [];
    if (showCounts) widths.push(Math.ceil(rem_width * 0.15));
    if (showPvalues) widths.push(Math.ceil(rem_width * 0.15));

    let current_total = widths.reduce((a, b) => a + b, 0);
    let geneWidth = rem_width - current_total;

    if (widths.length > 0)
      return [geneWidth, widths.join("px "), `${action}px`].join("px ");

    return [geneWidth, `${action}px`].join("px ");
  };

  const getTableHeight = () => {
    let defheight = 335;
    if (showFilters) defheight = 530;

    if (props?.windowWidth < 1200) {
      defheight += 270;
    }

    return `35px calc(100vh - ${defheight}px)`;
  };

  return (
    <div className="fsetenrich-container">
      <div className="fsetenrich-container-header">
        <div>
          <Popover2
            popoverClassName={Classes.POPOVER_CONTENT_SIZING}
            hasBackdrop={false}
            interactionKind="hover"
            placement="left"
            hoverOpenDelay={500}
            modifiers={{
              arrow: { enabled: true },
              flip: { enabled: true },
              preventOverflow: { enabled: true },
            }}
            content={
              <Card
                style={{
                  width: "450px",
                }}
                elevation={Elevation.ZERO}
              >
                <p>Feature set enrichment.</p>
              </Card>
            }
          >
            <H5
              style={{
                cursor: "help",
              }}
            >
              Feature set enrichment
            </H5>
          </Popover2>
          <span
            style={{
              marginTop: "5px",
              marginLeft: "3px",
              cursor: "pointer",
              fontStyle: "italic",
            }}
            onClick={() => props?.setMarkersOrFsets("markers")}
          >
            switch to marker genes
          </span>
        </div>
        <div>
          <Tooltip2 content={showSettings ? "Hide Settings" : "Show Settings"}>
            <Button
              onClick={() => setShowSettings(!showSettings)}
              minimal={true}
              icon={"cog"}
              small={true}
              intent={showSettings ? "primary" : "none"}
            />
          </Tooltip2>
        </div>
      </div>
      <Collapse isOpen={showSettings}>
        <Divider />
        <Switch
          checked={showCounts}
          label="Show counts?"
          onChange={() => setShowCounts(!showCounts)}
        />
        <Switch
          checked={showPvalues}
          label="Show p-values?"
          onChange={() => setShowPvalues(!showPvalues)}
        />
        <span
          style={{
            cursor: "help",
          }}
        >
          <Popover2
            popoverClassName={Classes.POPOVER_CONTENT_SIZING}
            hasBackdrop={false}
            interactionKind="hover"
            placement="left"
            hoverOpenDelay={50}
            modifiers={{
              arrow: { enabled: true },
              flip: { enabled: true },
              preventOverflow: { enabled: true },
            }}
            content={
              <Card
                style={{
                  width: "450px",
                }}
                elevation={Elevation.ZERO}
              >
                <p>
                  Choose the effect size and summary statistic to use for
                  ranking markers. For each gene, effect sizes are computed by
                  pairwise comparisons between clusters:
                </p>
                <ul>
                  <li>
                    <strong>
                      <em>Cohen's d</em>
                    </strong>{" "}
                    is the ratio of the log-fold change to the average standard
                    deviation between two clusters.
                  </li>
                  <li>
                    The area under the curve (
                    <strong>
                      <em>AUC</em>
                    </strong>
                    ) is the probability that a randomly chosen observation from
                    one cluster is greater than a randomly chosen observation
                    from another cluster.
                  </li>
                  <li>
                    The log-fold change (
                    <strong>
                      <em>lfc</em>
                    </strong>
                    ) is the difference in the mean log-expression between two
                    clusters.
                  </li>
                  <li>
                    The{" "}
                    <strong>
                      <em>Δ-detected</em>
                    </strong>{" "}
                    is the difference in the detected proportions between two
                    clusters.
                  </li>
                </ul>
                <p>
                  For each cluster, the effect sizes from the comparisons to all
                  other clusters are summarized into a single statistic for
                  ranking purposes:
                </p>
                <ul>
                  <li>
                    <strong>
                      <em>mean</em>
                    </strong>{" "}
                    uses the mean effect sizes from all pairwise comparisons.
                    This generally provides a good compromise between
                    exclusitivity and robustness.
                  </li>
                  <li>
                    <strong>
                      <em>min</em>
                    </strong>{" "}
                    uses the minimum effect size from all pairwise comparisons.
                    This promotes markers that are exclusively expressed in the
                    chosen cluster, but will perform poorly if no such genes
                    exist.
                  </li>
                  <li>
                    <strong>
                      <em>min-rank</em>
                    </strong>{" "}
                    ranks genes according to their best rank in each of the
                    individual pairwise comparisons. This is the most robust as
                    the combination of top-ranked genes will always be able to
                    distinguish the chosen cluster from the other clusters, but
                    may not give high rankings to exclusive genes.
                  </li>
                </ul>
              </Card>
            }
          >
            {/* <Icon
              intent="warning"
              icon="sort"
              style={{
                paddingRight: "5px",
              }}
            ></Icon> */}
            <span> Rank markers by </span>
          </Popover2>
          {"     "}
          <HTMLSelect
            onChange={(x) => {
              props?.setFsetClusterRank(x.currentTarget.value);
            }}
            defaultValue={"cohen-min-rank"}
          >
            <option>cohen-min</option>
            <option>cohen-mean</option>
            <option>cohen-min-rank</option>
            <option>auc-min</option>
            <option>auc-mean</option>
            <option>auc-min-rank</option>
            <option>lfc-min</option>
            <option>lfc-mean</option>
            <option>lfc-min-rank</option>
            <option>delta-d-min</option>
            <option>delta-d-mean</option>
            <option>delta-d-min-rank</option>
          </HTMLSelect>
        </span>
      </Collapse>
      <Divider />
      {props?.fsetEnirchDetails && (
        <Label style={{ marginBottom: "3px" }}>
          Choose Collection
          <HTMLSelect
            defaultValue={props?.selectedFsetColl}
            onChange={(nval) => {
              props?.setSelectedFsetColl(nval?.currentTarget?.value);
            }}
          >
            {Object.keys(props?.fsetEnirchDetails).map((x, i) => (
              <option value={x} key={i}>
                {x}
              </option>
            ))}
          </HTMLSelect>
        </Label>
      )}
      {clusSel && (
        <Label style={{ marginBottom: "3px" }}>
          Choose Cluster
          <HTMLSelect
            className="fsetenrich-cluster-selection-width"
            onChange={(x) => {
              let tmpselection = x.currentTarget?.value;

              if (default_cluster === props?.selectedFsetAnnotation) {
                if (tmpselection.startsWith("Cluster")) {
                  tmpselection =
                    parseInt(tmpselection.replace("Cluster ", "")) - 1;
                }
              }
              props?.setSelectedFsetCluster(tmpselection);
            }}
          >
            {default_cluster === props?.selectedFsetAnnotation &&
              clusSel.map((x, i) => (
                <option
                  selected={
                    String(props?.selectedFsetCluster).startsWith("cs")
                      ? x == props?.selectedFsetCluster
                      : parseInt(x) - 1 == parseInt(props?.selectedFsetCluster)
                  }
                  key={i}
                >
                  {String(x).startsWith("cs") ? "Custom Selection" : "Cluster"}{" "}
                  {x}
                </option>
              ))}
          </HTMLSelect>
        </Label>
      )}
      <div
        className="fsetenrich-table"
        style={{
          gridTemplateRows: getTableHeight(),
        }}
      >
        <div className="fsetenrich-header">
          <InputGroup
            leftIcon="search"
            small={true}
            placeholder="Search feature set..."
            type="text"
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Virtuoso
          components={{
            Item: ({ children, ...props }) => {
              return (
                <div className="row-card" {...props}>
                  {children}
                </div>
              );
            },
            Header: () => {
              return (
                <div
                  className="fsetenrich-row-container fsetenrich-row-header"
                  style={{
                    gridTemplateColumns: getRowWidths(),
                  }}
                >
                  <span
                    style={{
                      textDecoration: "underline",
                      cursor: "help",
                    }}
                  >
                    Feature set
                  </span>
                  {showPvalues && (
                    <Popover2
                      popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                      hasBackdrop={false}
                      interactionKind="hover"
                      placement="auto"
                      hoverOpenDelay={50}
                      modifiers={{
                        arrow: { enabled: true },
                        flip: { enabled: true },
                        preventOverflow: { enabled: true },
                      }}
                      content={
                        <Card
                          style={{
                            width: "250px",
                          }}
                          elevation={Elevation.ZERO}
                        >
                          <p>pvalues</p>
                          <p>
                            Use the color scale below to apply a filter on this
                            statistic.
                          </p>
                        </Card>
                      }
                    >
                      <span
                        style={{
                          textDecoration: "underline",
                          cursor: "help",
                        }}
                      >
                        pvalue
                      </span>
                    </Popover2>
                  )}
                  {showCounts && (
                    <Popover2
                      popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                      hasBackdrop={false}
                      interactionKind="hover"
                      placement="auto"
                      hoverOpenDelay={50}
                      modifiers={{
                        arrow: { enabled: true },
                        flip: { enabled: true },
                        preventOverflow: { enabled: true },
                      }}
                      content={
                        <Card
                          style={{
                            width: "250px",
                          }}
                          elevation={Elevation.ZERO}
                        >
                          <p>counts</p>
                          <p>
                            Use the color scale below to apply a filter on this
                            statistic.
                          </p>
                        </Card>
                      }
                    >
                      <span
                        style={{
                          textDecoration: "underline",
                          cursor: "help",
                        }}
                      >
                        count
                      </span>
                    </Popover2>
                  )}
                </div>
              );
            },
          }}
          className="fsetenrich-list"
          totalCount={sortedRows.length}
          itemContent={(index) => {
            const row = sortedRows[index];
            const rowexp = row.expanded;
            const rowScores = row.fscores;
            const rowGeneIndices = row.geneIndices;

            return (
              <div>
                <div
                  className="fsetenrich-row-container"
                  style={{
                    gridTemplateColumns: getRowWidths(),
                  }}
                >
                  <span
                    className={
                      row.expanded
                        ? "fsetenrich-title-selected"
                        : "fsetenrich-title"
                    }
                  >
                    <strong style={{ color: "#147EB3", fontSize: "x-small" }}>
                      {row.name}
                    </strong>
                    : {row.description} ({row.size} genes)
                  </span>
                  {showPvalues && (
                    <Popover2
                      popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                      hasBackdrop={false}
                      interactionKind="hover"
                      placement="auto"
                      hoverOpenDelay={500}
                      modifiers={{
                        arrow: { enabled: true },
                        flip: { enabled: true },
                        preventOverflow: { enabled: true },
                      }}
                      content={
                        <Card elevation={Elevation.ZERO}>
                          <table>
                            <tr>
                              <td></td>
                              <th scope="col">
                                {row.name}:({row.size} genes)
                              </th>
                              <th scope="col">This feature set</th>
                            </tr>
                            <tr>
                              <th scope="row">Pvalue</th>
                              <td>{row.pvalue.toFixed(2)}</td>
                              <td style={{ fontStyle: "italic" }}>
                                ∈ [{pvalMinMax[0].toFixed(2)},{" "}
                                {pvalMinMax[1].toFixed(2)}]
                              </td>
                            </tr>
                            <tr>
                              <th scope="row">Count</th>
                              <td>{row.count.toFixed(2)}</td>
                              <td style={{ fontStyle: "italic" }}>
                                ∈ [{countsMinMax[0].toFixed(2)},{" "}
                                {countsMinMax[1].toFixed(2)}]
                              </td>
                            </tr>
                          </table>
                        </Card>
                      }
                    >
                      <PvalCell score={row.pvalue} />
                    </Popover2>
                  )}
                  {showCounts && (
                    <Popover2
                      popoverClassName={Classes.POPOVER_CONTENT_SIZING}
                      hasBackdrop={false}
                      interactionKind="hover"
                      placement="auto"
                      hoverOpenDelay={500}
                      modifiers={{
                        arrow: { enabled: true },
                        flip: { enabled: true },
                        preventOverflow: { enabled: true },
                      }}
                      content={
                        <Card elevation={Elevation.ZERO}>
                          <table>
                            <tr>
                              <td></td>
                              <th scope="col">
                                {row.name}: ({row.size} genes)
                              </th>
                              <th scope="col">This feature set</th>
                            </tr>
                            <tr>
                              <th scope="row">Count</th>
                              <td>{row.count.toFixed(2)}</td>
                              <td style={{ fontStyle: "italic" }}>
                                ∈ [{countsMinMax[0].toFixed(2)},{" "}
                                {countsMinMax[1].toFixed(2)}]
                              </td>
                            </tr>
                            <tr>
                              <th scope="row">Pvalue</th>
                              <td>{row.pvalue.toFixed(2)}</td>
                              <td style={{ fontStyle: "italic" }}>
                                ∈ [{pvalMinMax[0].toFixed(2)},{" "}
                                {pvalMinMax[1].toFixed(2)}]
                              </td>
                            </tr>
                          </table>
                        </Card>
                      }
                    >
                      <Cell
                        minmax={[0, 1]}
                        colorscale={detectedScale}
                        score={row.count / row.size}
                        colorscore={row.count / row.size}
                      />
                    </Popover2>
                  )}
                  <div className="fsetenrich-row-action">
                    <Tooltip2 content="Compute feature set scores">
                      <Button
                        icon={rowexp ? "minus" : "plus"}
                        small={true}
                        fill={false}
                        className="fsetenrich-row-action"
                        outlined={rowexp ? false : true}
                        intent={rowexp ? "primary" : null}
                        onClick={() => {
                          console.log(rowexp);
                          let tmprecs = [...prosRecords];
                          tmprecs[index].expanded = !tmprecs[index].expanded;
                          setProsRecords(tmprecs);

                          // do something
                          if (!tmprecs[index].expanded) {
                            props?.setFeatureSetGeneIndex(null);
                          } else {
                            props?.setFeatureSetGeneIndex(row._index);
                            if (!rowGeneIndices) {
                              props?.setReqFsetGeneIndex(row._index);
                            }
                          }
                        }}
                      ></Button>
                    </Tooltip2>
                    <Tooltip2 content="Visualize feature scores">
                      <Button
                        small={true}
                        fill={false}
                        outlined={
                          row._index === props?.selectedFsetIndex ? false : true
                        }
                        intent={
                          row._index === props?.selectedFsetIndex
                            ? "primary"
                            : null
                        }
                        className="row-action"
                        onClick={() => {
                          if (row._index === props?.selectedFsetIndex) {
                            props?.setSelectedFsetIndex(null);
                          } else {
                            props?.setSelectedFsetIndex(row._index);
                            if (!rowScores) {
                              props?.setReqFsetIndex(row._index);
                            }
                          }
                        }}
                      >
                        <Icon icon={"tint"}></Icon>
                      </Button>
                    </Tooltip2>
                  </div>
                </div>
                <Collapse isOpen={rowexp}>
                  <H5>Genes in this feature set</H5>
                  {rowGeneIndices !== null && rowGeneIndices !== undefined ? (
                    <div
                      style={{
                        height: "100px",
                      }}
                    >
                      <Divider />
                      <Virtuoso
                        totalCount={rowGeneIndices.length}
                        itemContent={(rgindex) => {
                          const rgrow = rowGeneIndices[rgindex];
                          const rgname = genesInfo[geneColSel["RNA"]][rgrow];

                          return (
                            <div className="fsetenrich-genelist-container">
                              <span>{rgname}</span>
                              <Button
                                minimal={true}
                                small={true}
                                fill={false}
                                outline={true}
                                onClick={() => {
                                  if (rgname === props?.gene) {
                                    props?.setGene(null);
                                  } else {
                                    props?.setGene(rgname);
                                    props?.setReqGene(rgname);
                                  }
                                }}
                              >
                                <Icon size={12} icon={"tint"}></Icon>
                              </Button>
                            </div>
                          );
                        }}
                      />
                      <Divider />
                    </div>
                  ) : (
                    <div className="bp4-skeleton"></div>
                  )}
                </Collapse>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
};

export default React.memo(FeatureSetEnrichment);
