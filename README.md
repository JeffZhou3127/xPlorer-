# xPlorer+
In this project, we intend to let players experience what it really takes to fly a space mission, from the drawing board all the way to splashdown. xPlorer+ is a browser game in which the player designs their own spacecraft and rocket, then flies every step of the mission themselves: launch, orbit, docking, refueling, interplanetary transfers, landings, science, and the fiery reentry home. Because every stage runs on real physics, including the rocket equation, orbital mechanics, atmospheric drag, and reentry heating, the game was created to provide an interactive experience that builds a genuine understanding of how spaceflight works.

## Features
In this game, we intend to create three missions of increasing difficulty, each one teaching new ideas while building on the last:
1. __CubeSat (Easy):__ Raise a small satellite from a 150 × 150 km orbit to geostationary orbit. Two short lessons with animated diagrams explain how prograde burns raise and circularize an orbit before the player tries it themselves.
2. __Moon (Intermediate):__ Design a lunar lander and its rocket, then fly to the Moon and back: an automatic launch, a trans-lunar injection, lunar orbit insertion, a landing, surface science, liftoff, and the return to Earth.
3. __Mars (Extreme):__ Design a spacecraft and a rocket on a budget, fly the launch by hand, dock with and refuel from orbital depots, aim the ejection burn toward Mars, brake into Mars orbit, run experiments, and make the long journey back to Earth.

Additionally, the designers let the player customize nearly everything. Spacecraft systems such as solar panels, batteries, radiators, and RCS fuel can each be sized, and every rocket stage can be tuned by fuel, propellant, engine cycle, expansion ratio, and number of engines, with optional solid rocket boosters. A live blueprint diagram and stats panel show the mass, Δv, thrust, and cost of every choice, and each design must stay within budget.
Every flight is simulated, so choices made in the designer matter later on. An undersized radiator can overheat during the cruise to Mars, too little Δv can leave the lander stranded, and too steep an entry angle can burn up the capsule. When something goes wrong, a failure report explains what happened and offers to retry the step or redesign the craft. Flights can be followed in a 3D trajectory view built with X3DOM, and a time-warp clock speeds up the long coasts.
Finally, technical terms throughout the game have a "?" tip that explains them in plain language, so players with no background in spaceflight can still follow along.

## How to Use
To play the game, first go to [xPlorer+](https://xsimxplorer.netlify.app/).
After that, open the link shown in the terminal, and the game will load immediately. On the home page, choose one of the three missions. Read the mission objective, then click Continue at each step to move on through the mission. Hover over or click any "?" to learn what a term means, and use the Redo button beside a flight's title to try that step again.

## Technologies
Our team used a series of different languages and libraries to make the creation of the game possible. They include:
* __HTML:__ The foundational markup language used for creating websites and structuring content
* __CSS:__ A style sheet language used for describing the presentation of a document written in a markup language like HTML
* __JavaScript:__ Mainly used to add interactivity to web pages within the user's browser, and here also used to run the flight physics
* __React.js:__ An open-source front-end JavaScript library for building user interfaces
* __Redux.js:__ A JavaScript library primarily used for managing and centralizing application state, here used to store the player's spacecraft, lander, and rocket designs
* __React Router:__ A library used for moving between the pages of a React app, here used to carry the player from one mission step to the next
* __X3DOM:__ An open-source framework for showing 3D scenes in the browser, used to draw the orbits and trajectories. It is based off the NASA Mission Viz resource.
* __Vite:__ A fast build tool and development server for modern web projects
* __Git:__ An open-source distributed version control system
* __GitHub:__ A cloud-based platform built on the Git version control system that allows developers to store, manage, and share code and other project files
* __VSCode:__ Used for a variety of programming tasks and supports a vast range of programming languages through its extension ecosystem

## Collaborators
The xSim+ team is responsible for designing, programing, asset-making, and play-testing this project.

## License
&copy; Peiqi Zhou, 2026
