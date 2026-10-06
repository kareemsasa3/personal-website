import { motion, useScroll } from "framer-motion";
import { useLocation } from "react-router-dom";
import { showsScrollProgress } from "../../data/scrollProgressRoutes";
import "./GlobalScrollProgress.css";

const GlobalScrollProgress = () => {
  const location = useLocation();

  // Get scroll progress for the entire page
  const { scrollYProgress } = useScroll();

  if (!showsScrollProgress(location.pathname)) {
    return null;
  }

  return (
    <motion.div
      className="global-scroll-progress-bar"
      style={{
        scaleX: scrollYProgress,
        transformOrigin: "0%",
      }}
    />
  );
};

export default GlobalScrollProgress;
