import React, { useRef, useEffect, useState, useCallback } from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({
  src,
  title,
  onTimeUpdate,
  onVideoComplete,
  onAutoSave,
  currentTime = 0,
  duration = 0,
  autoCompleteThreshold = 0.9,
  autoSaveInterval = 15000, // 15 seconds
  isReadOnly = false
}) => {
  const videoRef = useRef(null);
  const progressTimerRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(0);

  // Initialize video with saved position
  useEffect(() => {
    if (videoRef.current && currentTime > 0) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Set up progress tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;
      
      // Update progress every second
      if (onTimeUpdate) {
        onTimeUpdate(currentTime, duration);
      }

      // Check for auto-completion
      if (duration > 0 && currentTime / duration >= autoCompleteThreshold) {
        if (onVideoComplete) {
          onVideoComplete();
        }
      }

      // Update buffered progress
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(0) / duration);
      }
    };

    const handleLoadedMetadata = () => {
      if (currentTime > 0) {
        video.currentTime = currentTime;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [currentTime, autoCompleteThreshold, onTimeUpdate, onVideoComplete]);

  // Set up auto-save
  useEffect(() => {
    if (isReadOnly) return;

    const setupAutoSave = () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setInterval(() => {
        const video = videoRef.current;
        if (video && onAutoSave && Math.abs(video.currentTime - lastSavedTime) > 5) {
          onAutoSave(video.currentTime, video.duration);
          setLastSavedTime(video.currentTime);
        }
      }, autoSaveInterval);
    };

    setupAutoSave();

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveInterval, onAutoSave, lastSavedTime, isReadOnly]);

  // Handle controls visibility
  useEffect(() => {
    let hideTimeout;
    
    if (isPlaying) {
      hideTimeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [isPlaying, showControls]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    setShowControls(true);
  }, []);

  const handleSeek = useCallback((e) => {
    if (isReadOnly) return;
    
    const video = videoRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * video.duration;
    
    video.currentTime = seekTime;
    setShowControls(true);
  }, [isReadOnly]);

  const handleVolumeChange = useCallback((e) => {
    const video = videoRef.current;
    const newVolume = parseFloat(e.target.value);
    
    video.volume = newVolume;
    setVolume(newVolume);
    setShowControls(true);
  }, []);

  const handlePlaybackRateChange = useCallback((rate) => {
    const video = videoRef.current;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowControls(true);
  }, []);

  const handleFullscreen = useCallback(() => {
    const video = videoRef.current;
    
    if (!document.fullscreenElement) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.mozRequestFullScreen) {
        video.mozRequestFullScreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      }
      setIsFullscreen(false);
    }
    setShowControls(true);
  }, []);

  const handleKeyPress = useCallback((e) => {
    const video = videoRef.current;
    if (!video) return;

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        handlePlayPause();
        break;
      case 'f':
        e.preventDefault();
        handleFullscreen();
        break;
      case 'm':
        e.preventDefault();
        setVolume(volume === 0 ? 1 : 0);
        video.volume = volume === 0 ? 1 : 0;
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime += 10;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime -= 10;
        break;
      default:
        break;
    }
    setShowControls(true);
  }, [handlePlayPause, handleFullscreen, volume]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercent = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return 0;
    return (video.currentTime / video.duration) * 100;
  };

  const getBufferedPercent = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return 0;
    return buffered * 100;
  };

  return (
    <div 
      className={`video-player-container ${isFullscreen ? 'fullscreen' : ''}`}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) {
          setTimeout(() => setShowControls(false), 2000);
        }
      }}
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      <div className="video-wrapper">
        <video
          ref={videoRef}
          className="video-element"
          src={src}
          onClick={handlePlayPause}
          onDoubleClick={handleFullscreen}
          playsInline
        />
        
        {/* Custom Controls */}
        <div className={`video-controls ${showControls ? 'visible' : 'hidden'}`}>
          {/* Progress Bar */}
          <div className="progress-container" onClick={handleSeek}>
            <div 
              className="progress-buffered" 
              style={{ width: `${getBufferedPercent()}%` }}
            />
            <div 
              className="progress-played" 
              style={{ width: `${getProgressPercent()}%` }}
            />
            <div 
              className="progress-thumb"
              style={{ left: `${getProgressPercent()}%` }}
            />
          </div>

          {/* Control Buttons */}
          <div className="controls-bottom">
            <div className="controls-left">
              <button 
                className="control-btn play-pause"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              
              <div className="time-display">
                <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
                <span> / </span>
                <span>{formatTime(videoRef.current?.duration || 0)}</span>
              </div>

              <div className="volume-control">
                <button 
                  className="control-btn volume-btn"
                  onClick={() => {
                    const newVolume = volume === 0 ? 1 : 0;
                    setVolume(newVolume);
                    if (videoRef.current) {
                      videoRef.current.volume = newVolume;
                    }
                  }}
                  aria-label={volume === 0 ? 'Unmute' : 'Mute'}
                >
                  {volume === 0 ? '🔇' : volume < 0.5 ? '🔈' : '🔊'}
                </button>
                <input
                  type="range"
                  className="volume-slider"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                />
              </div>
            </div>

            <div className="controls-right">
              <div className="playback-rate">
                <select
                  value={playbackRate}
                  onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                  className="rate-select"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>

              <button 
                className="control-btn fullscreen-btn"
                onClick={handleFullscreen}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? '⤵️' : '⤴️'}
              </button>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {!videoRef.current?.readyState && (
          <div className="video-loading">
            <div className="loading-spinner"></div>
            <span>Loading video...</span>
          </div>
        )}

        {/* Play/Pause Overlay */}
        {!isPlaying && videoRef.current?.readyState > 0 && (
          <div className="play-overlay" onClick={handlePlayPause}>
            <button className="big-play-btn" aria-label="Play">
              ▶️
            </button>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="video-info">
        <h3 className="video-title">{title}</h3>
        <div className="video-stats">
          <span className="watch-progress">
            Watch progress: {Math.round(getProgressPercent())}%
          </span>
          {getProgressPercent() >= autoCompleteThreshold * 100 && (
            <span className="completion-badge">Ready to complete</span>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      {showControls && (
        <div className="shortcuts-help">
          <div className="shortcut-item">
            <kbd>Space</kbd>
            <span>Play/Pause</span>
          </div>
          <div className="shortcut-item">
            <kbd>F</kbd>
            <span>Fullscreen</span>
          </div>
          <div className="shortcut-item">
            <kbd>M</kbd>
            <span>Mute</span>
          </div>
          <div className="shortcut-item">
            <kbd>←/→</kbd>
            <span>Seek 10s</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;