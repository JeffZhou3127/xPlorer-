// Geometry for the CubeSat drawing (no React), in the same blueprint units as the rocket.
// The CubeSat is drawn centred on (CUBESAT_CENTER.x, CUBESAT_CENTER.y) with its nose up:
// a 12U body (2 × 3 units seen from the side), a deployed solar panel on each side and a
// small thruster under it.
export const CUBESAT_CENTER = { x: 150, y: 500 };
export const BODY_HALF_WIDTH = 24;
export const BODY_HALF_HEIGHT = 36;
export const PANEL_GAP = 4; // hinge gap between the body and a panel
export const PANEL_LENGTH = 46;
export const PANEL_HALF_HEIGHT = 14;
export const NOZZLE_LENGTH = 8;
export const NOZZLE_THROAT_HALF = 3;
export const NOZZLE_EXIT_HALF = 6;
export const FLAME_LENGTH = 34; // at full throttle

// Furthest any part reaches from the centre (the plume at full throttle), so a view can
// fit the CubeSat at any angle.
export const CUBESAT_RADIUS = BODY_HALF_HEIGHT + NOZZLE_LENGTH + FLAME_LENGTH;
