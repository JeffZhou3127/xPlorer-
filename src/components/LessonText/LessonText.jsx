import "./LessonText.css";

// Left-pane text for an informational step: a title like FlightControls', then one
// paragraph per entry in `paragraphs` (text or elements, e.g. with InfoTips).
const LessonText = ({ title, paragraphs }) => (
  <article className="lesson-text">
    <h1 className="lesson-text__title">{title}</h1>
    {paragraphs.map((content, i) => (
      // The paragraphs are fixed, so their order is a stable key.
      <p key={i} className="lesson-text__paragraph">
        {content}
      </p>
    ))}
  </article>
);

export default LessonText;
