import { Link } from "react-router-dom";
import { SimulationData } from "../../data/simulationsData";
import "./SimulationCard.css";

interface SimulationCardProps extends SimulationData {
  isComingSoon?: boolean;
}

const SimulationCard: React.FC<SimulationCardProps> = ({
  title,
  description,
  path,
  previewType,
  modeLabel,
  statusLabel,
  externalUrl,
  isAvailable,
  isComingSoon = false,
}) => {
  const renderPreview = () => {
    switch (previewType) {
      case "snake":
        return (
          <div className="snake-preview" aria-hidden="true">
            <div className="snake-segment-preview"></div>
            <div className="snake-segment-preview"></div>
            <div className="snake-segment-preview"></div>
            <div className="food-preview"></div>
          </div>
        );
      case "spider":
        return (
          <div className="spider-preview" aria-hidden="true">
            <div className="spider-preview-column spider-preview-column-tall">
              <div className="spider-preview-card spider-preview-card-back"></div>
              <div className="spider-preview-card spider-preview-card-back"></div>
              <div className="spider-preview-card spider-preview-card-face">K</div>
            </div>
            <div className="spider-preview-column">
              <div className="spider-preview-card spider-preview-card-back"></div>
              <div className="spider-preview-card spider-preview-card-face">9</div>
            </div>
            <div className="spider-preview-column spider-preview-column-tall">
              <div className="spider-preview-card spider-preview-card-back"></div>
              <div className="spider-preview-card spider-preview-card-back"></div>
              <div className="spider-preview-card spider-preview-card-back"></div>
              <div className="spider-preview-card spider-preview-card-face">Q</div>
            </div>
            <div className="spider-preview-column">
              <div className="spider-preview-card spider-preview-card-back"></div>
              <div className="spider-preview-card spider-preview-card-face">7</div>
            </div>
            <div className="spider-preview-stock">
              <div className="spider-preview-card spider-preview-card-back"></div>
              <div className="spider-preview-card spider-preview-card-back"></div>
            </div>
          </div>
        );
      case "rhythm-lab":
        return (
          <div className="rhythm-preview" aria-hidden="true">
            <div className="rhythm-lane">
              <span className="rhythm-note rhythm-note-one"></span>
            </div>
            <div className="rhythm-lane">
              <span className="rhythm-note rhythm-note-two"></span>
            </div>
            <div className="rhythm-lane">
              <span className="rhythm-note rhythm-note-three"></span>
            </div>
            <div className="rhythm-target-line"></div>
          </div>
        );
      case "annals":
        return (
          <div className="annals-preview" aria-hidden="true">
            <div className="annals-preview-masthead"></div>
            <div className="annals-preview-line"></div>
            <div className="annals-preview-line annals-preview-line-hand"></div>
            <div className="annals-preview-line"></div>
            <div className="annals-preview-line annals-preview-line-death"></div>
            <div className="annals-preview-line"></div>
          </div>
        );
      case "orbital":
        return (
          <svg viewBox="0 0 240 140" width="240" height="140" aria-hidden="true" style={{ maxWidth: "100%", color: "var(--brand-primary)" }}>
            <ellipse cx="120" cy="70" rx="90" ry="45" fill="none" stroke="currentColor" opacity="0.6" />
            <ellipse cx="120" cy="70" rx="52" ry="26" fill="none" stroke="currentColor" opacity="0.4" />
            <circle cx="120" cy="70" r="10" fill="currentColor" />
            <circle cx="210" cy="70" r="6" fill="currentColor" />
            <circle cx="120" cy="44" r="4" fill="currentColor" />
          </svg>
        );
      case "traffic":
        return (
          <svg viewBox="0 0 240 140" width="240" height="140" aria-hidden="true" style={{ maxWidth: "100%", color: "var(--brand-primary)" }}>
            <line x1="10" y1="70" x2="230" y2="70" stroke="currentColor" opacity="0.4" strokeDasharray="8 8" />
            <rect x="10" y="44" width="220" height="52" fill="none" stroke="currentColor" opacity="0.6" />
            <rect x="150" y="38" width="4" height="64" fill="currentColor" />
            <rect x="126" y="52" width="18" height="10" fill="currentColor" />
            <rect x="102" y="52" width="18" height="10" fill="currentColor" opacity="0.8" />
            <rect x="78" y="52" width="18" height="10" fill="currentColor" opacity="0.6" />
            <rect x="130" y="78" width="18" height="10" fill="currentColor" />
            <rect x="96" y="78" width="18" height="10" fill="currentColor" opacity="0.7" />
            <rect x="196" y="78" width="18" height="10" fill="currentColor" opacity="0.4" />
          </svg>
        );
      case "placeholder":
      default:
        return <div className="placeholder" aria-hidden="true">[ &#43; ]</div>;
    }
  };

  if (isComingSoon || !isAvailable) {
    return (
      <div className="simulation-card coming-soon">
        <div className="simulation-card-content">
          <h3>{title}</h3>
          {statusLabel ? (
            <div className="simulation-card-badge">{statusLabel}</div>
          ) : null}
          <p>{description}</p>
          <div className="simulation-preview">{renderPreview()}</div>
        </div>
      </div>
    );
  }

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noreferrer"
        className="simulation-card"
      >
        <div className="simulation-card-content">
          <h3>{title}</h3>
          {modeLabel ? (
            <div className="simulation-card-badge">{modeLabel}</div>
          ) : null}
          {statusLabel ? (
            <div className="simulation-card-badge">{statusLabel}</div>
          ) : null}
          <p>{description}</p>
          <div className="simulation-preview">{renderPreview()}</div>
          <div className="launch-button">Launch</div>
        </div>
      </a>
    );
  }

  return (
    <Link to={path} className="simulation-card">
      <div className="simulation-card-content">
        <h3>{title}</h3>
        {modeLabel ? (
          <div className="simulation-card-badge">{modeLabel}</div>
        ) : null}
        {statusLabel ? (
          <div className="simulation-card-badge">{statusLabel}</div>
        ) : null}
        <p>{description}</p>
        <div className="simulation-preview">{renderPreview()}</div>
        <div className="launch-button">Launch</div>
      </div>
    </Link>
  );
};

export default SimulationCard;
