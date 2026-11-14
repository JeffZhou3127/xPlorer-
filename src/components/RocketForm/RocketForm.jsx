import StageCard from "../StageCard/StageCard.jsx";
import "./RocketForm.css";

const RocketForm = ({
  stages,
  maxStages,
  fuelRanges,
  onAddStage,
  onRemoveStage,
  onStageChange,
}) => {
  const canAdd = stages.length < maxStages;
  const canRemove = stages.length > 1;

  return (
    <form className="rocket-form" onSubmit={(e) => e.preventDefault()}>
      <h2 className="rocket-form__title">Design</h2>
      <p className="rocket-form__hint">
        Stages: {stages.length} / {maxStages}
      </p>

      <div className="rocket-form__stages">
        {/* List top stage first so the cards line up with the diagram. */}
        {stages.toReversed().map((stage, i) => {
          const index = stages.length - 1 - i;
          return (
            <StageCard
              key={stage.id}
              number={index + 1}
              stage={stage}
              minFuel={fuelRanges[index].min}
              maxFuel={fuelRanges[index].max}
              canRemove={canRemove}
              onChange={(patch) => onStageChange(stage.id, patch)}
              onRemove={() => onRemoveStage(stage.id)}
            />
          );
        })}
      </div>

      <button
        type="button"
        className="rocket-form__add"
        onClick={onAddStage}
        disabled={!canAdd}
      >
        {canAdd ? "+ Add Stage" : "Max stages reached"}
      </button>
    </form>
  );
};

export default RocketForm;
