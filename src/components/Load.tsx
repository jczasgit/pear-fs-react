import { nanoid } from "nanoid";
import { useEffect, useState } from "react";
import { RouteComponentProps } from "react-router";
import { useNotification } from "../hooks/useNotification";
import { Loading } from "./Loading";

declare interface Props extends RouteComponentProps {}

export const Load: React.FC<Props> = ({ history }) => {
  const notification = useNotification();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3001/api/room")
      .then((res) => res.json())
      .then((json) => {
        // when not joined successfully, joined is empty string
        if (json.roomId) {
          setLoading(false);
          history.push("/room/" + json.roomId);
        } else {
          // todo: Route to error page ❌
          // note: instead of an error page,
          // note: allow user to copy and paste 📝
          // note: ice candidate and manually connect
          alert("Could not join room");
        }
      })
      .catch((err) => {
        notification({
          type: "ADD_NOTIFICATION",
          payload: {
            id: nanoid(),
            lifeSpan: 5000,
            message: "Could not join a room. Please try again later.",
            title: "Server Error",
            type: "error",
          },
        });
        console.error(err);
      }); // todo: route to error page ❌
  }, [history]);

  return (
    <>
      <Loading exit={!loading} withTimeout={false} />
    </>
  );
};
