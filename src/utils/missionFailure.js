import { format, formatDistance, formatMissionTime } from "./format.js";
import { CABIN_MAX_C, RCS_PER_DAY, RCS_SETTLE, isCruiseFailure } from "./cruiseSystems.js";
import { MARS_SOLAR_FACTOR } from "./spacecraftPhysics.js";
import { G_LIMIT, SHIELD_LIMIT_C, isReentryFailure } from "./reentry.js";

// Wording for the mission failure screen (no React).
// `failure` is the record from flightSim (`flight.failure`): { kind: "crash" | "fuel" |
// "twr" | "escape" (Mars only), body ("Earth" for the launch, "Mars" for the orbit
// insertion), goal: 1 | 2, time (s), altitude, apogee, perigee (m; apogee null on escape,
// perigee null below the surface), speed (m/s, crashes only), twr and throttle (0–1,
// "twr" only: the thrust-to-weight ratio at T-0 and the throttle it was lit at) }.
// Or a cruise failure from cruiseSystems (`cruiseTimeline`): { kind: "power" | "heat" |
// "rcs", time (s since the ejection burn), au, solar, demand (kW), battery,
// batteryCapacity (kWh), temperature (°C), heatLoad, heatRejection (kW), rcs, rcsStart
// (m/s), target ("Mars" or "Earth", the planet headed for), targetDistance (m) }.
// Or a reentry failure from reentry.js (`reentryFailure`): { kind: "burnup" | "skip", cause
// ("heat" | "overload", burnup only), body "Earth", time (s since the entry interface),
// entryAngle, aoa (degrees), altitude, speed, lowest (m, the lowest point reached), maxG,
// section (the hottest heat shield section), maxTemp (°C) }.
// `targets` holds the goal windows in km: { apogee: { min, max }, perigee: { min, max } }.

const km = (metres) => `${format(metres / 1000, 1)} km`;
const perigeeText = (perigee) => (perigee === null ? "below the surface" : `at ${km(perigee)}`);
const windowText = ({ min, max }) => `${min}–${max} km`;
// Where a height (m, or null = none) sits against a window in km.
const side = (value, { min, max }) => {
  if (value === null || value < min * 1000) return "below";
  return value > max * 1000 ? "above" : "inside";
};

const cruiseDay = (failure) => `day ${Math.floor(failure.time / 86400)}`;

// { reason, detail, tip } for a systems failure on the way to Mars or back to Earth.
const explainCruiseFailure = (failure) => {
  const where = `${format(failure.au, 2)} AU from the Sun`;
  if (failure.kind === "power") {
    return {
      reason: `The batteries ran flat on ${cruiseDay(failure)}, ${where}, and the spacecraft lost power.`,
      detail: `Sunlight weakens with distance from the Sun. Out there the solar panels made only ${format(failure.solar, 2)} kW against the ${format(failure.demand, 1)} kW that life support and avionics need, and the ${format(failure.batteryCapacity)} kWh battery couldn't cover the gap for long.`,
      tip: `Fit bigger solar panels. Near Mars they make only about ${Math.round(MARS_SOLAR_FACTOR * 100)}% of their Earth output, so they need at least ${format(failure.demand / MARS_SOLAR_FACTOR, 1)} kW near Earth: watch the "Power at Mars" meter in the spacecraft designer.`,
    };
  }
  if (failure.kind === "heat") {
    return {
      reason: `The cabin overheated past ${CABIN_MAX_C} °C on ${cruiseDay(failure)}.`,
      detail: `The crew and electronics make ${format(failure.heatLoad, 1)} kW of heat, but the radiators can only reject ${format(failure.heatRejection, 1)} kW to space. The rest built up day after day.`,
      tip: `Fit radiators that reject at least ${format(failure.heatLoad, 1)} kW: watch the "Heat rejection" meter in the spacecraft designer.`,
    };
  }
  return {
    reason: `The RCS ran dry on ${cruiseDay(failure)}, and the spacecraft could no longer hold its attitude.`,
    detail: `The spacecraft had ${format(failure.rcsStart, 1)} m/s of RCS Δv left at the burn. Turning to the cruise attitude takes ${format(RCS_SETTLE)} m/s, and the small trims that keep the solar panels on the Sun use about ${format(RCS_PER_DAY, 2)} m/s a day.`,
    tip:
      failure.target === "Moon"
        ? "Carry more RCS fuel in the lander designer: watch the \"RCS Δv\" meter."
        : "Carry more RCS fuel in the spacecraft designer (it has to last both dockings and both cruises), and dock with fewer, finer pulses so more is left for the cruise.",
  };
};

// { reason, detail, tip } for a failed Earth reentry.
const explainReentryFailure = (failure) => {
  const how = `at ${format(failure.entryAngle, 1)}° and an angle of attack of ${format(failure.aoa, 1)}°`;
  if (failure.kind === "skip") {
    return {
      reason: `The capsule skipped off the atmosphere and drifted back into space, ${formatMissionTime(failure.time)} after the entry interface.`,
      detail: `Entering ${how}, it dipped only to ${km(failure.lowest)}: too shallow for the thin upper air to slow it below orbital speed, so it climbed back out like a stone skipping on water.`,
      tip: "Enter more steeply (about 6–7° below the horizon on the way back from Mars). A little angle of attack helps too: the guidance points the lift down when the capsule starts to climb, holding it in the atmosphere.",
    };
  }
  if (failure.cause === "overload") {
    return {
      reason: `The capsule broke apart under ${format(failure.maxG, 1)} g of deceleration and burned up, ${km(failure.altitude)} up.`,
      detail: `Entering ${how}, it plunged into thick air too fast. Past ${G_LIMIT} g, neither the crew nor the structure survive.`,
      tip: "Enter more shallowly, or give the capsule some angle of attack: its lift holds it higher, where the air is thinner, and spreads the braking out.",
    };
  }
  const windward = failure.section === "Windward shoulder";
  return {
    reason: `The heat shield burned through at the ${failure.section.toLowerCase()}, ${km(failure.altitude)} up, and the capsule burned up.`,
    detail: `Entering ${how}, it reached ${format(failure.maxTemp)} °C there, past the ${format(SHIELD_LIMIT_C)} °C the ablator can take.`,
    tip: windward
      ? "Lower the angle of attack: tilting the capsule turns its windward shoulder into the flow, and that section takes much more of the heat than the rest. Keep just enough for the lift you need."
      : "Enter more shallowly: the steeper the dive, the denser the air the capsule meets at full speed, and the hotter the shield gets.",
  };
};

// Did the flight fail around Mars (the orbit insertion, step 9)?
export const isMarsFailure = (failure) => failure?.body === "Mars";

// { reason, detail, tip } for a failed Mars orbit insertion.
const explainCaptureFailure = (failure, targets) => {
  const when = formatMissionTime(failure.time);
  const apogeeKm = windowText(targets.apogee);
  const perigeeKm = windowText(targets.perigee);
  const burnTip = `Start the burn about a minute before perigee with the rocket pointed against the direction of travel, and shut down as soon as the apogee drops into ${apogeeKm}.`;
  if (failure.kind === "crash") {
    return {
      reason: `The spacecraft hit Mars at ${format(Math.round(failure.speed))} m/s, ${when} after arriving.`,
      detail: "Its path dipped below the surface. Burning while pointed toward Mars (down) rather than straight against the direction of travel pulls the low point of the orbit down.",
      tip: `Hold the attitude against the direction of travel and watch the perigee: it should stay in ${perigeeKm}. ${burnTip}`,
    };
  }
  if (failure.kind === "escape") {
    return {
      reason: `The spacecraft swung past Mars without being captured and was still on an escape path ${km(failure.altitude)} up.`,
      detail: `Above ${format(targets.apogee.max)} km on the way out, no orbit with an apogee in ${apogeeKm} could be reached any more.`,
      tip: `A capture burn must happen near perigee, where it is most effective. ${burnTip}`,
    };
  }
  const apogeeText = failure.apogee === null ? "still on an escape path" : `with its apogee at ${km(failure.apogee)}`;
  return {
    reason: `The rocket ran out of fuel ${when} after arriving, ${apogeeText}.`,
    detail: `Braking into a ${apogeeKm} apogee orbit takes over 1 km/s, and the stages left after the ejection burn couldn't give it.`,
    tip: `Burn at full throttle around perigee, where braking is most effective, and stop as soon as the orbit is in range. If it still falls short, the rocket needs more Δv left after the ejection burn: a larger upper stage, or a smaller ejection burn.`,
  };
};

// { reason, detail, tip } sentences explaining what happened.
export const explainFailure = (failure, targets) => {
  if (isReentryFailure(failure)) return explainReentryFailure(failure);
  if (isCruiseFailure(failure)) return explainCruiseFailure(failure);
  if (isMarsFailure(failure)) return explainCaptureFailure(failure, targets);
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

// Short label/value rows summarising the flight at the moment it failed (`info`: a
// glossary key for the label's "?", where the term needs explaining).
export const failureSummary = (failure) => {
  if (!failure) return [];
  if (isReentryFailure(failure)) {
    return [
      { label: "Since entry interface", value: formatMissionTime(failure.time) },
      { label: "Phase", value: "Earth reentry" },
      { label: "Entry angle", value: `${format(failure.entryAngle, 1)}°`, info: "entryAngle" },
      { label: "Angle of attack", value: `${format(failure.aoa, 1)}°`, info: "angleOfAttack" },
      { label: "Peak deceleration", value: `${format(failure.maxG, 1)} g`, info: "gForce" },
      { label: `Hottest (${failure.section.toLowerCase()})`, value: `${format(failure.maxTemp)} °C`, info: "heatShield" },
    ];
  }
  if (isCruiseFailure(failure)) {
    const rows = [
      { label: "Mission day", value: format(Math.floor(failure.time / 86400)) },
      { label: "Phase", value: `Cruise to ${failure.target ?? "Mars"}` },
      { label: "From the Sun", value: `${format(failure.au, 3)} AU`, info: "au" },
      { label: `To ${failure.target ?? "Mars"}`, value: formatDistance(failure.targetDistance) },
    ];
    if (failure.kind === "power") {
      rows.push(
        { label: "Solar output", value: `${format(failure.solar, 2)} kW`, info: "solarOutput" },
        { label: "Demand", value: `${format(failure.demand, 1)} kW`, info: "powerDemand" },
      );
    } else if (failure.kind === "heat") {
      rows.push(
        { label: "Heat load", value: `${format(failure.heatLoad, 1)} kW`, info: "heatLoad" },
        { label: "Radiators", value: `${format(failure.heatRejection, 1)} kW`, info: "heatRejection" },
      );
    } else {
      rows.push({ label: "RCS at the burn", value: `${format(failure.rcsStart, 1)} m/s`, info: "rcsDeltaV" });
    }
    return rows;
  }
  const rows = [
    { label: "Mission time", value: formatMissionTime(failure.time) },
    {
      label: "Phase",
      value: isMarsFailure(failure)
        ? "Mars orbit insertion"
        : failure.goal === 1 ? "Goal 1: raise apogee" : "Goal 2: circularise",
    },
  ];
  if (failure.kind === "twr") {
    rows.push(
      { label: "Thrust-to-weight", value: format(failure.twr, 2), info: "liftoffThrustToWeight" },
      { label: "Throttle", value: `${Math.round(failure.throttle * 100)}%`, info: "throttle" },
    );
  } else if (failure.kind === "crash") {
    rows.push({ label: "Impact speed", value: `${format(Math.round(failure.speed))} m/s` });
  } else {
    rows.push(
      { label: "Altitude", value: km(failure.altitude) },
      { label: "Apogee", value: failure.apogee === null ? "Escape" : km(failure.apogee), info: "apogee" },
      { label: "Perigee", value: failure.perigee === null ? "Below surface" : km(failure.perigee), info: "perigee" },
    );
  }
  return rows;
};
