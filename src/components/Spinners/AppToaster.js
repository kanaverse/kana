import { Position, Toaster } from "@blueprintjs/core";

export const AppToaster = Toaster.create({
    className: "notifications",
    position: Position.TOP_RIGHT,
    maxToasts: 5,
});