import MissionSelect from "../components/MissionSelect/MissionSelect.jsx";
import { MISSIONS } from "../utils/missions.js";

// The home page: a card for each mission, easiest on the left, hardest on the right.
const Home = () => <MissionSelect missions={MISSIONS} />;

export default Home;
