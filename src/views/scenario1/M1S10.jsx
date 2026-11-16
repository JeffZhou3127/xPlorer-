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
import { LUNAR_EXPERIMENTS } from "../../utils/lunarExperiments.js";
import { format } from "../../utils/format.js";

// How long an instrument "collects data" before its result appears.
const RUN_MS = 1200;

const TUNE = `Tune each instrument's settings and run it; an experiment is complete once its data quality reaches ${COMPLETE_QUALITY}%.`;

// What differs between the science at Mars (M1S10) and on the Moon (M2S7).
const SITES = {
  mars: {
    experiments: EXPERIMENTS,
    intro: `You are in a ${format(ORBIT_PERIAPSIS_KM)} × ${format(ORBIT_APOAPSIS_KM)} km polar orbit around Mars. ${TUNE}`,
    next: "/m1-s11",
  },
  moon: {
    experiments: LUNAR_EXPERIMENTS,
    intro: `You have landed on a lava plain on the Moon, and the crew is out on the surface with the instruments. ${TUNE}`,
    next: "/m2-s8",
    continueLabel: "Leave Lunar Surface →",
  },
};

const sameValues = (a, b) => Object.keys(a).every((key) => a[key] === b[key]);

// Mission 1, step 10: science in Mars orbit, reached from M1S9's Continue once captured; also
// mission 2, step 7 (`site="moon"`): science on the lunar surface after the landing (M2S6).
// Nine experiment cards (models in scienceExperiments.js / lunarExperiments.js); each run's result is kept with
// the settings that produced it, so a card can flag it as stale after a change. An
// experiment stays complete once any run reaches COMPLETE_QUALITY, and Continue unlocks
// at REQUIRED_EXPERIMENTS; it leads to the second docking (/m1-s11) or, on the Moon, to
// /m2-s8, passing the route state along (the stages left, the RCS used, the lander's fuel).
const M1S10 = ({ site = "mars" }) => {
  const { experiments, intro, next, continueLabel } = SITES[site];
  const navigate = useNavigate();
  const { state } = useLocation();
  const [values, setValues] = useState(() =>
    Object.fromEntries(experiments.map(({ id, defaults }) => [id, defaults])),
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
        intro={intro}
        completed={completed.size}
        total={experiments.length}
        required={REQUIRED_EXPERIMENTS}
      >
        {experiments.map((experiment, i) => {
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
      <StepNav
        onContinue={() => navigate(next, { state })}
        blockedReason={blockedReason}
        continueLabel={continueLabel}
      />
    </>
  );
};

export default M1S10;
