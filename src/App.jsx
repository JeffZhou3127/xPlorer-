import { Route, Routes } from "react-router";
import Home from "./views/Home.jsx";
import Scenario1 from "./views/scenario1/Scenario1.jsx";
import M1S1 from "./views/scenario1/M1S1.jsx";
import M1S2 from "./views/scenario1/M1S2.jsx";
import M1S3 from "./views/scenario1/M1S3.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scenario1" element={<Scenario1 />} />
      <Route path="/m1-s1" element={<M1S1 />} />
      <Route path="/m1-s2" element={<M1S2 />} />
      <Route path="/m1-s3" element={<M1S3 />} />
    </Routes>
  );
};

export default App;
