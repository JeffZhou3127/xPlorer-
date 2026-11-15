import { Field, Readout } from "../EjectionForm/EjectionForm.jsx";
import { format } from "../../utils/format.js";
import "../EjectionForm/EjectionForm.css";

// The reentry controls (same card look as the ejection burn form): the entry angle
// (`entryAngle`, degrees below the horizon at the 120 km entry interface; frozen once
// `started`) and the angle of attack (`aoa`, degrees; frozen once `aoaLocked`, at the radio
// blackout), what they give (`entrySpeed` m/s, `liftToDrag`, `windwardFactor`: the
// windward shoulder's share of the heating against the centre's), and the Start button,
// greyed out with `blockedReason` shown under it while the capsule can't start yet.
const ReentryForm = ({
  entryAngle,
  aoa,
  entryAngleRange,
  aoaRange,
  onEntryAngleChange,
  onAoaChange,
  entrySpeed,
  liftToDrag,
  windwardFactor,
  started,
  aoaLocked,
  blockedReason,
  onStart,
}) => (
  <form
    className="ejection-form"
    onSubmit={(e) => {
      e.preventDefault();
      if (!blockedReason && !started) onStart();
    }}
  >
    <h3 className="ejection-form__title">Reentry</h3>
    <Field
      label="Entry angle"
      info="entryAngle"
      hint="How steeply the capsule dives into the atmosphere at 120 km, below the horizon. Too shallow and it skips back out; too steep and it heats and brakes too hard. Locks at Start."
      unit="°"
      range={entryAngleRange}
      value={entryAngle}
      disabled={started}
      onChange={onEntryAngleChange}
    />
    <Field
      label="Angle of attack"
      info="angleOfAttack"
      hint="Tilting the capsule makes lift, which the guidance uses to hold it in the atmosphere and ease the braking. But it turns one shoulder of the heat shield into the flow. Can be changed until the radio blackout."
      unit="°"
      range={aoaRange}
      value={aoa}
      disabled={aoaLocked}
      onChange={onAoaChange}
    />

    <dl className="ejection-form__readouts">
      <Readout label="Entry speed" info="entrySpeed" value={`${format(entrySpeed / 1000, 2)} km/s`} />
      <Readout label="Lift-to-drag ratio" info="liftToDrag" value={format(liftToDrag, 2)} />
      <Readout
        label="Windward shoulder heating"
        info="windwardShoulder"
        value={`${format(windwardFactor * 100)}% of the centre's`}
        alert={windwardFactor > 1.5}
      />
    </dl>

    <button type="submit" className="ejection-form__eject" disabled={Boolean(blockedReason) || started}>
      Start
    </button>
    {blockedReason && !started && <p className="ejection-form__blocked">{blockedReason}</p>}
  </form>
);

export default ReentryForm;
