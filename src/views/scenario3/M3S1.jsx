import { useNavigate } from "react-router";
import SplitPane from "../../components/SplitPane/SplitPane.jsx";
import LessonText from "../../components/LessonText/LessonText.jsx";
import OrbitRaiseView from "../../components/OrbitRaiseView/OrbitRaiseView.jsx";
import StepNav from "../../components/StepNav/StepNav.jsx";
import { Info } from "../../components/InfoTip/InfoTip.jsx";

// Mission 3, step 1: explains that a prograde burn raises the apogee, beside a blueprint
// animation of one.
const M3S1 = () => {
  const navigate = useNavigate();
  return (
    <>
      <SplitPane
        left={
          <LessonText
            title="Raising Orbits, Part 1"
            paragraphs={[
              <>
                Your CubeSat starts in a circular orbit 150 km above Earth. Geostationary orbit
                <Info topic="geostationaryOrbit" /> is 35,786 km up, so its orbit has to be raised a long way.
              </>,
              <>
                To raise the apogee
                <Info topic="apogee" />, burn prograde
                <Info topic="prograde" />: point the engine so it pushes the spacecraft in the direction it is
                already moving. The extra speed carries it higher on the far side of the orbit.
              </>,
              <>
                The point where you burn stays at the same height and becomes the perigee
                <Info topic="perigee" />. The apogee rises on the opposite side, half an orbit later. The more
                speed you add, the higher it goes.
              </>,
              <>Burning the other way, against the direction of motion, does the opposite: it lowers the far side.</>,
            ]}
          />
        }
        right={<OrbitRaiseView />}
      />
      <StepNav onBack={() => navigate("/scenario3")} onContinue={() => navigate("/m3-s2")} />
    </>
  );
};

export default M3S1;
