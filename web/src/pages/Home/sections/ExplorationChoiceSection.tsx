import { Link } from "react-router-dom";
import "./ExplorationChoiceSection.css";

export const ExplorationChoiceSection = () => (
  <nav className="exploration-choice" aria-label="Keep exploring">
    <Link to="/writing" className="exploration-pill df-control df-label">
      Read the writing
    </Link>
    <Link to="/simulations" className="exploration-pill df-control df-label">
      Explore simulations
    </Link>
  </nav>
);
