import { FC, useState, useRef, useEffect, Fragment } from "react";
import { Avatar } from "./Avatar";
import "./Me.css";

declare interface MeProps {}

export const Me: FC<MeProps> = ({}) => {
  return (
    <Fragment>
      <div className="user container">
        <Avatar id={1} />
      </div>
    </Fragment>
  );
};
