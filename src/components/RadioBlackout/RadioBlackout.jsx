import "./RadioBlackout.css";

// Full-screen radio blackout during the reentry: the screen flickers a few times, then goes
// black with the "Radio Blackout" header and `children` (the explanation) under it. The
// mission clock (z-index 100) stays on top.
const RadioBlackout = ({ children }) => (
  <div className="radio-blackout" role="alert" aria-labelledby="radio-blackout-title">
    <div className="radio-blackout__content">
      <h1 className="radio-blackout__title" id="radio-blackout-title">
        Radio Blackout
      </h1>
      <div className="radio-blackout__text">{children}</div>
    </div>
  </div>
);

export default RadioBlackout;
