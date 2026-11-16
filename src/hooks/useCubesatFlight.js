import { useEffect, useRef, useState } from "react";
import { stepCubesat } from "../utils/cubesatFlight.js";

// Longest step the animation takes at once (s of real time), so a stalled frame doesn't
// jump the flight.
const MAX_FRAME_STEP = 0.1;

// Runs cubesatFlight's stepCubesat once per animation frame, starting from `initial()`
// (called once). `controls`: stepCubesat's ({ throttle, targetAttitude }) plus `warp`
// (the clock's time warp, 0 = paused). The attitude keeps turning in real time while
// paused. Controls are read through a ref, so the loop starts only once.
const useCubesatFlight = (initial, controls) => {
  const [flight, setFlight] = useState(initial);
  const controlsRef = useRef(controls);

  useEffect(() => {
    controlsRef.current = controls;
  });

  useEffect(() => {
    let frame;
    let last = performance.now();
    const tick = (now) => {
      const realDt = Math.min(MAX_FRAME_STEP, (now - last) / 1000);
      last = now;
      const { warp, ...stepControls } = controlsRef.current;
      setFlight((f) => stepCubesat(f, stepControls, realDt * warp, realDt));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return flight;
};

export default useCubesatFlight;
