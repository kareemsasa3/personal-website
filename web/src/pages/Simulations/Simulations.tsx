import { simulationsData } from "../../data/simulationsData";
import SimulationCard from "../../components/SimulationCard";
import "./Simulations.css";

const Simulations = () => {
  return (
    <div className="page-content">
      <div className="simulations-container">
        <div className="simulations-header">
          <h1 className="simulations-title">Simulations</h1>
          <p className="simulations-subtitle">
            Interactive systems exploring state, rules, feedback loops, and
            emergent behavior — built to model, visualize, and stress real
            dynamics.
          </p>
        </div>

        <div className="simulations-grid">
          {simulationsData.map((simulation) => (
            <SimulationCard key={simulation.id} {...simulation} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Simulations;
