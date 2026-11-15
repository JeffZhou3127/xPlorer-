import "./SplitPane.css";

// Two equal columns filling the screen: controls on the left, the main view on the right.
const SplitPane = ({ left, right }) => (
  <div className="split-pane">
    <section className="split-pane__left">{left}</section>
    <section className="split-pane__right">{right}</section>
  </div>
);

export default SplitPane;
