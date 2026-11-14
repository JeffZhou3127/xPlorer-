// Short explanations shown in the "?" tooltips on the design screen.
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
    text: "The spacecraft on top that you are trying to get to orbit: the crew capsule, service module and protective fairing.",
  },
};
