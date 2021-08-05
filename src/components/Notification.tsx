import { FC, useEffect, useRef, useState, Dispatch } from "react";
import { Timer } from "../helpers/timer";
import queueMicrotask from "queue-microtask";
import "./Notification.css";
import { Action } from "../hooks/useNotification";

export type iNotificationType = "info" | "success" | "warning" | "error";

export interface iNotification {
  id: string;
  lifeSpan: number;
  title: string;
  message: string;
  type: iNotificationType;
}

declare interface NotificationProps {
  id: string;
  lifeSpan: number;
  title: string;
  message: string;
  type: iNotificationType;
  dispatch: Dispatch<Action>;
}

export const Notification: FC<NotificationProps> = ({
  id,
  lifeSpan,
  title,
  message,
  type,
  dispatch,
}) => {
  const [exit, setExit] = useState(false);
  const timerRef = useRef(new Timer(id, lifeSpan));

  useEffect(() => {
    timerRef.current.once("timeout", (_id) => {
      // console.log(`Timer for: ${_id}`);
      setExit(true);
      setTimeout(
        queueMicrotask.bind(
          null,
          dispatch.bind(null, {
            type: "REMOVE_NOTIFICATION",
            id: _id,
          })
        ),
        500
      );
    });

    timerRef.current.start();
  }, [dispatch]);

  const dismiss = () => {
    timerRef.current.pause();
    timerRef.current.removeAllListeners("timeout");
    setExit(true);
    setTimeout(
      queueMicrotask.bind(
        null,
        dispatch.bind(null, {
          type: "REMOVE_NOTIFICATION",
          id,
        })
      ),
      500
    );
  };

  return (
    <>
      <div
        className={`notification ${type} ${exit ? "exit" : ""}`}
        onClick={dismiss}
        onMouseEnter={() => {
          console.log("enter");
          timerRef.current.pause();
        }}
        onMouseLeave={() => {
          console.log("leave");
          timerRef.current.start();
        }}
      >
        <div className="title">
          <span>{title}</span>
        </div>
        <div className="message">
          <p>{message}</p>
        </div>
        <div className="side-bar" />
      </div>
    </>
  );
};
