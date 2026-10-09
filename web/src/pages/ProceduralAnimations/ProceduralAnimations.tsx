import { Link } from "react-router-dom";
import TypeWriterText from "../../components/TypeWriterText";
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
          <p className="procedural-animations-eyebrow">Computational Motion</p>
          <h1>
            <TypeWriterText text="Procedural Animations" speed={60} />
          </h1>
          <p>
            Self-contained motion pieces where movement is generated in code
            from rules, time, and noise rather than keyframed by hand. The
            simulations model systems to explore; these pieces are composed to
            be watched.
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
              className="procedural-animations-card interactive-card"
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
              <h2>{piece.title}</h2>
              <p className="procedural-animations-card__description">
                {piece.description}
              </p>
              <span className="procedural-animations-card__link">View piece →</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
};

export default ProceduralAnimations;
