import { useEffect, useRef, useState } from "react";
import { isCoasting, stepFlight } from "../utils/flightSim.js";

// Longest step the animation takes at once (s), so a stalled frame doesn't jump the flight.
const MAX_FRAME_STEP = 0.1;

// Runs the flight simulation (flightSim's stepFlight) once per animation frame, starting
// from `initial()` (called once). `controls` are stepFlight's, plus `timeScale` (the
// clock's warp) and `coastWarp` (the warp while coasting). They are read through a ref,
// so the loop starts only once. Used by the launch (M1S4) and Mars arrival (M1S9) panels.
const useFlight = (initial, controls) => {
  const [flight, setFlight] = useState(initial);
  const controlsRef = useRef(controls);

  useEffect(() => {
    controlsRef.current = controls;
  });

  useEffect(() => {
    let frame;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(MAX_FRAME_STEP, (now - last) / 1000);
      last = now;
      const { timeScale, coastWarp, ...flightControls } = controlsRef.current;
      setFlight((f) => {
        // A coast runs at its own warp until the sim marks its end.
        const scale = isCoasting(f, flightControls.coastStarted) ? coastWarp : timeScale;
        // Paused (warp 0): the flight freezes (same state, so no re-render), but the
        // controls can still be set.
        return scale > 0 ? stepFlight(f, flightControls, dt * scale) : f;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return flight;
};

export default useFlight;
