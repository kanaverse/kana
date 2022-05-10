import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Divider, Icon } from "@blueprintjs/core";

import "./Gallery.css";

export function SortableItem(props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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

  return (
    <div ref={setNodeRef} style={style} key={props?.id} className={"gitem"}>
      <div className="gitem-header" {...attributes} {...listeners}>
        {/* <Icon icon="move" /> */}
        <div className="gitem-header-title">{props?.title}</div>
        <div className="gitem-header-actions">
          {props?.actions?.map((x) => (
            <Button icon={x} small={true} />
          ))}
        </div>
      </div>
      <Divider />
      <div className="gitem-content">{props?.content}</div>
    </div>
  );
}
