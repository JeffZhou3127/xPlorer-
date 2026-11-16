import "./ViewRow.css";

// Two flight views side by side, filling the rest of the right pane: the first (e.g. the
// attitude ring) takes 2 parts of the width, the second (e.g. the 3D trajectory) 3.
// Stacks on narrow screens.
const ViewRow = ({ children }) => <div className="view-row">{children}</div>;

export default ViewRow;
