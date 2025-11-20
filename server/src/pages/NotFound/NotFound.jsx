import React from "react";
import { Link } from "react-router-dom";
import "./NotFound.css";

export default function NotFound() {
  return (
    <div className="notfound-container">
      <div className="glitch-wrapper">
        <h1 className="glitch" data-text="404">404</h1>
        <p className="glitch-sub" data-text="PAGE NOT FOUND">PAGE NOT FOUND</p>
      </div>
      <Link to="/" className="home-btn">Return Home</Link>
      <div className="scan-line"></div>
    </div>
  );
}
