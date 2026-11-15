// Short explanations shown in the "?" tooltips (InfoTip / Info), by topic key.
export const GLOSSARY = {
  fuel: {
    term: "Fuel amount",
    text: "The mass of propellant (fuel plus oxidiser) the stage carries. More propellant lets the stage burn longer and add more speed, but it also makes the rocket heavier for every stage below it.",
  },
  propellant: {
    term: "Fuel type",
    text: "Kerolox (kerosene + liquid oxygen) is dense and easy to store. Methalox (methane) is a little more efficient. Hydrolox (liquid hydrogen) is the most efficient, but hydrogen is so light it needs huge, heavy tanks.",
  },
  cycle: {
    term: "Engine cycle",
    text: "How the turbopumps that force propellant into the engine are powered. Staged combustion and full flow cycles reach much higher chamber pressure and waste less propellant than a gas generator, but they are harder to build.",
  },
  gasGenerator: {
    term: "Gas generator exhaust",
    text: "A gas generator burns a little propellant to spin the turbopumps. An open cycle dumps that exhaust overboard, wasting it. A closed cycle feeds it back into the nozzle, so slightly more of it makes thrust.",
  },
  engines: {
    term: "Engines",
    text: "Every engine adds thrust, but also mass. A booster needs lots of engines to lift the whole rocket off the pad; upper stages are already moving and much lighter, so they need far fewer.",
  },
  expansionRatio: {
    term: "Nozzle expansion ratio",
    text: "How much wider the nozzle exit is than its throat (exit area ÷ throat area). A big bell squeezes more speed out of the exhaust in vacuum, but at sea level the outside air pushes back on it and the flow can separate. Boosters use small bells; upper stages use big ones.",
  },
  altitude: {
    term: "Operating altitude",
    text: "The altitude where this stage does most of its burning. Thinner air means less pressure pushing against the exhaust, so the same engine performs better higher up. Above about 100 km it is effectively vacuum.",
  },
  deltaV: {
    term: "Δv (delta-v)",
    text: "The total change in speed the stage can give the rocket, from the rocket equation: Δv = Isp × g₀ × ln(start mass ÷ end mass). Better engines and a higher propellant share both raise it.",
  },
  totalDeltaV: {
    term: "Total Δv",
    text: "The Δv of all stages added together. To stay in a circular orbit 300 km up you need about 7.7 km/s of sideways speed (v = √(GM ÷ r)). A real launch also loses speed fighting gravity and air drag on the way up, so it needs more than that.",
  },
  refuelingStation: {
    term: "Refueling station",
    text: "Flying to Mars orbit and back takes about 7.8 km/s more after reaching Earth orbit, far more than one rocket can carry from the ground. Instead, the spacecraft docks with a fuel depot in orbit and fills its tanks there, so your rocket only has to get it to orbit.",
  },
  isp: {
    term: "Specific impulse (Isp)",
    text: "How efficiently an engine uses propellant, measured in seconds: how long one kilogram of propellant could produce one kilogram-force of thrust. Higher is better, like a car's fuel economy.",
  },
  burnTime: {
    term: "Burn time",
    text: "How long the stage can fire with every engine at full throttle before its tanks run dry. More propellant burns longer; more engines, or engines with higher chamber pressure, empty the tanks faster.",
  },
  mass: {
    term: "Wet / dry mass",
    text: "Wet mass is the stage fully fuelled; dry mass is what remains once the propellant is gone (tanks, engines and plumbing). A lower dry mass means more of the stage is useful propellant.",
  },
  liftoffMass: {
    term: "Liftoff mass",
    text: "The mass of the whole rocket on the launch pad: every stage fully fuelled plus the spacecraft. The bottom stage's engines have to lift all of it.",
  },
  cost: {
    term: "Stage cost",
    text: "What it costs to build this stage: its engines (complex cycles and big nozzles cost more), its tanks (bigger and cryogenic tanks cost more), the propellant, and fixed hardware such as avionics.",
  },
  budget: {
    term: "Budget",
    text: "The money available for this mission. Real rocket design is always a trade-off: the most efficient engines and fuels are also the most expensive, so you have to reach orbit without overspending.",
  },
  srbs: {
    term: "Solid rocket boosters",
    text: "A pair of solid-fuel boosters strapped to the sides of Stage 1. They fire together with it at liftoff, adding lots of cheap thrust, then drop away once empty. Solid fuel is less efficient than liquid fuel, and once lit it cannot be throttled or shut off.",
  },
  srbFuel: {
    term: "SRB fuel amount",
    text: "The combined propellant in both boosters. More fuel makes the boosters taller and gives more thrust and Δv, but adds weight and cost. The boosters can be no taller than the stages below the top stage, so bigger lower stages allow more SRB fuel.",
  },
  liftoffThrustToWeight: {
    term: "Liftoff thrust-to-weight",
    text: "The thrust of Stage 1 at sea level (plus the boosters, if fitted), divided by the weight of the whole rocket on the pad. It needs to be above 1 to lift off at all, and about 1.2 or more to climb well.",
  },
  payload: {
    term: "Payload",
    text: "The spacecraft you designed in the previous step: the command pod, service module, its systems and RCS fuel. Every tonne it weighs has to be lifted by the rocket, so bigger solar panels or more fuel up there cost Δv down here.",
  },

  // Spacecraft design screen
  solarPanels: {
    term: "Solar panels",
    text: "Two wings of solar cells that turn sunlight into electricity. Bigger wings make more power but weigh and cost more. Sunlight at Mars is less than half as strong as at Earth, so size them for Mars.",
  },
  batteries: {
    term: "Batteries",
    text: "Store electricity for when the panels are in shadow, such as the night side of every orbit, or if the spacecraft has to point away from the Sun in an emergency. They must keep life support running until the Sun comes back.",
  },
  radiators: {
    term: "Radiators",
    text: "Panels that get rid of waste heat by glowing it away as infrared light. In space there is no air to carry heat off, so without radiators the electronics and the crew's body heat would slowly cook the cabin.",
  },
  rcsFuel: {
    term: "RCS fuel",
    text: "Propellant for the reaction control system: small thrusters that turn the spacecraft and nudge it gently, for example to line up and dock with the refueling station. It uses hydrazine, which ignites on its own without an igniter.",
  },
  spacecraftMass: {
    term: "Spacecraft mass",
    text: "Everything the rocket has to lift: the command pod with its crew, the service module, every system you fit and the RCS fuel. A lighter spacecraft makes the rocket's job easier.",
  },
  powerAtMars: {
    term: "Power at Mars",
    text: "The solar panels' output in Mars orbit, about 43% of what they make near Earth because sunlight weakens with the square of the distance from the Sun. It needs to cover the spacecraft's steady electrical load.",
  },
  batteryBackup: {
    term: "Battery backup",
    text: "How much stored energy the spacecraft needs to run life support and avionics for a few hours without sunlight: its power demand multiplied by the backup time.",
  },
  heatRejection: {
    term: "Heat rejection",
    text: "How much heat the radiators can dump to space. It must be at least the heat load: nearly all the electricity used ends up as heat, plus the crew's body heat.",
  },
  rcsDeltaV: {
    term: "RCS Δv",
    text: "The total change in speed the RCS thrusters can give the spacecraft with all their fuel. Docking and attitude control only need a little, but running out means you cannot dock to refuel.",
  },
  spacecraftCost: {
    term: "Part cost",
    text: "What this part of the spacecraft costs to build. The crewed command pod is by far the most expensive part, because it has to keep people alive and survive re-entry.",
  },

  // Lander designer (mission 2)
  landerFuel: {
    term: "Lander fuel",
    text: "Propellant for the landing stage's engine. The same tank feeds the landing, the liftoff and the burn home, so the lander's Δv has to cover all three. More fuel means more Δv, but also more mass for the rocket to lift.",
  },
  lunarLanding: {
    term: "Landing burn",
    text: "Slowing from lunar orbit to a gentle touchdown. The Moon has no air to brake against, so the engine has to cancel all of the orbital speed, plus a little extra to hover while picking a landing spot.",
  },
  lunarLiftoff: {
    term: "Liftoff burn",
    text: "Climbing from the Moon's surface back up to lunar orbit. It takes about as much Δv as the landing, because the lander has to build up all of its orbital speed again.",
  },
  transEarthInjection: {
    term: "Moon to Earth ejection",
    text: "A burn in lunar orbit that speeds the lander up enough to escape the Moon's gravity and fall back toward Earth.",
  },
  velocity: {
    term: "Velocity",
    text: "How fast the rocket is moving overall. To stay in a low orbit you need about 7,700 m/s of it, almost all horizontal.",
  },
  horizontalVelocity: {
    term: "Horizontal velocity",
    text: "Speed along the ground (positive is to the right, downrange). This is what keeps a spacecraft in orbit: go fast enough sideways and the ground curves away beneath you as fast as you fall.",
  },
  verticalVelocity: {
    term: "Vertical velocity",
    text: "Speed straight up (positive) or down (negative). Climbing gets you out of the thick air, but height alone won't keep you up: you must turn sideways to build horizontal speed.",
  },
  drag: {
    term: "Drag",
    text: "Air resistance pushing back against the rocket. It grows with the square of speed and with air density, and peaks around the speed of sound. It fades away as the air thins out higher up.",
  },
  apogee: {
    term: "Apogee",
    text: "The highest point the rocket would reach if the engines stopped now, ignoring air. \"Escape\" means it is going fast enough to leave Earth for good.",
  },
  perigee: {
    term: "Perigee",
    text: "The lowest point of the orbit the rocket would follow if the engines stopped now, ignoring air. It shows \"—\" while that path still hits the ground; once it is above the atmosphere (about 100 km) you are in orbit.",
  },
  // Mission objective
  orbitalMechanics: {
    term: "Orbital mechanics",
    text: "How things move under gravity in space. An orbit is falling around a planet while moving sideways fast enough to keep missing it. Speeding up raises the far side of your orbit, slowing down lowers it.",
  },
  polarOrbit: {
    term: "Polar orbit",
    text: "An orbit that passes over (or near) both poles. As the planet turns underneath, a spacecraft in a polar orbit eventually flies over every part of the surface, which is ideal for mapping and science.",
  },

  // Flight panel and Mars orbit insertion
  throttle: {
    term: "Throttle",
    text: "How hard the liquid-fuelled engines push, from 0% to 100% of full thrust. Less throttle saves fuel and eases the load on the rocket; shutting down stops thrust completely. Solid boosters (SRBs) can't be throttled.",
  },
  pitch: {
    term: "Pitch",
    text: "The rocket's tilt away from straight up: 0° points straight up, 90° points along the horizon. A rocket climbs first, then pitches over gradually (a gravity turn) to build the sideways speed an orbit needs.",
  },
  pitchRate: {
    term: "Pitch rate",
    text: "How fast the rocket is turning, in degrees per second. The control sets this rate, not the angle: hold it off-centre to keep turning, centre it to stop and hold the current tilt.",
  },

  // Orbit reached
  circularOrbit: {
    term: "Circular orbit",
    text: "An orbit at the same height all the way round: its apogee (highest point) and perigee (lowest point) are equal. Matching a circular orbit makes it easy to meet another spacecraft, like the fuel depot.",
  },
  docking: {
    term: "Docking",
    text: "Joining two spacecraft in orbit by bringing their docking ports together. It has to be done slowly and precisely: lined up within centimetres and touching at a walking pace or less, or the ports won't latch.",
  },
  relativeVelocity: {
    term: "Relative velocity",
    text: "How fast you are moving compared with the other spacecraft, not with the planet. Both are going about 7.7 km/s around Earth, but for docking only the small difference between them matters.",
  },

  // Docking
  rcsTranslation: {
    term: "Translation (RCS)",
    text: "Moving the spacecraft sideways, up and down, or forward and back without turning it. Each press fires the small RCS thrusters in one short pulse, adding a fixed bit of speed. To stop, pulse the opposite way: in space nothing slows you down.",
  },
  rcsRotation: {
    term: "Rotation: pitch, yaw, roll",
    text: "Turning the spacecraft: pitch tips the nose up or down, yaw swings it left or right, roll spins it around its own axis. Each pulse starts a turn that keeps going until an opposite pulse stops it.",
  },
  pulsePrecision: {
    term: "Pulse precision",
    text: "How big each RCS pulse is. Coarse pulses change your speed quickly and are good far out; fine pulses are tiny and let you make the last careful corrections close to the port.",
  },
  closingSpeed: {
    term: "Closing speed",
    text: "How fast the gap to the docking port is shrinking (negative means you are drifting away). Arrive too fast and the ports bounce or get damaged: dock at under 0.2 m/s.",
  },

  // Refueling
  depot: {
    term: "Propellant depot",
    text: "A fuel station in orbit. Rather than launching all the fuel for the whole trip at once, tankers stock the depot ahead of time, and the spacecraft tops up its stages there through the docking port.",
  },

  // Ejection burns
  ejectionBurn: {
    term: "Ejection burn",
    text: "The engine burn that throws the spacecraft out of its parking orbit toward its target: onto a path around the Sun toward the next planet, or out to the Moon. It is made at the lowest point of the orbit, where the spacecraft is fastest, because a burn there adds the most energy (the Oberth effect).",
  },
  burnAngle: {
    term: "Burn angle",
    text: "Which way the spacecraft leaves the planet, compared with the planet's own motion around the Sun. Leaving along it adds to the planet's speed and carries you outward (toward Mars); leaving against it subtracts and drops you inward (toward Earth). Small angles fine-tune where you cross the target's orbit. On the way to the Moon it is measured from the spacecraft's own direction of travel around Earth instead.",
  },
  moonPhaseAngle: {
    term: "Moon angle",
    text: "How far ahead of the spacecraft the Moon is around Earth at the moment of the burn. The spacecraft takes a few days to climb out to the Moon's distance, and the Moon keeps moving meanwhile, so it has to be well ahead at the burn: the burn aims at where the Moon will be, not where it is.",
  },
  burnDeltaV: {
    term: "Burn Δv",
    text: "How much speed the burn adds, in metres per second. Too little and the spacecraft can't escape the planet or falls short of the target; too much and it crosses the target's orbit too early or too fast. It also decides how much propellant the burn uses.",
  },
  burnPropellant: {
    term: "Propellant for the burn",
    text: "The fuel and oxidiser the active stage has to burn to give that Δv, from the rocket equation. Each extra m/s costs more than the last, because the stage has to push the propellant it hasn't burnt yet too.",
  },
  vInf: {
    term: "Departure speed (v∞)",
    text: "Speed left over once the spacecraft has climbed out of the planet's gravity (\"v-infinity\"). This is what actually sends it on its way around the Sun. Some of the burn is spent just escaping, so v∞ is smaller than the burn's Δv.",
  },

  // Cruise systems
  au: {
    term: "AU (astronomical unit)",
    text: "The average distance from the Earth to the Sun, about 150 million km. Mars orbits at about 1.52 AU.",
  },
  sunlight: {
    term: "Sunlight",
    text: "Sunlight spreads out as it travels, so it weakens with the square of the distance from the Sun. At Mars (1.52 AU) the solar panels get only about 43% of the light they get at Earth.",
  },
  solarOutput: {
    term: "Solar output",
    text: "The electricity the solar panels make right now. It falls as the spacecraft moves away from the Sun. When it drops below the demand, the battery makes up the difference until it runs flat.",
  },
  powerDemand: {
    term: "Power demand",
    text: "The electricity the spacecraft needs all the time for life support, computers, radios and heaters.",
  },
  heatLoad: {
    term: "Heat load",
    text: "The waste heat the crew and the electronics give off. In a vacuum it can't blow away, so radiators have to glow it out into space; if they shed less than this, the cabin warms up.",
  },

  // Science experiments
  dataQuality: {
    term: "Data quality",
    text: "How useful the run's data is, from 0 to 100%. It mostly comes from the signal-to-noise ratio: how strong the thing you're measuring is compared with the random noise in the measurement. A result needs 60% to count.",
  },
  exposure: {
    term: "Exposure",
    text: "How long the camera collects light for each picture. Longer exposures gather more light (less noise), but the spacecraft keeps moving, so the picture smears.",
  },
  filter: {
    term: "Filter",
    text: "Lets only one colour (wavelength) of light into the camera. Each filter shows different things, and some colours are much brighter than others at Mars.",
  },
  integrationTime: {
    term: "Integration time",
    text: "How long the instrument adds up its measurements before giving a result. Noise averages out as it goes, so longer times can detect fainter signals.",
  },
  viewingGeometry: {
    term: "Viewing geometry",
    text: "Where the instrument looks. Nadir is straight down through the atmosphere; limb is sideways across its edge, a much longer path through the air, which makes thin gases easier to detect and shows how they change with height.",
  },
  boomLength: {
    term: "Boom length",
    text: "How far out on a pole the magnetometer sits. The spacecraft's own electronics make magnetic noise that fades quickly with distance, so a longer boom hears the planet more clearly.",
  },
  radarFrequency: {
    term: "Radar frequency",
    text: "How fast the radar waves oscillate. Lower frequencies reach deeper into ice, higher ones show finer layers. Waves below the ionosphere's plasma frequency are reflected or absorbed before reaching the ground, and the ionosphere is much stronger on the day side.",
  },
  localSolarTime: {
    term: "Local solar time",
    text: "The time of day on the ground below, by the Sun: 12 h is noon, 0 h midnight. Rock and dust warm up and cool down at different rates, so their temperatures differ most at certain times of day.",
  },
  wavelengthBand: {
    term: "Wavelength band",
    text: "Which infrared wavelengths the camera measures. Warm surfaces glow most strongly at a wavelength that depends on their temperature, so the right band gives the strongest signal.",
  },
  radioBand: {
    term: "Radio band",
    text: "The radio frequency used. Higher bands (X, Ka) are disturbed less by charged gas between the planets and measure more precisely; lower bands (S) are more affected.",
  },
  sampleRate: {
    term: "Sample rate",
    text: "How many measurements the receiver takes each second. Faster sampling means finer detail as the signal slices through the atmosphere.",
  },

  // Earth reentry
  entryAngle: {
    term: "Entry angle",
    text: "How steeply the capsule's path points below the horizon when it reaches the top of the atmosphere (120 km). Together with the speed it decides the whole reentry: too shallow skips back out to space, too steep overheats and crushes.",
  },
  angleOfAttack: {
    term: "Angle of attack",
    text: "The tilt between the capsule's axis and the air rushing at it. A tilted capsule makes some lift, like a wing, which the guidance aims up or down to steer the descent. The tilt also pushes one shoulder of the heat shield further into the flow.",
  },
  entrySpeed: {
    term: "Entry speed",
    text: "How fast the capsule hits the top of the atmosphere. Coming back from Mars it is about 11.5 km/s, faster than coming back from Earth orbit (7.8 km/s), because it also falls all the way down Earth's gravity.",
  },
  liftToDrag: {
    term: "Lift-to-drag ratio (L/D)",
    text: "How much sideways lift the capsule makes for each unit of drag. A capsule's L/D is small (about 0.3 at most), but enough to stretch or shorten the descent and soften the braking.",
  },
  windwardShoulder: {
    term: "Windward shoulder",
    text: "The edge of the heat shield turned into the airflow by the angle of attack. It is heated more than the centre; the more the capsule tilts, the hotter it gets.",
  },
  flightPathAngle: {
    term: "Flight path angle",
    text: "The angle between the direction of travel and the horizon: negative is descending, positive climbing. If it turns positive high up, the capsule may be skipping back out of the atmosphere.",
  },
  downrange: {
    term: "Downrange",
    text: "Distance travelled over the ground since the entry interface. Lift stretches it, which spreads the braking over a longer path.",
  },
  gForce: {
    term: "Deceleration (g)",
    text: "How hard the air is braking the capsule, in multiples of Earth's gravity (g). Crews can survive brief peaks of about 15 g lying down; past that, the capsule's structure gives way too.",
  },
  heatFlux: {
    term: "Heat flux",
    text: "How much heat pours into each square centimetre of the heat shield every second. It grows with the cube of speed and the square root of air density, so it peaks partway down, while the capsule is still fast.",
  },
  heatShield: {
    term: "Heat shield (ablator)",
    text: "The thick base of the capsule, facing the flow. Its ablative material chars and slowly burns away, carrying the heat off with it. If any part gets too hot it burns through, and the capsule is lost.",
  },
};
