// Propellant transfer from the depot (mission 1, step 7). No React.

// The depot's tanks, in tonnes. It starts full and holds more than any rocket's stages
// combined (at most 50 + 150 + 400 t, see FUEL_RANGES), so it can always top them up.
export const DEPOT_CAPACITY_T = 1000;

// Real seconds before propellant starts to flow (lines connecting), and for the whole
// transfer however much is needed, so a big top-up doesn't drag on.
export const HOOKUP_SECONDS = 1.5;
export const TRANSFER_SECONDS = 8;

// The rocket's stages still attached after the flight, top first (next to the
// spacecraft, so filled first): { key, label, capacity, start } in tonnes.
// `stageIndex` and `stageFuel` (fractions) come from the flight; without them (e.g. the
// page was opened directly) only the top stage is left, and it is empty.
export const attachedTanks = (stages, flight) => {
  const stageIndex = flight?.stageIndex ?? stages.length - 1;
  const fuelLeft = flight?.stageFuel ?? stages.map(() => 0);
  return stages
    .map((stage, i) => ({
      key: stage.id,
      label: `Stage ${i + 1}`,
      capacity: stage.fuel,
      start: stage.fuel * (fuelLeft[i] ?? 0),
    }))
    .slice(stageIndex)
    .toReversed();
};

// Tonnes the depot has to transfer to fill every attached stage.
export const transferNeeded = (tanks) =>
  tanks.reduce((sum, { capacity, start }) => sum + (capacity - start), 0);

// Tonnes transferred `elapsed` real seconds after docking.
export const transferredAt = (needed, elapsed) => {
  const t = Math.min(1, Math.max(0, (elapsed - HOOKUP_SECONDS) / TRANSFER_SECONDS));
  return needed * t;
};

// Each tank's level (tonnes) once `transferred` tonnes have come across, filling the
// tanks in order (top stage first). The tank being filled is marked `filling`.
export const tankLevels = (tanks, transferred) => {
  let left = transferred;
  let fillingFound = false;
  return tanks.map((tank) => {
    const room = tank.capacity - tank.start;
    const added = Math.min(room, left);
    left -= added;
    const level = tank.start + added;
    const filling = !fillingFound && transferred > 0 && level < tank.capacity;
    if (filling) fillingFound = true;
    return { ...tank, level, filling };
  });
};
