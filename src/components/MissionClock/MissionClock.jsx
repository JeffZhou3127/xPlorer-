import { formatMissionTime } from "../../utils/format.js";
import "./MissionClock.css";

// Mission clock fixed to the bottom centre of the screen. Under the time, ◀ #x ▶ steps
// the time warp down or up by 1× between 0 (shown as "Paused") and `maxWarp`; each arrow
// greys out at its end. `steps` (an ascending list starting at 0) replaces those 1×
// steps with its own levels, for warps into the hundreds. `locked` disables both arrows
// while the warp is being set automatically (e.g. a coast warp that can be above
// `maxWarp`). `caption` labels the time once it is past zero (before that it reads
// "Countdown").
const MissionClock = ({ time, warp, maxWarp, onWarpChange, locked = false, caption = "Mission time", steps }) => {
  const levels = steps ?? Array.from({ length: maxWarp + 1 }, (_, i) => i);
  const lower = levels.filter((level) => level < warp).at(-1);
  const higher = levels.find((level) => level > warp);

  return (
    <div className="mission-clock">
      <span className="mission-clock__caption">{time < 0 ? "Countdown" : caption}</span>
      <span className="mission-clock__time" role="timer">
        {formatMissionTime(time)}
      </span>
      <div className="mission-clock__warp" role="group" aria-label="Time warp">
        <button
          type="button"
          className="mission-clock__arrow"
          aria-label={lower === 0 ? "Pause" : "Slow down time warp"}
          disabled={locked || lower === undefined}
          onClick={() => onWarpChange(lower)}
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
          disabled={locked || higher === undefined}
          onClick={() => onWarpChange(higher)}
        >
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path d="M 2 1 L 8 5 L 2 9 Z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MissionClock;
