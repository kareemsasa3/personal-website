import "./Work.css";
import {
  professionalContactContent,
  socialContent,
} from "../../data/siteContent";
import { workExperienceData } from "../../data/workExperience";
import WorkDetails from "../../components/WorkDetails";
import React, { useEffect } from "react";
import { useLayoutContext, PageSection } from "../../contexts/LayoutContext";

// Create sections outside the component to prevent recreation on every render
const workSections: PageSection[] = workExperienceData.map((exp) => ({
  id: `work-${exp.id}`,
  label: exp.company,
}));

const emailLink = socialContent.links.find((link) =>
  link.url.startsWith("mailto:")
);
const linkedInLink = socialContent.links.find(
  (link) => link.name === "LinkedIn"
);

const Work = () => {
  // Get the section management from our context
  const { setSections } = useLayoutContext();

  // Announce our sections when the component mounts
  useEffect(() => {
    setSections(workSections);
    return () => setSections([]);
  }, [setSections]); // workSections is stable (defined outside component)

  // Check if data is available
  if (!workExperienceData || workExperienceData.length === 0) {
    return (
      <div
        className="page-content work-page"
      >
        <div>Loading work experience data...</div>
      </div>
    );
  }

  return (
    <div
      className="page-content work-page"
    >
      <header className="work-header prose-surface">
        <h1 className="work-title">
          Experience
        </h1>
        <p className="work-subtitle">
          Professional experience across consulting, delivery, and platform
          engineering work.
        </p>
      </header>
      <div className="work-timeline-container">
        {workExperienceData.map((exp, index) => (
          <React.Fragment key={exp.id}>
            <div className="work-timeline-item">
              <div
                className={`timeline-node ${exp.type
                  .toLowerCase()
                  .replace("/", "-")}`}
              ></div>
              {index < workExperienceData.length - 1 && (
                <div className="timeline-line"></div>
              )}
            </div>
            <div id={`work-${exp.id}`} className="work-timeline-content">
              <WorkDetails {...exp} />
            </div>
          </React.Fragment>
        ))}
      </div>
      <section className="work-contact-cta" aria-labelledby="work-contact-title">
        <div>
          <p className="work-contact-eyebrow">Next Step</p>
          <h2 id="work-contact-title">{professionalContactContent.title}</h2>
          <p>{professionalContactContent.description}</p>
        </div>
        <div className="work-contact-actions">
          {emailLink && (
            <a className="work-contact-link primary" href={emailLink.url}>
              {professionalContactContent.primaryActionLabel}
            </a>
          )}
          {linkedInLink && (
            <a
              className="work-contact-link"
              href={linkedInLink.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {professionalContactContent.secondaryActionLabel}
            </a>
          )}
        </div>
      </section>
    </div>
  );
};

export default Work;
