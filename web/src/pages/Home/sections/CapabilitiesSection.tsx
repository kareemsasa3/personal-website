import "./CapabilitiesSection.css";
import { forwardRef, ForwardedRef, CSSProperties } from "react";
import { capabilitiesContent } from "../../../data/siteContent";

interface CapabilitiesSectionProps {
  style?: CSSProperties;
}

export const CapabilitiesSection = forwardRef(
  ({ style }: CapabilitiesSectionProps, ref: ForwardedRef<HTMLElement>) => {
    return (
      <section
        ref={ref}
        className="capabilities-section"
        role="region"
        aria-labelledby="capabilities-title"
        style={style}
      >
        <div className="capabilities-content">
          <h2
            id="capabilities-title"
            className="section-title df-heading-2"
          >
            {capabilitiesContent.title}
          </h2>
          <ul
            className="capabilities-list prose-surface"
            aria-label="Engineering capabilities"
          >
            {capabilitiesContent.items.map((item, index) => (
              <li
                key={item.title}
                className="capability-row"
              >
                <span className="capability-index df-data" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="df-heading-3">{item.title}</h3>
                <p>{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
);

CapabilitiesSection.displayName = "CapabilitiesSection";
