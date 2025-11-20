import React, { useState, useEffect } from 'react';
import './ProgressBar.css';

const ProgressBar = ({ 
  percentComplete = 0, 
  showLabel = true, 
  size = 'medium',
  animate = true,
  onHover 
}) => {
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setDisplayPercent(percentComplete);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayPercent(percentComplete);
    }
  }, [percentComplete, animate]);

  const getProgressColor = (percent) => {
    if (percent >= 90) return '#4caf50';
    if (percent >= 70) return '#8bc34a';
    if (percent >= 50) return '#ffc107';
    if (percent >= 30) return '#ff9800';
    return '#f44336';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'progress-bar-small';
      case 'large': return 'progress-bar-large';
      default: return 'progress-bar-medium';
    }
  };

  const formatPercent = (percent) => {
    return `${Math.round(percent)}%`;
  };

  const getStatusText = (percent) => {
    if (percent === 0) return 'Not started';
    if (percent === 100) return 'Completed! 🎉';
    if (percent >= 90) return 'Almost there!';
    if (percent >= 75) return 'Great progress!';
    if (percent >= 50) return 'Halfway done!';
    if (percent >= 25) return 'Making progress';
    return 'Getting started';
  };

  return (
    <div 
      className={`progress-bar-container ${getSizeClass()}`}
      onMouseEnter={onHover}
    >
      {showLabel && (
        <div className="progress-header">
          <div className="progress-percent">
            {formatPercent(displayPercent)}
          </div>
          <div className="progress-status">
            {getStatusText(displayPercent)}
          </div>
        </div>
      )}
      
      <div className="progress-bar-track">
        <div 
          className="progress-bar-fill"
          style={{
            width: `${displayPercent}%`,
            backgroundColor: getProgressColor(displayPercent),
            transition: animate ? 'width 0.8s ease-in-out, background-color 0.8s ease' : 'none'
          }}
        >
          {size === 'large' && displayPercent > 10 && (
            <span className="progress-bar-text">
              {formatPercent(displayPercent)}
            </span>
          )}
        </div>
        
        {/* Progress milestones */}
        {size === 'large' && (
          <div className="progress-milestones">
            {[25, 50, 75, 100].map(milestone => (
              <div
                key={milestone}
                className={`milestone ${displayPercent >= milestone ? 'reached' : ''}`}
                style={{ left: `${milestone}%` }}
              >
                <div className="milestone-marker" />
                <span className="milestone-label">{milestone}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Detailed progress info on hover */}
      {onHover && (
        <div className="progress-tooltip">
          <div className="tooltip-content">
            <strong>{formatPercent(displayPercent)} Complete</strong>
            <p>{getStatusText(displayPercent)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;