import "./RcsControls.css";

// Pad layouts on a 3 × 3 grid: each button is { args, glyph, label, key, shortcut, row,
// col }; pressing it calls the pad's handler with `args`. `key` is the shortcut as shown,
// `shortcut` its KeyboardEvent key name.
const TRANSLATE = [
  { args: ["up"], glyph: "▲", label: "Up", key: "W", shortcut: "w", row: 1, col: 2 },
  { args: ["left"], glyph: "◀", label: "Left", key: "A", shortcut: "a", row: 2, col: 1 },
  { args: ["right"], glyph: "▶", label: "Right", key: "D", shortcut: "d", row: 2, col: 3 },
  { args: ["down"], glyph: "▼", label: "Down", key: "S", shortcut: "s", row: 3, col: 2 },
  { args: ["forward"], glyph: "⊕", label: "Forward", key: "E", shortcut: "e", row: 1, col: 3 },
  { args: ["back"], glyph: "⊖", label: "Back", key: "Q", shortcut: "q", row: 3, col: 1 },
];

const ROTATE = [
  { args: ["pitch", 1], glyph: "▲", label: "Pitch up", key: "↑", shortcut: "ArrowUp", row: 1, col: 2 },
  { args: ["yaw", -1], glyph: "◀", label: "Yaw left", key: "←", shortcut: "ArrowLeft", row: 2, col: 1 },
  { args: ["yaw", 1], glyph: "▶", label: "Yaw right", key: "→", shortcut: "ArrowRight", row: 2, col: 3 },
  { args: ["pitch", -1], glyph: "▼", label: "Pitch down", key: "↓", shortcut: "ArrowDown", row: 3, col: 2 },
  { args: ["roll", -1], glyph: "↺", label: "Roll left", key: "Z", shortcut: "z", row: 1, col: 1 },
  { args: ["roll", 1], glyph: "↻", label: "Roll right", key: "X", shortcut: "x", row: 1, col: 3 },
];

const Pad = ({ title, buttons, step, disabled, heldKeys, onPress }) => (
  <fieldset className="rcs-controls" disabled={disabled}>
    <legend className="rcs-controls__title">{title}</legend>
    <div className="rcs-controls__pad">
      {buttons.map(({ args, glyph, label, key, shortcut, row, col }) => (
        <button
          key={label}
          type="button"
          className={`rcs-controls__button ${heldKeys.has(shortcut) ? "rcs-controls__button--held" : ""}`}
          style={{ gridRow: row, gridColumn: col }}
          aria-label={`${label} (${key})`}
          title={`${label} (${key})`}
          onClick={() => onPress(...args)}
        >
          <span className="rcs-controls__glyph" aria-hidden="true">
            {glyph}
          </span>
          <span className="rcs-controls__key" aria-hidden="true">
            {key}
          </span>
        </button>
      ))}
    </div>
    <p className="rcs-controls__step">{step} per pulse</p>
  </fieldset>
);

// Two RCS pulse pads: translation (onTranslate(direction), a dockingSim DIRECTIONS key)
// and rotation (onRotate(axis, sign)). `translationStep` / `rotationStep` label what one
// pulse does; `disabled` greys both out. The keyboard shortcuts shown on the buttons are
// handled by the view, which passes the keys held down (`heldKeys`, a Set of
// KeyboardEvent key names, letters in lower case) so their buttons light up.
const RcsControls = ({ translationStep, rotationStep, disabled, heldKeys, onTranslate, onRotate }) => (
  <>
    <Pad
      title="Translate"
      buttons={TRANSLATE}
      step={`${translationStep} m/s`}
      disabled={disabled}
      heldKeys={heldKeys}
      onPress={onTranslate}
    />
    <Pad
      title="Rotate"
      buttons={ROTATE}
      step={`${rotationStep} °/s`}
      disabled={disabled}
      heldKeys={heldKeys}
      onPress={onRotate}
    />
  </>
);

export default RcsControls;
