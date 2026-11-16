import "./SplitPane.css";

// Two equal columns filling the screen: controls on the left, the main view on the right.
// `narrowLeft` gives the controls a third of the width instead.
const SplitPane = ({ left, right, narrowLeft = false }) => (
  <div className={`split-pane${narrowLeft ? " split-pane--narrow-left" : ""}`}>
    <section className="split-pane__left">{left}</section>
    <section className="split-pane__right">{right}</section>
  </div>
);

export default SplitPane;
