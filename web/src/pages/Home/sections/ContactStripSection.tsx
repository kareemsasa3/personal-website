import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./ContactStripSection.css";
import { forwardRef, ForwardedRef, CSSProperties } from "react";
import {
  professionalContactContent,
  socialContent,
} from "../../../data/siteContent";

interface ContactStripSectionProps {
  style?: CSSProperties;
}

export const ContactStripSection = forwardRef(
  ({ style }: ContactStripSectionProps, ref: ForwardedRef<HTMLElement>) => {
    return (
      <section
        ref={ref}
        className="contact-strip-section"
        role="region"
        aria-labelledby="contact-title"
        style={style}
      >
        <div className="contact-strip-content interactive-card">
          <h2
            id="contact-title"
            className="contact-strip-title"
          >
            {socialContent.title}
          </h2>
          <p
            className="contact-strip-description"
          >
            {professionalContactContent.description}
          </p>
          <div
            className="contact-strip-links"
          >
            {socialContent.links.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target={link.url.startsWith("mailto:") ? undefined : "_blank"}
                rel={
                  link.url.startsWith("mailto:")
                    ? undefined
                    : "noopener noreferrer"
                }
                className="contact-strip-link"
              >
                <span aria-hidden="true"><FontAwesomeIcon icon={link.icon} /></span>
                <span>{link.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }
);

ContactStripSection.displayName = "ContactStripSection";
