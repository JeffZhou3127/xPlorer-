import "./ThreePane.css";

// Three-column page layout: side panels around a centered main view.
const ThreePane = ({ left, center, right }) => (
  <div className="three-pane">
    <section className="three-pane__side three-pane__left">{left}</section>
    <section className="three-pane__center">{center}</section>
    <section className="three-pane__side three-pane__right">{right}</section>
  </div>
);

export default ThreePane;
