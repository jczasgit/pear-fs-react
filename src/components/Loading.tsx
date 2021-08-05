import { FC, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./Loading.css";
import logo from "../assets/logo.svg";

declare interface Props {
  exit: boolean;
  withTimeout: boolean;
}

export const Loading: FC<Props> = ({ exit, withTimeout }) => {
  const [remove, setRemove] = useState(exit);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (exit === true) {
      setFade(true);
      if (withTimeout) {
        setTimeout(() => {
          setRemove(true);
        }, 1500);
      }
    }
  }, [exit]);

  if (remove) return null;

  return createPortal(
    <div className="loading-wrapper">
      <h3 className={fade ? "exit" : ""}>Loading...</h3>
      <div className={fade ? "icon-container exit" : "icon-container"}>
        <img src={logo} alt="Logo" />
      </div>
    </div>,
    document.querySelector("#portal")
  );
};
