import { createContext, useEffect, useState, useContext, FC } from "react";
import io, { Socket } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext<Socket>(SocketContext);
};

export const SocketProvider: FC<{ url: string }> = ({ children, url }) => {
  const [socket, setSocket] = useState(io(url, { autoConnect: false }));
  useEffect(() => {
    setSocket(io(url, { autoConnect: false }));
  }, [url]);

  return (
    <>
      <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
    </>
  );
};
