import { useNavigate } from "react-router";
import LaunchAlert from "../../components/LaunchAlert/LaunchAlert.jsx";

// Mission 1, step 3: confirm the designs before launch. The alert holds both buttons:
// Back returns to the rocket designer, Continue goes on to the launch (step 4).
const M1S3 = () => {
  const navigate = useNavigate();

  return (
    <LaunchAlert onBack={() => navigate("/m1-s2")} onContinue={() => navigate("/m1-s4")} />
  );
};

export default M1S3;
