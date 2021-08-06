import { useEffect, useState } from "react";

export default function Icon({ filename, className = "", onClick = null }) {
  const [loading, setLoading] = useState(false);
  const [iconSource, setIconSource] = useState(null);

  useEffect(() => {
    setLoading(true);

    const importFruit = async () => {
      try {
        setIconSource(
          `${process.env.REACT_APP_API_ENDPOINT}/avatars/${filename}`
        );
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    };

    importFruit();
  }, [filename]);

  if (!loading && iconSource) {
    return (
      <img
        src={iconSource}
        alt="fruit avatar"
        className={className}
        onClick={onClick}
      />
    );
  }

  return null;
}
