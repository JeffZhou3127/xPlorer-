import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { selectRocket } from "../../store/rocketSlice.js";
import "./DevJump.css";

// DEVELOPMENT ONLY — temporary. Skips the launch, docking and refueling and goes straight
// to the ejection burn (M1S8A13) with every stage still attached and full.
// To remove: delete this folder and the DevJump import and element in M1S2.jsx.
const DevJump = () => {
  const navigate = useNavigate();
  const { stages } = useSelector(selectRocket);
  return (
    <button
      type="button"
      className="dev-jump"
      onClick={() => navigate("/m1-s8", { state: { flight: { stageIndex: 0, stageFuel: stages.map(() => 1) } } })}
    >
      Dev: jump to ejection burn
    </button>
  );
};

export default DevJump;
