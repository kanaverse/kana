# Changelog

## V3.0.0 - 3.0.26

- Overhaul the entire application from scratch (expect a few bugs :fingerscrossed:)
- Officially support explore mode to visually explore pre-analyzed datasets
- Gene set enrichment to identify enriched gene sets among the top markers for each cluster
- Markers and gene set panels can be used on any annotation and not just the kana-identified clusters
- Download results as CSV for both markers and gene sets
- Support Perturb-seq and similar CRISPR based modalities
- Gallery orients vertically or horizontally based on browser and available screen widths
- UX improvements, text edits to various components for new functionality

## V2.2.0
- Perform analysis on a subset of cells

![Subset cells](assets/subset.png)

## V2.0.0
- Support for a multi-modal analysis of ADT + RNA
- Added new parameter elements for ADT, integrated analysis
- Support multiple modalities in the marker selection
- Support multiple modalities in diagnostic plots

![Multimodal analysis](assets/v2_adt.gif)

## V1.2.0

- Visually compare embeddings across annotations
- with linked embeddings, you can now make lasso selections on any plot and the app automatically highlights these cells across all visualizations
- save and restore state of the embedding from the gallery
- export plots from the interface as png
- drag and drop, and reorganize the gallery in any order you like

![Linked Visualizations](assets/linked_visualization.gif)

## V1.1.0

- Support ADTs 
To overlay normalized protein expression of a marker for any ADT tag, these are available as column annotations

![ADT protein expression](./assets/adt_expr.gif)


## V1.0.0

- Full release of the application. 
- Supports everything in [README](./README.md)