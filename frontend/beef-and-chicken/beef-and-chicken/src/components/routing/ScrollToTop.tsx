import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    /*
     * Hash links such as /#izdvajamo should
     * scroll to their section instead of the page top.
     */
    if (hash) {
      const elementId = decodeURIComponent(hash.replace("#", ""));

      const frameId = window.requestAnimationFrame(() => {
        const element = document.getElementById(elementId);

        if (element) {
          element.scrollIntoView({
            behavior: "auto",
            block: "start",
          });

          return;
        }

        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "auto",
        });
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [pathname, hash]);

  return null;
}
