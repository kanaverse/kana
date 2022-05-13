import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Divider, Icon } from "@blueprintjs/core";
import { saveSVG } from "../Plots/utils.js";

import { Tooltip2 } from "@blueprintjs/popover2";

import * as d3 from "d3";

import "./Gallery.css";

export function SortableItem(props) {
  const { attributes, listeners, node, setNodeRef, transform, transition } =
    useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  let tooltips = {
    download: "Save plot as PNG",
    select: "Restore this state",
    highlight: "Clear selection of cells",
    trash: "Remove plot",
    import: "Export CSV",
    blank: "nothing yet"
  };

  // TODO: Template for each item in the Gallery
  // <div className="gallery-cont">
  // <div className={props?.showQCLoader ? "gitem effect-opacitygrayscale" : "gitem"}>
  //   <div className="gitem-header">
  //     <div className="gitem-header-title">An example panel</div>
  //     <div className="gitem-header-actions">
  //       <Button icon="download" small={true} />
  //       <Button icon="trash" small={true} />
  //       <Button icon="select" small={true} />
  //     </div>
  //   </div>
  //   <Divider />
  //   <div className="gitem-content"></div>
  // </div>

  function handleAction(action) {
    switch (action) {
      case "highlight":
        props?.setSelectedPoints(null);
        break;
      case "select":
        props?.setRestoreState(props?.data);
        break;
      case "download":
        let dnode = node.current
          .querySelector(".gitem-content")
          .querySelector("canvas");
        if (dnode) {
          let iData = dnode.toDataURL();
          let tmpLink = document.createElement("a");
          tmpLink.href = iData;
          tmpLink.download = `${props?.title
            .replace("⊃", "")
            .split(" ")
            .join("_")}.png`;
          tmpLink.click();
          break;
        }

        let snode = node.current
          .querySelector(".gitem-content")
          .querySelectorAll("svg");
        snode.forEach((sn) => {
          if (
            sn.attributes["data-icon"] == undefined &&
            !["highlight", "select", "download", "trash", "import"].includes(
              sn.attributes["data-icon"]
            )
          ) {
            saveSVG(d3.select(sn).node(), 2 * 325, 2 * 200, props?.title);
          }
        });

        break;
      case "trash":
        let plots = [...props?.savedPlot];
        plots.splice(parseInt(props?.id) - 100, 1);
        props?.setSavedPlot(plots);
        // also remove items from list
        let titems = [...props?.items];
        titems.splice(titems.indexOf(props?.id), 1);
        props?.setItems(titems);
        break;
      case "import":
        props?.setSelectedPoints(null);
        break;
    }
  }

  return (
    <div ref={setNodeRef} style={style} key={props?.id} className={"gitem"}>
      <div className="gitem-header">
        {/* <Icon icon="move" /> */}
        <div className="gitem-header-title" {...attributes} {...listeners}>
          {props?.title}
        </div>
        <div className="gitem-header-actions">
          {props?.actions?.map((x) => (
            <Tooltip2 key={x} content={tooltips[x]}>
              <Button
                onClick={(e) => handleAction(x)}
                icon={x === "download" ? "cloud-download": x}
                small={true}
              />
            </Tooltip2>
          ))}
        </div>
      </div>
      <Divider />
      <div className="gitem-content">{props?.content}</div>
    </div>
  );
}
