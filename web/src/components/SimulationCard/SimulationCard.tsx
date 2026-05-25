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
            <div className="spider-column spider-column-tall">
              <div className="spider-card spider-card-back"></div>
              <div className="spider-card spider-card-back"></div>
              <div className="spider-card spider-card-face">K</div>
            </div>
            <div className="spider-column">
              <div className="spider-card spider-card-back"></div>
              <div className="spider-card spider-card-face">9</div>
            </div>
            <div className="spider-column spider-column-tall">
              <div className="spider-card spider-card-back"></div>
              <div className="spider-card spider-card-back"></div>
              <div className="spider-card spider-card-back"></div>
              <div className="spider-card spider-card-face">Q</div>
            </div>
            <div className="spider-column">
              <div className="spider-card spider-card-back"></div>
              <div className="spider-card spider-card-face">7</div>
            </div>
            <div className="spider-stock">
              <div className="spider-card spider-card-back"></div>
              <div className="spider-card spider-card-back"></div>
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
      case "placeholder":
      default:
        return <div className="placeholder">🔬</div>;
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
