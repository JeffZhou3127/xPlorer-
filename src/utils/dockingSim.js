// Docking with the refueling depot (mission 1, step 6). No React.
// Frame: the depot's docking port at the origin, x right, y up, z out of the port toward
// the spacecraft (so z is the distance still to close). Metres, m/s, degrees.
// The spacecraft's own docking port carries the camera, so its position is the camera's.
// Control is by RCS pulses: each press adds a fixed velocity (in the spacecraft's own
// axes, so a misaligned spacecraft pushes itself slightly sideways) or turn rate, and
// spends RCS Δv from the spacecraft design.
import { format } from "./format.js";

// Contact must be within these to dock.
export const DOCKING_TOLERANCE = { offset: 0.1, speed: 0.2, angle: 1 }; // m, m/s, degrees
export const START_DISTANCE_M = 100;
// Drifting this far from the port ends the attempt.
export const MAX_RANGE_M = 250;

// Velocity (m/s) or turn rate (°/s) added by one pulse, per precision setting.
export const TRANSLATION_STEP = { coarse: 0.05, fine: 0.01 };
export const ROTATION_STEP = { coarse: 0.2, fine: 0.05 };
// RCS Δv spent per °/s of turn rate changed (the thrusters fire in opposed pairs).
const ROTATION_DV_COST = 0.05;

// The approach starts slightly off, by a random amount each time: a couple of metres off
// the axis and a few degrees out in every axis, so flying straight forward misses.
const START_OFFSET_M = { min: 1, max: 3 };
const START_ANGLE_DEG = { min: 1.5, max: 5 };

// A random value between `min` and `max` with a random sign, rounded to a tenth.
const randomOff = ({ min, max }) => {
  const value = min + Math.random() * (max - min);
  return Math.round((Math.random() < 0.5 ? -value : value) * 10) / 10;
};

// Thrust directions in the spacecraft's axes (forward is −z, toward the depot when aligned).
export const DIRECTIONS = {
  forward: { x: 0, y: 0, z: -1 },
  back: { x: 0, y: 0, z: 1 },
  left: { x: -1, y: 0, z: 0 },
  right: { x: 1, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  down: { x: 0, y: -1, z: 0 },
};

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (v, k) => ({ x: v.x * k, y: v.y * k, z: v.z * k });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const length = (v) => Math.hypot(v.x, v.y, v.z);
const rad = (deg) => (deg * Math.PI) / 180;

const rotX = ({ x, y, z }, a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x, y: c * y - s * z, z: s * y + c * z };
};
const rotY = ({ x, y, z }, a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: c * x + s * z, y, z: -s * x + c * z };
};
const rotZ = ({ x, y, z }, a) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: c * x - s * y, y: s * x + c * y, z };
};

// Attitude signs: yaw + turns the nose right, pitch + up, roll + clockwise as seen
// from inside (the top of the view tips right).
export const bodyToWorld = (v, { roll, pitch, yaw }) => rotY(rotX(rotZ(v, rad(-roll)), rad(pitch)), rad(-yaw));
export const worldToBody = (v, { roll, pitch, yaw }) => rotZ(rotX(rotY(v, rad(yaw)), rad(-pitch)), rad(roll));

// A fresh approach from a random start, with `rcsDeltaV` m/s of RCS to spend.
export const initialDocking = (rcsDeltaV) => ({
  time: 0,
  pos: { x: randomOff(START_OFFSET_M), y: randomOff(START_OFFSET_M), z: START_DISTANCE_M },
  vel: { x: 0, y: 0, z: 0 },
  attitude: {
    roll: randomOff(START_ANGLE_DEG),
    pitch: randomOff(START_ANGLE_DEG),
    yaw: randomOff(START_ANGLE_DEG),
  },
  rates: { roll: 0, pitch: 0, yaw: 0 },
  rcsDeltaV,
  rcsUsed: 0,
  // null while flying; then { docked, reasons } at contact (or on drifting away).
  result: null,
});

export const rcsRemaining = (state) => Math.max(0, state.rcsDeltaV - state.rcsUsed);

// Removes floating-point dust so a rate nulled by equal and opposite pulses reads 0.
const tidy = (value) => Math.round(value * 1e6) / 1e6;

// One translation pulse of `step` m/s toward `direction` (a DIRECTIONS key).
export const translate = (state, direction, step) => {
  if (state.result || rcsRemaining(state) < step) return state;
  const dv = bodyToWorld(scale(DIRECTIONS[direction], step), state.attitude);
  const vel = add(state.vel, dv);
  return {
    ...state,
    vel: { x: tidy(vel.x), y: tidy(vel.y), z: tidy(vel.z) },
    rcsUsed: state.rcsUsed + step,
  };
};

// One rotation pulse changing the `axis` ("roll", "pitch" or "yaw") rate by `sign` × `step` °/s.
export const rotate = (state, axis, sign, step) => {
  const cost = step * ROTATION_DV_COST;
  if (state.result || rcsRemaining(state) < cost) return state;
  return {
    ...state,
    rates: { ...state.rates, [axis]: tidy(state.rates[axis] + sign * step) },
    rcsUsed: state.rcsUsed + cost,
  };
};

// How far the docking is from the tolerances right now.
export const dockingErrors = ({ pos, vel, attitude }) => ({
  offset: Math.hypot(pos.x, pos.y),
  speed: length(vel),
  angle: Math.max(Math.abs(attitude.roll), Math.abs(attitude.pitch), Math.abs(attitude.yaw)),
});

const contactResult = (state) => {
  const { offset, speed, angle } = dockingErrors(state);
  const reasons = [];
  if (offset > DOCKING_TOLERANCE.offset) {
    reasons.push(`Missed the centre of the port by ${format(offset, 2)} m (must be within ${DOCKING_TOLERANCE.offset} m).`);
  }
  if (speed >= DOCKING_TOLERANCE.speed) {
    reasons.push(`Hit the depot at ${format(speed, 2)} m/s (must be under ${DOCKING_TOLERANCE.speed} m/s).`);
  }
  if (angle > DOCKING_TOLERANCE.angle) {
    reasons.push(`Came in ${format(angle, 1)}° out of alignment (must be within ${DOCKING_TOLERANCE.angle}°).`);
  }
  return { docked: reasons.length === 0, reasons };
};

// Advances the approach by `dt` seconds. Stops at contact (the spacecraft's port reaching
// the depot's, z = 0) or on drifting more than MAX_RANGE_M away.
export const stepDocking = (state, dt) => {
  if (state.result) return state;
  const { pos, vel, attitude, rates } = state;
  // Cut the step short at contact, so it is judged where it actually happened.
  const contact = pos.z + vel.z * dt <= 0;
  const t = contact ? (vel.z < 0 ? pos.z / -vel.z : 0) : dt;
  const next = {
    ...state,
    time: state.time + t,
    pos: add(pos, scale(vel, t)),
    attitude: {
      roll: attitude.roll + rates.roll * t,
      pitch: attitude.pitch + rates.pitch * t,
      yaw: attitude.yaw + rates.yaw * t,
    },
  };
  if (contact) return { ...next, pos: { ...next.pos, z: 0 }, result: contactResult(next) };
  if (length(next.pos) > MAX_RANGE_M) {
    return { ...next, result: { docked: false, reasons: [`Drifted more than ${MAX_RANGE_M} m from the depot.`] } };
  }
  return next;
};
