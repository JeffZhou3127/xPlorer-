import { useEffect, useState } from "react";

// Seconds since a burn, advancing at `rate` simulated seconds per real second once
// `running`, until `until`. Returns [time, setTime] (setTime(0) to fly it again).
// Used by the ejection burns (M1S8A13) and the Moon transfer (M2S4).
const useCoast = (running, until, rate) => {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    let frame;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setTime((t) => Math.min(until, t + dt * rate));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, until, rate]);
  return [time, setTime];
};

export default useCoast;
