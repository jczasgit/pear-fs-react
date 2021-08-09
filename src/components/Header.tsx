import { FC } from "react";
import "./Header.css";
import logo from "../assets/logo.svg";

export const Header: FC = () => {
  return (
    <>
      <header>
        <div className="logo-wrapper">
          <img src={logo} alt="Pear-FS Logo" />
          <p className="logo">P2P File Sharing Site</p>
        </div>
      </header>
    </>
  );
};
