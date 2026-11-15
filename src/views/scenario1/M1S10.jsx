import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import ScienceBoard from "../../components/ScienceBoard/ScienceBoard.jsx";
import ExperimentCard from "../../components/ExperimentCard/ExperimentCard.jsx";
import StepNav from "../../components/StepNav/StepNav.jsx";
import {
  COMPLETE_QUALITY,
  EXPERIMENTS,
  ORBIT_APOAPSIS_KM,
  ORBIT_PERIAPSIS_KM,
  REQUIRED_EXPERIMENTS,
} from "../../utils/scienceExperiments.js";
import { format } from "../../utils/format.js";

// How long an instrument "collects data" before its result appears.
const RUN_MS = 1200;

const INTRO = `You are in a ${format(ORBIT_PERIAPSIS_KM)} × ${format(ORBIT_APOAPSIS_KM)} km polar orbit around Mars. Tune each instrument's settings and run it; an experiment is complete once its data quality reaches ${COMPLETE_QUALITY}%.`;

const sameValues = (a, b) => Object.keys(a).every((key) => a[key] === b[key]);

// Mission 1, step 10: science in Mars orbit, reached from M1S9's Continue once captured.
// Nine experiment cards (models in scienceExperiments.js); each run's result is kept with
// the settings that produced it, so a card can flag it as stale after a change. An
// experiment stays complete once any run reaches COMPLETE_QUALITY, and Continue unlocks
// at REQUIRED_EXPERIMENTS; it leads to the second docking (/m1-s11), with the route state
// from M1S9 (the stages left and the RCS used) passed along.
const M1S10 = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [values, setValues] = useState(() =>
    Object.fromEntries(EXPERIMENTS.map(({ id, defaults }) => [id, defaults])),
  );
  const [runs, setRuns] = useState({}); // id → { result, values }
  const [running, setRunning] = useState({}); // id → true while collecting
  const [completed, setCompleted] = useState(() => new Set());

  const timers = useRef(new Set());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const change = (id, key, value) =>
    setValues((all) => ({ ...all, [id]: { ...all[id], [key]: value } }));

  const run = (experiment) => {
    const settings = values[experiment.id];
    setRunning((all) => ({ ...all, [experiment.id]: true }));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      const result = experiment.run(settings);
      setRuns((all) => ({ ...all, [experiment.id]: { result, values: settings } }));
      setRunning((all) => ({ ...all, [experiment.id]: false }));
      if (result.quality >= COMPLETE_QUALITY) {
        setCompleted((done) => new Set(done).add(experiment.id));
      }
    }, RUN_MS);
    timers.current.add(timer);
  };

  const remaining = REQUIRED_EXPERIMENTS - completed.size;
  const blockedReason =
    remaining > 0
      ? `Complete ${remaining} more experiment${remaining === 1 ? "" : "s"} (data quality ${COMPLETE_QUALITY}% or better).`
      : null;

  return (
    <>
      <ScienceBoard
        intro={INTRO}
        completed={completed.size}
        total={EXPERIMENTS.length}
        required={REQUIRED_EXPERIMENTS}
      >
        {EXPERIMENTS.map((experiment, i) => {
          const last = runs[experiment.id];
          return (
            <ExperimentCard
              key={experiment.id}
              number={i + 1}
              experiment={experiment}
              values={values[experiment.id]}
              onChange={(key, value) => change(experiment.id, key, value)}
              onRun={() => run(experiment)}
              running={Boolean(running[experiment.id])}
              result={last?.result}
              stale={Boolean(last) && !sameValues(last.values, values[experiment.id])}
              complete={completed.has(experiment.id)}
              pass={COMPLETE_QUALITY}
            />
          );
        })}
      </ScienceBoard>
      <StepNav onContinue={() => navigate("/m1-s11", { state })} blockedReason={blockedReason} />
    </>
  );
};

export default M1S10;
