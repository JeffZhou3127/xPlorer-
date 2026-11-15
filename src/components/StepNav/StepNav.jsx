import { useId } from "react";
import "./StepNav.css";

// Back / Continue buttons for moving between mission steps. They float above the page,
// pulled in toward the centre of the screen so the deployed site's branding badge in the
// corner never covers them. Either button is left out when its handler is not passed.
// When `blockedReason` is set, Continue uses aria-disabled rather than disabled, so it can
// still be hovered and focused to show why it is unavailable.
const StepNav = ({ onBack, onContinue, blockedReason }) => {
  const tipId = useId();
  const blocked = Boolean(blockedReason);

  return (
    <nav className="step-nav" aria-label="Mission steps">
      {onBack && (
        <button type="button" className="step-nav__back" onClick={onBack}>
          ← Back
        </button>
      )}
      {onContinue && (
        <div className="step-nav__continue">
          <button
            type="button"
            className="step-nav__continue-button"
            aria-disabled={blocked}
            aria-describedby={blocked ? tipId : undefined}
            onClick={blocked ? undefined : onContinue}
          >
            Continue →
          </button>
          {blocked && (
            <span className="step-nav__tip" id={tipId} role="tooltip">
              {blockedReason}
            </span>
          )}
        </div>
      )}
    </nav>
  );
};

export default StepNav;
