import { useEffect, useRef } from "react";

const CENTER = { x: 50, y: 44 };

export default function MouseSpotlight() {
  const spotlightRef = useRef(null);

  useEffect(() => {
    const element = spotlightRef.current;
    if (!element) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    let frameId;
    let current = { ...CENTER };
    let target = { ...CENTER };

    const applyPosition = () => {
      element.style.setProperty("--spotlight-x", `${current.x}%`);
      element.style.setProperty("--spotlight-y", `${current.y}%`);
    };

    const animate = () => {
      current.x += (target.x - current.x) * 0.14;
      current.y += (target.y - current.y) * 0.14;
      applyPosition();
      frameId = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event) => {
      target = {
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100
      };
    };

    applyPosition();

    if (!reduceMotion.matches && !coarsePointer.matches) {
      window.addEventListener("pointermove", handlePointerMove, { passive: true });
      frameId = window.requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return <div className="mouse-spotlight" ref={spotlightRef} aria-hidden="true" />;
}
