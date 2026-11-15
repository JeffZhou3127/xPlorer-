// X3DOM (declarative 3D in the DOM, as used by NASA's mission-viz orrery demos) is a
// classic script that defines a global `x3dom`, so it is loaded with a <script> tag the
// first time a 3D view opens rather than bundled as a module.
import x3domUrl from "x3dom/x3dom.js?url";
import "x3dom/x3dom.css";

let loading = null;

export const loadX3dom = () => {
  loading ??= new Promise((resolve, reject) => {
    if (window.x3dom) {
      resolve(window.x3dom);
      return;
    }
    const script = document.createElement("script");
    script.src = x3domUrl;
    script.onload = () => resolve(window.x3dom);
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not load X3DOM"));
    };
    document.head.appendChild(script);
  });
  return loading;
};

// Stops and forgets the X3DOM canvas for an <x3d> element that is about to be removed.
export const shutdownX3dom = (x3dElement) => {
  const { x3dom } = window;
  if (!x3dom || !x3dElement) return;
  const index = x3dom.canvases.findIndex((canvas) => canvas.x3dElem === x3dElement);
  if (index === -1) return;
  const canvas = x3dom.canvases[index];
  canvas.doc?.shutdown(canvas.gl);
  x3dom.canvases.splice(index, 1);
};
