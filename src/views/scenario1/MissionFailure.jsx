import { useLocation, useNavigate } from "react-router";
import FailureReport from "../../components/FailureReport/FailureReport.jsx";
import { explainFailure, failureSummary } from "../../utils/missionFailure.js";
import { ORBIT_WINDOW_KM } from "../../utils/rocketPhysics.js";

// Mission 1: shown when the flight panel (step 4) ends in failure: the rocket crashed,
// or ran out of fuel before reaching a goal. The flight passes { failure, targets } as
// router state; visiting the URL directly shows a generic explanation.
// Retry starts a fresh launch; Redesign goes back to the rocket designer (step 2).
const MissionFailure = () => {
  const navigate = useNavigate();
  const { failure = null, targets = { apogee: ORBIT_WINDOW_KM, perigee: ORBIT_WINDOW_KM } } = useLocation().state ?? {};
  const { reason, detail, tip } = explainFailure(failure, targets);

  return (
    <FailureReport
      reason={reason}
      detail={detail}
      tip={tip}
      summary={failureSummary(failure)}
      onRetry={() => navigate("/m1-s4")}
      onRedesign={() => navigate("/m1-s2")}
    />
  );
};

export default MissionFailure;
