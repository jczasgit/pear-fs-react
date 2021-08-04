import React, { useEffect } from "react";
import { RouteComponentProps } from "react-router";

declare interface Props extends RouteComponentProps {}

export const Load: React.FC<Props> = ({ history }) => {
  useEffect(() => {
    fetch("http://localhost:3001/api/room")
      .then((res) => res.json())
      .then((json) => {
        // when not joined successfully, joined is empty string
        if (json.roomId) {
          history.push("/room/" + json.roomId);
        } else {
          // todo: Route to error page ❌
          // note: instead of an error page,
          // note: allow user to copy and paste 📝
          // note: ice candidate and manually connect
          alert("Could not join room");
        }
      })
      .catch(console.error); // todo: route to error page ❌
  }, [history]);

  return <React.Fragment>Loading...</React.Fragment>;
};
