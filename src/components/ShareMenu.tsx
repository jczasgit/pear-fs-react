import { FC, useEffect, useRef, useState } from "react";
import qrcode from "qrcode";
import "./ShareMenu.css";
import { useNotification } from "../hooks/useNotification";
import { nanoid } from "nanoid";
import Modal from "./Modal";

declare interface Props {
  isActive: boolean;
}

export const ShareMenu: FC<Props> = ({ isActive }) => {
  const shareMenu = useRef<HTMLDivElement>();
  const notification = useNotification();
  const [QRCodeModal, setQRCodeModal] = useState(false);
  const QRCode = useRef<string>("");

  useEffect(() => {
    if (!isActive) {
      if (shareMenu.current.classList.contains("active")) {
        shareMenu.current.classList.remove("active");
        shareMenu.current.classList.add("dormant");
      }
      setTimeout(() => {
        shareMenu.current.classList.remove("dormant");
      }, 500); // slide-right animation is 0.5s, let some grace time and remove from dom.
    } else {
      shareMenu.current.classList.add("active");
    }
  }, [isActive]);

  const copyURL = () => {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        notification({
          type: "ADD_NOTIFICATION",
          payload: {
            id: nanoid(),
            lifeSpan: 5000,
            message: "URL copied to clipboard!",
            title: "Share Notification",
            type: "success",
          },
        });
      })
      .catch((err) => {
        console.error(err);
        notification({
          type: "ADD_NOTIFICATION",
          payload: {
            id: nanoid(),
            lifeSpan: 5000,
            message: "Failed to copy URL to clipboard.",
            title: "Share Notification",
            type: "error",
          },
        });
      });
  };

  const showQRCode = () => {
    // open qrcode modal
    if (QRCode.current.length === 0) {
      qrcode.toDataURL(window.location.href, (err, code) => {
        if (err) {
          notification({
            type: "ADD_NOTIFICATION",
            payload: {
              id: nanoid(),
              lifeSpan: 5000,
              message: "Failed to generate QR code.",
              title: "Share Notification",
              type: "error",
            },
          });
          return;
        }

        QRCode.current = code;
        setQRCodeModal(true);
      });
    } else {
      setQRCodeModal(true);
    }
  };

  return (
    <div className="share-menu" ref={shareMenu}>
      <span className="share-icon" onClick={copyURL}>
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="primary-path"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      </span>
      <span className="share-icon" onClick={showQRCode}>
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="primary-path"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
      </span>
      <Modal
        isOpen={QRCodeModal}
        onClose={() => setQRCodeModal(false)}
        onSubmit={() => setQRCodeModal(false)}
        title="QR CODE"
      >
        <img src={QRCode.current} alt="QR CODE" />
      </Modal>
    </div>
  );
};
