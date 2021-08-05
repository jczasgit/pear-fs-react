import { FC } from "react";
import downloadSvg from "../assets/download.svg";
import uploadSvg from "../assets/upload.svg";
import "./FileCard.css";

declare interface Props {
  type: "upload" | "download";
  content: string;
}

export const FileCard: FC<Props> = ({ type, content }) => {
  return (
    <>
      <div className="file-card">
        <div className="card-thumbnail">
          <img
            src={type === "upload" ? uploadSvg : downloadSvg}
            alt="upload or download svg"
          />
        </div>
        <div className="card-content">{content}</div>
      </div>
    </>
  );
};
