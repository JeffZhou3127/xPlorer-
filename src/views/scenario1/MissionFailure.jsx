import { useLocation, useNavigate } from "react-router";
import FailureReport from "../../components/FailureReport/FailureReport.jsx";
import { isCruiseFailure } from "../../utils/cruiseSystems.js";
import { explainFailure, failureSummary, isMarsFailure } from "../../utils/missionFailure.js";
import { ORBIT_WINDOW_KM } from "../../utils/rocketPhysics.js";

// Mission 1: shown when a step ends in failure: the launch (step 4: the rocket crashed,
// or ran out of fuel before reaching a goal), a spacecraft system on the way to Mars
// (step 8), or the Mars orbit insertion (step 9: crashed, out of fuel, or flew past).
// The view passes { failure, targets } as router state, and steps 8 and 9 also their own
// route state as `retryState`, to fly them again; visiting the URL directly shows a
// generic explanation.
// Launch: Retry starts a fresh launch, Redesign goes back to the rocket designer (step 2).
// Cruise: Retry goes back to the ejection burn, Redesign to the spacecraft designer (step 1).
// Mars: Retry flies the arrival again, Redesign goes back to the rocket designer.
const MissionFailure = () => {
  const navigate = useNavigate();
  const {
    failure = null,
    targets = { apogee: ORBIT_WINDOW_KM, perigee: ORBIT_WINDOW_KM },
    retryState = null,
  } = useLocation().state ?? {};
  const { reason, detail, tip } = explainFailure(failure, targets);

  let actions = { onRetry: () => navigate("/m1-s4"), onRedesign: () => navigate("/m1-s2") };
  if (isCruiseFailure(failure)) {
    actions = {
      onRetry: () => navigate("/m1-s8", { state: retryState }),
      onRedesign: () => navigate("/m1-s1"),
      retryLabel: "Retry ejection burn",
      redesignLabel: "Redesign spacecraft",
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
