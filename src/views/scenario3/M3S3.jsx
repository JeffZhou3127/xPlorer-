import { useLocation, useNavigate } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import LessonText from "../../components/LessonText/LessonText.jsx";
import OrbitCircularizeView from "../../components/OrbitCircularizeView/OrbitCircularizeView.jsx";
import StepNav from "../../components/StepNav/StepNav.jsx";
import { Info } from "../../components/InfoTip/InfoTip.jsx";

// Mission 3, step 3: part 2 of the M3S1 lesson. A second prograde burn at the apogee
// circularises the raised orbit; lowering an orbit is the same with two retrograde burns.
// Beside a blueprint animation of the circularising burn. Route state from M3S2 is
// passed on to M3S4.
const M3S3 = () => {
  const navigate = useNavigate();
  // M3S2's orbit (`transfer`, `time`) passes through to M3S4.
  const { state } = useLocation();
  return (
    <>
      <SplitPane
        left={
          <LessonText
            title="Raising Orbits, Part 2"
            paragraphs={[
              <>
                After the first burn, the CubeSat's orbit is a long ellipse. Its apogee
                <Info topic="apogee" /> is at geostationary height, 35,786 km up, but its perigee
                <Info topic="perigee" /> is still down at 150 km. To stay up there, the low side has to be raised
                as well.
              </>,
              <>
                Coast up to the apogee, then burn prograde
                <Info topic="prograde" /> again. Just like the first burn, this one leaves the point where you burn
                at the same height and raises the opposite side of the orbit: this time, the perigee.
              </>,
              <>
                Keep burning until the perigee climbs to match the apogee. The orbit is then circular
                <Info topic="circularOrbit" />, at the same height all the way round.
              </>,
              <>
                To lower an orbit, do the opposite: two retrograde
                <Info topic="retrograde" /> burns. The first lowers the far side of the orbit. Coast half an orbit
                down to that new low point, then burn retrograde again to bring the other side down to match.
              </>,
            ]}
          />
        }
        right={<OrbitCircularizeView />}
      />
      <StepNav onBack={() => navigate("/m3-s2")} onContinue={() => navigate("/m3-s4", { state })} />
    </>
  );
};

export default M3S3;
