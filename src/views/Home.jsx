import { Link } from "react-router";

const Home = () => {
  return (
    <nav>
      <Link to="/scenario1">Scenario 1</Link>
      <Link to="/scenario2">Scenario 2</Link>
    </nav>
  );
};

export default Home;
