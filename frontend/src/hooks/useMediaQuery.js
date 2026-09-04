import { useEffect, useState } from "react";

export default function useMediaQuery(query) {
  const getMatches = () => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQueryList = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQueryList.matches);

    updateMatches();

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", updateMatches);
    } else {
      mediaQueryList.addListener(updateMatches);
    }

    window.addEventListener("orientationchange", updateMatches);

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", updateMatches);
      } else {
        mediaQueryList.removeListener(updateMatches);
      }

      window.removeEventListener("orientationchange", updateMatches);
    };
  }, [query]);

  return matches;
}
