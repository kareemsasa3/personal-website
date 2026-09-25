import { Link } from "react-router-dom";
import "./ExplorationChoiceSection.css";

export const ExplorationChoiceSection = () => (
  <nav className="exploration-choice" aria-label="Keep exploring">
    <Link
      to="/writing"
      className="exploration-pill exploration-pill--red"
      aria-label="Read the writing" title="Read the writing"
    >
      <span className="exploration-pill-capsule" aria-hidden="true" />
    </Link>
    <Link
      to="/simulations"
      className="exploration-pill exploration-pill--blue"
      aria-label="Explore simulations" title="Explore simulations"
    >
      <span className="exploration-pill-capsule" aria-hidden="true" />
    </Link>
  </nav>
);
