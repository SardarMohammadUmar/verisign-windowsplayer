import React from 'react';
import './LoadingScreen.css';

interface LoadingScreenProps {
  progress?: number; // 0-100
  currentItem?: string;
  totalItems?: number;
  currentIndex?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  currentItem,
  totalItems,
  currentIndex,
}) => {
  return (
    <div className="loading-screen">
      <div className="loading-spinner-large"></div>
      <div className="loading-text">Loading media...</div>
      {progress !== undefined && (
        <div className="loading-progress">
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          {currentIndex !== undefined && totalItems !== undefined && (
            <div className="loading-details">
              {currentIndex + 1} of {totalItems} items
            </div>
          )}
          {currentItem && (
            <div className="loading-details">{currentItem}</div>
          )}
        </div>
      )}
    </div>
  );
};
