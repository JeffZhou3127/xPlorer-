import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY } from "../../utils/glossary.js";
import "./InfoTip.css";

const TIP_WIDTH = 256; // px, matches .info-tip__bubble
const GAP = 8;
const EDGE = 8;

// Small "?" button that explains a term on hover or keyboard focus.
// The bubble is portalled to <body> with fixed positioning so the scrolling side panes
// can't clip it.
const InfoTip = ({ term, children }) => {
  const id = useId();
  const buttonRef = useRef(null);
  const [position, setPosition] = useState(null);

  const show = () => {
    const rect = buttonRef.current.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const left = Math.min(
      window.innerWidth - TIP_WIDTH - EDGE,
      Math.max(EDGE, center - TIP_WIDTH / 2),
    );
    // Open above the button unless it sits near the top of the screen.
    const above = rect.top > 160;
    setPosition({ left, top: above ? rect.top - GAP : rect.bottom + GAP, above });
  };
  const hide = () => setPosition(null);

  // A fixed bubble would drift away from its button on scroll, so close it instead.
  useEffect(() => {
    if (!position) return undefined;
    const onKey = (e) => e.key === "Escape" && hide();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [position]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="info-tip"
        aria-label={`What is ${term}?`}
        aria-describedby={position ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        ?
      </button>
      {position &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            className={`info-tip__bubble ${position.above ? "info-tip__bubble--above" : ""}`}
            style={{ left: position.left, top: position.top }}
          >
            <strong className="info-tip__term">{term}</strong>
            {children}
          </div>,
          document.body,
        )}
    </>
  );
};

// InfoTip for a glossary entry (`topic`, a GLOSSARY key).
export const Info = ({ topic }) => <InfoTip term={GLOSSARY[topic].term}>{GLOSSARY[topic].text}</InfoTip>;

export default InfoTip;
