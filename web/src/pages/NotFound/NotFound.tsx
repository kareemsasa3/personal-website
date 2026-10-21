import React from "react";
import { Link } from "react-router-dom";
import "./NotFound.css";

const NotFound: React.FC = () => {
  return (
    <div className="not-found">
      <div className="not-found-content df-error">
        <h1 className="df-readout-xl">404</h1>
        <h2 className="df-heading-2">Page Not Found</h2>
        <p className="df-body">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/" className="home-link df-control df-label">
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
