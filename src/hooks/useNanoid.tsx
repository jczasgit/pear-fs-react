import { createContext, useEffect, useState, useContext, FC } from "react";
import { customAlphabet } from "nanoid";

type customNanoid = () => string;

const nanoidContext = createContext(null);

export const useNanoid = () => {
  return useContext<customNanoid>(nanoidContext);
};

export const NanoidProvider: FC<{ characters: string; size: number }> = ({
  children,
  characters,
  size,
}) => {
  const [nanoid, setNanoid] = useState(null);
  useEffect(() => {
    setNanoid(customAlphabet(characters, size));
  }, [characters, size]);

  return (
    <>
      <nanoidContext.Provider value={nanoid}>{children}</nanoidContext.Provider>
    </>
  );
};
