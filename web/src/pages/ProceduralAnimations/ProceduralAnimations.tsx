import TypeWriterText from "../../components/TypeWriterText";
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

        <section id="procedural-animations-gallery" aria-label="Pieces">
          <p className="procedural-animations-empty">
            No pieces are published yet.
          </p>
        </section>
      </div>
    </div>
  );
};

export default ProceduralAnimations;
