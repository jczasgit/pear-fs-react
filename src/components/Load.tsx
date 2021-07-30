import React, { useEffect } from "react";
import { RouteComponentProps } from "react-router";
import { nanoid } from "nanoid";

declare interface Props extends RouteComponentProps {}

export const Load: React.FC<Props> = ({ history }) => {
  useEffect(() => {
    let roomId = nanoid();

    fetch("http://localhost:3001/api/room/" + roomId)
      .then((res) => res.json())
      .then((json) => {
        roomId = json.roomId;
        history.push("/room/" + roomId);
      })
      .catch(console.error); // todo: route to error page
  });

  return <React.Fragment>Loading...</React.Fragment>;
};
