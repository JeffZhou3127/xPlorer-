import { Route, Routes } from "react-router";
import Home from "./views/Home.jsx";
import Scenario1 from "./views/scenario1/Scenario1.jsx";
import M1S1 from "./views/scenario1/M1S1.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scenario1" element={<Scenario1 />} />
      <Route path="/m1-s1" element={<M1S1 />} />
    </Routes>
  );
};

export default App;
