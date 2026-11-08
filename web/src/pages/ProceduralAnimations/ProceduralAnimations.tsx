import { Link } from "react-router-dom";
import { proceduralAnimationsData } from "../../data/proceduralAnimations";
import "./ProceduralAnimations.css";

const ProceduralAnimations = () => {
  return (
    <div className="page-content procedural-animations-page">
      <div className="procedural-animations-container">
        <header
          id="procedural-animations-overview"
          className="procedural-animations-header prose-surface prose-surface--start"
        >
          <p className="procedural-animations-eyebrow df-label">Computational Motion</p>
          <h1 className="df-heading-1">
            Procedural Animations
          </h1>
          <p className="df-body-lg">
            Code-driven explorations of motion, from procedural systems to
            choreographed three-dimensional scenes. The simulations model
            systems to explore; these pieces are composed to be watched.
          </p>
        </header>

        <section
          id="procedural-animations-gallery"
          aria-label="Pieces"
          className="procedural-animations-grid"
        >
          {proceduralAnimationsData.map((piece) => (
            <Link
              key={piece.slug}
              to={`/procedural-animations/${piece.slug}`}
              className="procedural-animations-card interactive-card df-control df-control--card"
            >
              <img
                className="procedural-animations-card__poster"
                src={piece.poster}
                alt=""
                width={960}
                height={540}
                loading="lazy"
                decoding="async"
              />
              <h2 className="df-heading-3">{piece.title}</h2>
              <p className="procedural-animations-card__description df-body-sm">
                {piece.description}
              </p>
              <span className="procedural-animations-card__link df-label">View piece →</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ProceduralAnimations;
