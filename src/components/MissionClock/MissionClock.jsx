import { formatMissionTime } from "../../utils/format.js";
import "./MissionClock.css";

// Mission clock fixed to the bottom centre of the screen. Under the time, ◀ #x ▶ steps
// the time warp down or up by 1× between 0 (shown as "Paused") and `maxWarp`; each arrow
// greys out at its end. `locked` disables both arrows while the warp is being set
// automatically (e.g. a coast warp that can be above `maxWarp`).
const MissionClock = ({ time, warp, maxWarp, onWarpChange, locked = false }) => (
  <div className="mission-clock">
    <span className="mission-clock__caption">{time < 0 ? "Countdown" : "Mission time"}</span>
    <span className="mission-clock__time" role="timer">
      {formatMissionTime(time)}
    </span>
    <div className="mission-clock__warp" role="group" aria-label="Time warp">
      <button
        type="button"
        className="mission-clock__arrow"
        aria-label={warp === 1 ? "Pause" : "Slow down time warp"}
        disabled={locked || warp <= 0}
        onClick={() => onWarpChange(warp - 1)}
      >
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M 8 1 L 2 5 L 8 9 Z" />
        </svg>
      </button>
      <output
        className={`mission-clock__warp-value ${warp === 0 ? "mission-clock__warp-value--paused" : ""}`}
        aria-live="polite"
      >
        {warp === 0 ? "Paused" : `${warp}x`}
      </output>
      <button
        type="button"
        className="mission-clock__arrow"
        aria-label={warp === 0 ? "Resume" : "Speed up time warp"}
        disabled={locked || warp >= maxWarp}
        onClick={() => onWarpChange(warp + 1)}
      >
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M 2 1 L 8 5 L 2 9 Z" />
        </svg>
      </button>
    </div>
  </div>
);

export default MissionClock;
