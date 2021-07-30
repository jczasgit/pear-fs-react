import { createPortal } from "react-dom";
import { MouseEventHandler } from "react";
import "./Modal.css";

declare interface Props {
  isOpen: boolean;
  onClose: MouseEventHandler;
  onSubmit: MouseEventHandler;
  children?: any;
  title?: string;
}

export default function Modal({
  isOpen,
  onClose,
  onSubmit,
  children,
  title,
}: Props) {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="overlay"></div>
      <div className="modal">
        <div className="modal-header">
          <h3 className="title">{title ?? "Modal Title"}</h3>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-close">
            close
          </button>
          <button onClick={onSubmit} className="btn btn-submit">
            submit
          </button>
        </div>
      </div>
    </>,
    document.getElementById("portal")
  );
}
