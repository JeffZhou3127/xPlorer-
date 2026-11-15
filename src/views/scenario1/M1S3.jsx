import { useNavigate } from "react-router";
import StepNav from "../../components/StepNav/StepNav.jsx";

// Mission 1, step 3 (placeholder). Reached from the rocket designer's "Continue" button.
// There is no next step yet, so it only has a Back button.
const M1S3 = () => {
  const navigate = useNavigate();

  return (
    <>
      <main>
        <h1>Mission 1 — Step 3</h1>
      </main>
      <StepNav onBack={() => navigate("/m1-s2")} />
    </>
  );
};

export default M1S3;
