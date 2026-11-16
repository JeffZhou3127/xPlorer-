import cubesatImage from "../assets/Cubesat.png";
import cubesatVideo from "../assets/Cubesat_Video.mp4";
import marsImage from "../assets/Mars.png";
import marsVideo from "../assets/Mars_Video.mp4";
import moonImage from "../assets/Moon.png";
import moonVideo from "../assets/Moon_Video.mp4";

// The three missions, easiest first: what the home page cards and each mission's
// objective page show. `path` is the objective page, `start` its first step, `difficulty`
// 1–3 with its `level` name, `image` the home page backdrop while its card is hovered,
// `video` the objective page's looping backdrop, `plan` the flight plan in order.
export const MISSIONS = [
  {
    id: "cubesat",
    image: cubesatImage,
    video: cubesatVideo,
    name: "CubeSat Mission",
    path: "/scenario3",
    start: "/m3-s1",
    difficulty: 1,
    level: "Easy",
    description:
      "Fly a small satellite from a low parking orbit up to geostationary orbit, 35,786 km above the equator, with two well-timed engine burns.",
    plan: [
      "Learn how a prograde burn raises the far side of an orbit",
      "Burn prograde to raise the apogee to geostationary height",
      "Learn how a burn at apogee rounds out the orbit",
      "Burn at apogee to circularise into geostationary orbit",
    ],
  },
  {
    id: "moon",
    image: moonImage,
    video: moonVideo,
    name: "Moon Mission",
    path: "/scenario2",
    start: "/m2-s1",
    difficulty: 2,
    level: "Intermediate",
    description:
      "Design a lander and the rocket to carry it, land a person on the Moon, and bring them safely home through Earth's atmosphere.",
    plan: [
      "Design the lunar lander",
      "Design the launch rocket",
      "Launch into Earth orbit",
      "Burn for the Moon",
      "Brake into lunar orbit",
      "Land on the Moon",
      "Run experiments on the surface",
      "Lift off back into lunar orbit",
      "Burn for Earth",
      "Re-enter the atmosphere and splash down",
    ],
  },
  {
    id: "mars",
    image: marsImage,
    video: marsVideo,
    name: "Mars Mission",
    path: "/scenario1",
    start: "/m1-s1",
    difficulty: 3,
    level: "Extreme",
    description:
      "Be the first person to reach Mars orbit: launch, refuel at orbiting depots, brake into orbit around Mars for science, and make the long trip home.",
    plan: [
      "Design the spacecraft",
      "Design the launch rocket",
      "Fly the launch into a 300 km orbit",
      "Dock with the fuel depot in Earth orbit",
      "Refuel",
      "Burn for Mars",
      "Brake into orbit around Mars",
      "Run science experiments",
      "Dock with the fuel depot in Mars orbit",
      "Refuel",
      "Burn for Earth",
      "Re-enter the atmosphere and splash down",
    ],
  },
];

export const missionById = (id) => MISSIONS.find((mission) => mission.id === id);
