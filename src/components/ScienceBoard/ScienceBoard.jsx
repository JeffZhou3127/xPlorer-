import "./ScienceBoard.css";

// Page frame for the science experiments: the "Science Experiments" header, an intro,
// progress (`completed` of `total`, `required` needed to continue) and the cards
// (`children`) in a grid.
const ScienceBoard = ({ intro, completed, total, required, children }) => {
  const ready = completed >= required;

  return (
    <main className="science-board">
      <header className="science-board__header">
        <h1 className="science-board__title">Science Experiments</h1>
        <p className="science-board__intro">{intro}</p>
        <p className={`science-board__progress ${ready ? "science-board__progress--ready" : ""}`} role="status">
          <strong>
            {completed} of {total}
          </strong>{" "}
          experiments complete.{" "}
          {ready ? "Enough data to continue." : `Complete at least ${required} to continue.`}
        </p>
      </header>
      <div className="science-board__grid">{children}</div>
    </main>
  );
};

export default ScienceBoard;
