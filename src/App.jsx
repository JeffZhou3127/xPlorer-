import { Route, Routes } from "react-router"
import Home from "./views/Home.jsx"
import Scenario1 from "./views/Scenario1.jsx"

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scenario1" element={<Scenario1 />} />
    </Routes>
  )
}

export default App
