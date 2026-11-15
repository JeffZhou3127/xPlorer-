import { Route, Routes } from "react-router";
import Home from "./views/Home.jsx";
import Scenario1 from "./views/scenario1/Scenario1.jsx";
import M1S1 from "./views/scenario1/M1S1.jsx";
import M1S2 from "./views/scenario1/M1S2.jsx";
import M1S3 from "./views/scenario1/M1S3.jsx";
import M1S4 from "./views/scenario1/M1S4.jsx";
import M1S5 from "./views/scenario1/M1S5.jsx";
import M1S6 from "./views/scenario1/M1S6.jsx";
import M1S7 from "./views/scenario1/M1S7.jsx";
import M1S8 from "./views/scenario1/M1S8.jsx";
import M1S9 from "./views/scenario1/M1S9.jsx";
import M1S10 from "./views/scenario1/M1S10.jsx";
import MissionFailure from "./views/scenario1/MissionFailure.jsx";

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
      <Route path="/m1-s6" element={<M1S6 />} />
      <Route path="/m1-s7" element={<M1S7 />} />
      <Route path="/m1-s8" element={<M1S8 />} />
      <Route path="/m1-s9" element={<M1S9 />} />
      <Route path="/m1-s10" element={<M1S10 />} />
      <Route path="/mission-failure" element={<MissionFailure />} />
    </Routes>
  );
};

export default App;
