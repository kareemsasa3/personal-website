import AppBackground from "../../components/AppBackground/AppBackground";
import RhythmLabGame from "../../components/RhythmLab";
import "./RhythmLab.css";

const RhythmLab = () => {
  return (
    <div className="rhythm-lab-page">
      <AppBackground />
      <RhythmLabGame />
    </div>
  );
};

export default RhythmLab;
