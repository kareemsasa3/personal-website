import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/** Redirect legacy /games/* URLs to /simulations/* preserving subpaths. */
const GamesRedirect: React.FC = () => {
  const location = useLocation();
  const newPath = location.pathname.replace(/^\/games/, "/simulations");
  return React.createElement(Navigate, { to: newPath, replace: true });
};

export default GamesRedirect;
