import { format, formatMissionTime } from "./format.js";

// Wording for the mission failure screen (no React).
// `failure` is the record from flightSim (`flight.failure`): { kind: "crash" | "fuel" |
// "twr", goal: 1 | 2, time (s), altitude, apogee, perigee (m; apogee null on escape,
// perigee null below the surface), speed (m/s, crashes only), twr and throttle (0–1,
// "twr" only: the thrust-to-weight ratio at T-0 and the throttle it was lit at) }.
// `targets` holds the goal windows in km: { apogee: { min, max }, perigee: { min, max } }.

const km = (metres) => `${format(metres / 1000, 1)} km`;
const perigeeText = (perigee) => (perigee === null ? "below the surface" : `at ${km(perigee)}`);
const windowText = ({ min, max }) => `${min}–${max} km`;
// Where a height (m, or null = none) sits against a window in km.
const side = (value, { min, max }) => {
  if (value === null || value < min * 1000) return "below";
  return value > max * 1000 ? "above" : "inside";
};

// { reason, detail, tip } sentences explaining what happened.
export const explainFailure = (failure, targets) => {
  if (!failure) {
    return {
      reason: "The flight ended before the mission's goals were reached.",
      detail: null,
      tip: "Launch again and work through both phase goals.",
    };
  }

  const when = formatMissionTime(failure.time);
  const apogeeKm = windowText(targets.apogee);
  const perigeeKm = windowText(targets.perigee);

  if (failure.kind === "twr") {
    const throttledDown = failure.throttle < 1;
    return {
      reason: `The rocket never left the pad. At T−0 its thrust-to-weight ratio was ${format(failure.twr, 2)}, and it needs to be above 1 to lift off.`,
      detail: `Its engines${throttledDown ? ` (at ${Math.round(failure.throttle * 100)}% throttle)` : ""} pushed with less force than the rocket's own weight, so gravity held it down.`,
      tip: throttledDown
        ? "Set the throttle to 100% during the countdown. If that still isn't enough, give the first stage more powerful engines or make the rocket lighter."
        : "Give the first stage more powerful engines, add SRBs, or make the rocket lighter (less fuel in the upper stages or a lighter payload).",
    };
  }

  if (failure.kind === "crash") {
    const reason = `The rocket crashed back into the ground at ${format(Math.round(failure.speed))} m/s, ${when}.`;
    if (failure.goal === 1) {
      return {
        reason,
        detail: `It was still climbing toward the first goal, an apogee of ${apogeeKm}, when gravity pulled it back down.`,
        tip: "Keep the engines burning and tip over gradually. Turning too far or too early, or shutting the engines down too soon, lets the rocket fall back before it is high and fast enough.",
      };
    }
    return {
      reason,
      detail: "It never reached a stable orbit: its perigee was still below the surface, so its path met the Earth.",
      tip: `Near apogee, point the rocket horizontally (90°) and burn until the perigee rises into ${perigeeKm} before shutting down.`,
    };
  }

  // Out of fuel.
  if (failure.goal === 1) {
    const apogeeText = failure.apogee === null ? "on an escape path" : `at ${km(failure.apogee)}`;
    const where = side(failure.apogee ?? Infinity, targets.apogee);
    if (where === "below") {
      return {
        reason: `The rocket ran out of fuel at ${when} with its apogee ${apogeeText}, short of the ${apogeeKm} goal.`,
        detail: "With every stage empty, nothing could push the apogee any higher.",
        tip: "Waste less propellant fighting gravity and air: lift off at full throttle and pitch over gradually. If it still falls short, the rocket needs more fuel, more efficient engines or less weight.",
      };
    }
    return {
      reason: `The rocket ran out of fuel at ${when} with its apogee ${apogeeText}${where === "above" ? `, above the ${apogeeKm} goal` : ""}.`,
      detail: where === "above"
        ? "The burn went on too long, and there was nothing left to correct the overshoot or to circularise the orbit."
        : "The apogee was in range, but there was nothing left for the circularisation burn at apogee.",
      tip: `Shut the engines down as soon as the apogee enters ${apogeeKm} and press Next goal. Every extra second of burning costs fuel the circularisation burn needs.`,
    };
  }
  if (side(failure.perigee, targets.perigee) === "above") {
    return {
      reason: `The rocket ran out of fuel at ${when} with its perigee at ${km(failure.perigee)}, above the ${perigeeKm} goal.`,
      detail: "The circularisation burn overshot, and there was no propellant left to bring the perigee back down.",
      tip: `Watch the perigee during the burn and shut the engines down as soon as it enters ${perigeeKm}.`,
    };
  }
  if (side(failure.perigee, targets.perigee) === "inside") {
    // The perigee was fine, so the apogee (never below the perigee) had climbed too high.
    const apogeeText = failure.apogee === null ? "on an escape path" : `at ${km(failure.apogee)}`;
    return {
      reason: `The rocket ran out of fuel at ${when} with its perigee in range but its apogee ${apogeeText}, above the ${apogeeKm} goal.`,
      detail: "The circularisation burn went on too long and stretched the orbit, and there was no propellant left to bring the apogee back down.",
      tip: `Watch both readouts during the burn and shut the engines down as soon as the perigee enters ${perigeeKm} while the apogee is still within ${apogeeKm}.`,
    };
  }
  return {
    reason: `The rocket ran out of fuel at ${when} before circularising the orbit. Its perigee was ${perigeeText(failure.perigee)}, short of the ${perigeeKm} needed.`,
    detail: `The first goal (an apogee of ${apogeeKm}) was reached, but there was not enough propellant left for the burn at apogee.`,
    tip: `Stop the first burn as soon as the apogee enters ${apogeeKm}. Every bit of extra climb costs fuel that the circularisation burn needs.`,
  };
};

// Short label/value rows summarising the flight at the moment it failed.
export const failureSummary = (failure) => {
  if (!failure) return [];
  const rows = [
    { label: "Mission time", value: formatMissionTime(failure.time) },
    { label: "Phase", value: failure.goal === 1 ? "Goal 1: raise apogee" : "Goal 2: circularise" },
  ];
  if (failure.kind === "twr") {
    rows.push(
      { label: "Thrust-to-weight", value: format(failure.twr, 2) },
      { label: "Throttle", value: `${Math.round(failure.throttle * 100)}%` },
    );
  } else if (failure.kind === "crash") {
    rows.push({ label: "Impact speed", value: `${format(Math.round(failure.speed))} m/s` });
  } else {
    rows.push(
      { label: "Altitude", value: km(failure.altitude) },
      { label: "Apogee", value: failure.apogee === null ? "Escape" : km(failure.apogee) },
      { label: "Perigee", value: failure.perigee === null ? "Below surface" : km(failure.perigee) },
    );
  }
  return rows;
};
