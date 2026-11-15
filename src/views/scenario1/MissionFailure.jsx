import { useLocation, useNavigate } from "react-router";
import FailureReport from "../../components/FailureReport/FailureReport.jsx";
import { isCruiseFailure } from "../../utils/cruiseSystems.js";
import { explainFailure, failureSummary, isMarsFailure } from "../../utils/missionFailure.js";
import { ORBIT_WINDOW_KM } from "../../utils/rocketPhysics.js";
import { isReentryFailure } from "../../utils/reentry.js";

// Mission 1: shown when a step ends in failure: the launch (step 4: the rocket crashed,
// or ran out of fuel before reaching a goal), a spacecraft system on the way to Mars or back
// (steps 8 and 13), or the Mars orbit insertion (step 9: crashed, out of fuel, or flew past).
// The view passes { failure, targets } as router state, and steps 8, 9 and 13 also their own
// route state as `retryState` (the cruise steps also their path as `retryPath`), to fly
// them again; visiting the URL directly shows a generic explanation.
// Launch: Retry starts a fresh launch, Redesign goes back to the rocket designer (step 2).
// Cruise: Retry goes back to that ejection burn, Redesign to the spacecraft designer (step 1;
// mission 2's Moon transfer passes its lander designer as `redesignPath`).
// Mars: Retry flies the arrival again, Redesign goes back to the rocket designer.
// Reentry (step 14: burned up or skipped back into space): Retry flies it again, or home.
const MissionFailure = () => {
  const navigate = useNavigate();
  const {
    failure = null,
    targets = { apogee: ORBIT_WINDOW_KM, perigee: ORBIT_WINDOW_KM },
    retryState = null,
    retryPath = "/m1-s8",
    redesignPath = "/m1-s1",
  } = useLocation().state ?? {};
  const { reason, detail, tip } = explainFailure(failure, targets);

  let actions = { onRetry: () => navigate("/m1-s4"), onRedesign: () => navigate("/m1-s2") };
  if (isCruiseFailure(failure)) {
    actions = {
      onRetry: () => navigate(retryPath, { state: retryState }),
      onRedesign: () => navigate(redesignPath),
      retryLabel: "Retry ejection burn",
      redesignLabel: "Redesign spacecraft",
    };
  } else if (isReentryFailure(failure)) {
    // Nothing designed earlier changes the reentry, so the other way out is home.
    actions = {
      onRetry: () => navigate("/m1-s14", { state: retryState }),
      onRedesign: () => navigate("/"),
      retryLabel: "Retry reentry",
      redesignLabel: "Home",
    };
  } else if (isMarsFailure(failure)) {
    actions = {
      onRetry: () => navigate("/m1-s9", { state: retryState }),
      onRedesign: () => navigate("/m1-s2"),
      retryLabel: "Retry orbit insertion",
    };
  }

  return <FailureReport reason={reason} detail={detail} tip={tip} summary={failureSummary(failure)} {...actions} />;
};

export default MissionFailure;
