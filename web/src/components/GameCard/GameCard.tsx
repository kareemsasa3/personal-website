import { Link } from "react-router-dom";
import { GameData } from "../../data/gamesData";
import "./GameCard.css";

interface GameCardProps extends GameData {
  isComingSoon?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({
  title,
  description,
  path,
  previewType,
  modeLabel,
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
        return <div className="placeholder">🎮</div>;
    }
  };

  if (isComingSoon) {
    return (
      <div className="game-card coming-soon">
        <div className="game-card-content">
          <h3>{title}</h3>
          <p>{description}</p>
          <div className="game-preview">
            <div className="placeholder">🎮</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link to={path} className="game-card">
      <div className="game-card-content">
        <h3>{title}</h3>
        {modeLabel ? <div className="game-card-badge">{modeLabel}</div> : null}
        <p>{description}</p>
        <div className="game-preview">{renderPreview()}</div>
        <div className="play-button">Play Now</div>
      </div>
    </Link>
  );
};

export default GameCard;
