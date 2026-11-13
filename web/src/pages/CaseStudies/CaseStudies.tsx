import { Link } from "react-router-dom";
import ProjectMedia from "../../components/ProjectMedia";
import { caseStudyCards, type CaseStudyCard } from "../../data/caseStudies";
import "../../components/CaseStudyPage/CaseStudyPage.css";

const systemStudies = caseStudyCards.filter((caseStudy) => caseStudy.kind !== "experiment");
const experimentStudies = caseStudyCards.filter((caseStudy) => caseStudy.kind === "experiment");

const CaseStudyCardLink = ({ caseStudy }: { caseStudy: CaseStudyCard }) => (
  <Link
    to={`/case-studies/${caseStudy.slug}`}
    className="case-study-card interactive-card df-control df-control--card df-body-sm"
  >
    {caseStudy.media && (
      <ProjectMedia
        media={caseStudy.media}
        label={caseStudy.slug}
        decorative
      />
    )}
    <div className="case-study-card-header">
      <div>
        <h3 className="df-heading-3">{caseStudy.title}</h3>
        <p>{caseStudy.shortDescription}</p>
      </div>
      <div className="case-study-card-meta">
        <span
          className={`status-badge df-label-sm df-context${
            caseStudy.status.toLowerCase() === "live" ? " df-context--live" : ""
          }`}
        >
          {caseStudy.status}
        </span>
      </div>
    </div>

    <div className="case-study-focus-list">
      {caseStudy.focusAreas.map((focusArea) => (
        <span key={focusArea} className="tech-tag df-label-sm df-context">
          {focusArea}
        </span>
      ))}
    </div>

    <div className="case-study-card-actions">
      <span className="case-study-card-link df-label">Read case study →</span>
    </div>
  </Link>
);

const CaseStudies = () => {
  return (
    <div className="page-content case-studies-page df-body">
      <div className="case-study-container">
        <header id="case-studies-overview" className="case-studies-header prose-surface prose-surface--start">
          <p className="case-study-eyebrow df-label">System Case Studies</p>
          <h1 className="df-heading-1">
            Case Studies
          </h1>
          <p className="df-body-lg">
            These studies are the narrative layer for the flagship systems,
            covering the problem, constraints, architecture, key decisions, and
            trade-offs behind each one.
          </p>
        </header>

        <section id="case-studies-list" className="case-studies-grid case-studies-grid--systems">
          {systemStudies.map((caseStudy) => (
            <CaseStudyCardLink key={caseStudy.slug} caseStudy={caseStudy} />
          ))}
        </section>

        {experimentStudies.length > 0 && (
          <section id="case-studies-experiments" aria-labelledby="case-studies-experiments-title">
            <header className="case-studies-header prose-surface prose-surface--start">
              <h2 className="df-heading-2" id="case-studies-experiments-title">Experiments</h2>
              <p className="df-body-lg">
                Studies of how the work gets done, judged against the artifacts it
                produced rather than the accounts of it.
              </p>
            </header>
            <div className="case-studies-grid case-studies-grid--tracks">
              {experimentStudies.map((caseStudy) => (
                <CaseStudyCardLink key={caseStudy.slug} caseStudy={caseStudy} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default CaseStudies;
