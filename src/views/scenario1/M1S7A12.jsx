import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router";
import RefuelPanel from "../../components/RefuelPanel/RefuelPanel.jsx";
import RefuelDiagram from "../../components/RefuelDiagram/RefuelDiagram.jsx";
import FuelGauges from "../../components/FuelGauges/FuelGauges.jsx";
import { selectRocket } from "../../store/rocketSlice.js";
import {
  DEPOT_CAPACITY_T,
  HOOKUP_SECONDS,
  TRANSFER_SECONDS,
  attachedTanks,
  tankLevels,
  transferNeeded,
  transferredAt,
} from "../../utils/refueling.js";

const tonnes = (t) => `${t.toFixed(1)} t`;

// The two refuelings this view runs: the panel title and where Undock leads.
const LEGS = {
  outbound: { title: "Refueling", next: "/m1-s8" },
  return: { title: "Refueling at Mars", next: "/m1-s13" },
};

// Real seconds since the page opened, per animation frame, stopping at `until`.
const useElapsed = (until) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(until, (now - start) / 1000);
      setElapsed(t);
      if (t < until) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [until]);
  return elapsed;
};

// Mission 1, steps 7 and 12: refueling, reached from the docking view's Continue once
// docked. `leg` picks which: "outbound" (step 7, /m1-s7, Undock to the Mars ejection burn
// /m1-s8) or "return" (step 12, /m1-s12, at the Mars depot, Undock to the burn home
// /m1-s13). The rocket's remaining stages (passed along as route state) are filled from
// the depot, top stage first. Left: the spacecraft's stage gauges; centre: the docked
// stack; right: the depot's gauge. Undock appears once the transfer is complete.
const M1S7A12 = ({ leg = "outbound" }) => {
  const { title, next } = LEGS[leg];
  const navigate = useNavigate();
  // { flight, rcsUsed } from docking, passed on to the ejection burn.
  const { state } = useLocation();
  const flight = state?.flight;
  const { stages } = useSelector(selectRocket);

  const tanks = attachedTanks(stages, flight);
  const needed = transferNeeded(tanks);
  const elapsed = useElapsed(HOOKUP_SECONDS + TRANSFER_SECONDS);
  const transferred = transferredAt(needed, elapsed);
  const levels = tankLevels(tanks, transferred);
  const depotLeft = DEPOT_CAPACITY_T - transferred;
  const done = elapsed >= HOOKUP_SECONDS + TRANSFER_SECONDS;

  // The diagram takes the stages bottom first, as the store keeps them.
  const bottomFirst = levels.toReversed();
  const attached = stages.slice(stages.length - bottomFirst.length);
  const filling = bottomFirst.findIndex((tank) => tank.filling);

  let status = "Connecting propellant lines…";
  if (done) status = `Transfer complete: ${tonnes(needed)} loaded, every stage is full.`;
  else if (elapsed >= HOOKUP_SECONDS) status = `Transferring propellant: ${tonnes(transferred)} of ${tonnes(needed)}`;

  return (
    <RefuelPanel
      title={title}
      status={status}
      action={done ? { label: "Undock", onClick: () => navigate(next, { state }) } : null}
      left={
        <FuelGauges
          title="Spacecraft"
          gauges={levels.map(({ key, label, capacity, level }) => ({
            key,
            label,
            fraction: capacity > 0 ? level / capacity : 0,
            detail: `${tonnes(level)} / ${capacity} t`,
          }))}
        />
      }
      right={
        <FuelGauges
          title="Depot"
          info="depot"
          gauges={[
            {
              key: "depot",
              label: "Depot",
              fraction: depotLeft / DEPOT_CAPACITY_T,
              detail: tonnes(depotLeft),
            },
          ]}
        />
      }
    >
      <RefuelDiagram
        stages={attached}
        levels={bottomFirst.map(({ capacity, level }) => (capacity > 0 ? level / capacity : 0))}
        depotLevel={depotLeft / DEPOT_CAPACITY_T}
        fillingIndex={filling === -1 ? null : filling}
      />
    </RefuelPanel>
  );
};

export default M1S7A12;
