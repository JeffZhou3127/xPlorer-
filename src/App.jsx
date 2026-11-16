import { Route, Routes, useLocation } from "react-router";
import Home from "./views/Home.jsx";
import Scenario1 from "./views/scenario1/Scenario1.jsx";
import M1S1 from "./views/scenario1/M1S1.jsx";
import M1S2 from "./views/scenario1/M1S2.jsx";
import M1S3 from "./views/scenario1/M1S3.jsx";
import M1S4 from "./views/scenario1/M1S4.jsx";
import M1S5 from "./views/scenario1/M1S5.jsx";
import M1S6A11 from "./views/scenario1/M1S6A11.jsx";
import M1S7A12 from "./views/scenario1/M1S7A12.jsx";
import M1S8A13 from "./views/scenario1/M1S8A13.jsx";
import M1S9 from "./views/scenario1/M1S9.jsx";
import M1S10 from "./views/scenario1/M1S10.jsx";
import M1S14 from "./views/scenario1/M1S14.jsx";
import MissionFailure from "./views/scenario1/MissionFailure.jsx";
import Scenario2 from "./views/scenario2/Scenario2.jsx";
import M2S1 from "./views/scenario2/M2S1.jsx";
import M2S2 from "./views/scenario2/M2S2.jsx";
import M2S3 from "./views/scenario2/M2S3.jsx";
import M2S4 from "./views/scenario2/M2S4.jsx";
import M2S6 from "./views/scenario2/M2S6.jsx";
import M2S8 from "./views/scenario2/M2S8.jsx";
import M2S9 from "./views/scenario2/M2S9.jsx";
import Scenario3 from "./views/scenario3/Scenario3.jsx";
import M3S1 from "./views/scenario3/M3S1.jsx";
import M3S2A4 from "./views/scenario3/M3S2A4.jsx";
import M3S3 from "./views/scenario3/M3S3.jsx";

const App = () => {
  // Keyed on the location so navigating to the same URL again (a flight step's Redo,
  // useRedo) mounts the view afresh.
  const location = useLocation();
  return (
    <Routes key={location.key}>
      <Route path="/" element={<Home />} />
      <Route path="/scenario1" element={<Scenario1 />} />
      <Route path="/m1-s1" element={<M1S1 />} />
      <Route path="/m1-s2" element={<M1S2 />} />
      <Route path="/m1-s3" element={<M1S3 />} />
      <Route path="/m1-s4" element={<M1S4 />} />
      <Route path="/m1-s5" element={<M1S5 />} />
      {/* Steps 6–8 and 11–13 share views (docking, refueling, ejection burn); `leg` picks
          the trip out to Mars or back home. Keys keep the two from sharing state. */}
      <Route path="/m1-s6" element={<M1S6A11 key="outbound" leg="outbound" />} />
      <Route path="/m1-s7" element={<M1S7A12 key="outbound" leg="outbound" />} />
      <Route path="/m1-s8" element={<M1S8A13 key="outbound" leg="outbound" />} />
      <Route path="/m1-s9" element={<M1S9 key="mars" arrival="mars" />} />
      <Route path="/m1-s10" element={<M1S10 key="mars" site="mars" />} />
      <Route path="/m1-s11" element={<M1S6A11 key="return" leg="return" />} />
      <Route path="/m1-s12" element={<M1S7A12 key="return" leg="return" />} />
      <Route path="/m1-s13" element={<M1S8A13 key="return" leg="return" />} />
      <Route path="/m1-s14" element={<M1S14 key="mars" trip="mars" />} />
      <Route path="/mission-failure" element={<MissionFailure />} />
      <Route path="/scenario2" element={<Scenario2 />} />
      <Route path="/m2-s1" element={<M2S1 />} />
      <Route path="/m2-s2" element={<M2S2 />} />
      <Route path="/m2-s3" element={<M2S3 />} />
      <Route path="/m2-s4" element={<M2S4 />} />
      <Route path="/m2-s5" element={<M1S9 key="moon" arrival="moon" />} />
      <Route path="/m2-s6" element={<M2S6 />} />
      <Route path="/m2-s7" element={<M1S10 key="moon" site="moon" />} />
      <Route path="/m2-s8" element={<M2S8 />} />
      <Route path="/m2-s9" element={<M2S9 />} />
      <Route path="/m2-s10" element={<M1S14 key="moon" trip="moon" />} />
      <Route path="/scenario3" element={<Scenario3 />} />
      <Route path="/m3-s1" element={<M3S1 />} />
      {/* Steps 2 and 4 share the flown CubeSat view; `step` picks the goal. */}
      <Route path="/m3-s2" element={<M3S2A4 key="raise" step="raise" />} />
      <Route path="/m3-s3" element={<M3S3 />} />
      <Route path="/m3-s4" element={<M3S2A4 key="circularize" step="circularize" />} />
    </Routes>
  );
};

export default App;
