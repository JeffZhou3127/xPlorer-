import { Route, Routes } from "react-router";
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

const App = () => {
  return (
    <Routes>
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
      <Route path="/m1-s9" element={<M1S9 />} />
      <Route path="/m1-s10" element={<M1S10 />} />
      <Route path="/m1-s11" element={<M1S6A11 key="return" leg="return" />} />
      <Route path="/m1-s12" element={<M1S7A12 key="return" leg="return" />} />
      <Route path="/m1-s13" element={<M1S8A13 key="return" leg="return" />} />
      <Route path="/m1-s14" element={<M1S14 />} />
      <Route path="/mission-failure" element={<MissionFailure />} />
      <Route path="/scenario2" element={<Scenario2 />} />
      <Route path="/m2-s1" element={<M2S1 />} />
      <Route path="/m2-s2" element={<M2S2 />} />
      <Route path="/m2-s3" element={<M2S3 />} />
      <Route path="/m2-s4" element={<M2S4 />} />
    </Routes>
  );
};

export default App;
