import { useLocation, useNavigate } from "react-router";
import LaunchAlert from "../../components/LaunchAlert/LaunchAlert.jsx";

// Mission 1, step 3: confirm the designs before launch. The alert holds both buttons:
// Back returns to the rocket designer, Continue goes on to the launch (step 4).
// Mission 2's rocket designer (M2S2) also comes here, passing its own `back` and `next`
// paths as route state.
const M1S3 = () => {
  const navigate = useNavigate();
  const { back = "/m1-s2", next = "/m1-s4" } = useLocation().state ?? {};

  return <LaunchAlert onBack={() => navigate(back)} onContinue={() => navigate(next)} />;
};

export default M1S3;
