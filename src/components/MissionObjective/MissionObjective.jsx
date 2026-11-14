import "./MissionObjective.css"

const MissionObjective = ({ name, description }) => {
  return (
    <section className="mission-objective">
      <h2 className="mission-objective__name">{name}</h2>
      <p className="mission-objective__description">{description}</p>
    </section>
  )
}

export default MissionObjective
