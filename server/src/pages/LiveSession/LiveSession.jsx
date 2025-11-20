// LiveSession.jsx
import { useState, useEffect, useMemo } from 'react';
import './LiveSession.css';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { apiRequest } from "../../config/api";

export default function LiveSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [bookingStates, setBookingStates] = useState({}); // Track booking status per session
  const [bookingLoading, setBookingLoading] = useState({}); // Track loading per session

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch sessions on component mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');

      // Use shared API helper so the request uses the configured base URL
      // and includes auth + automatic token refresh handling.
      const response = await apiRequest('/live-sessions', { method: 'GET' });
      const raw = await response.json();

      // Normalize session objects: ensure a stable `id` field (string).
      const data = (raw || []).map(s => {
        const normalizedId = s.id ?? (s._id ? (typeof s._id === 'object' && s._id.toString ? s._id.toString() : String(s._id)) : undefined);
        return { ...s, id: normalizedId };
      });

      setSessions(data);

      // Initialize booking states based on normalized session ids
      const initialBookingStates = {};
      data.forEach(session => {
        if (session.id) initialBookingStates[session.id] = session.isBooked || false;
      });
      setBookingStates(initialBookingStates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get session ID candidates for booking operations
  const getSessionIdCandidates = (session) => {
    const candidates = [];
    if (typeof session === 'string') {
      candidates.push(session);
      return candidates;
    }
    if (session.id) candidates.push(String(session.id));
    if (session._id) {
      if (typeof session._id === 'object') {
        if (session._id.$oid) candidates.push(String(session._id.$oid));
        else if (session._id.toString) candidates.push(session._id.toString());
      } else {
        candidates.push(String(session._id));
      }
    }
    return candidates;
  };

  const handleBooking = async (sessionOrId) => {
    const candidates = getSessionIdCandidates(sessionOrId);
    const keyForState = typeof sessionOrId === 'string' ? sessionOrId : 
      (sessionOrId.id ?? (sessionOrId._id ? (sessionOrId._id.$oid ?? (sessionOrId._id.toString ? sessionOrId._id.toString() : String(sessionOrId._id))) : sessionOrId.title ?? Math.random().toString(36).slice(2)));

    if (candidates.length === 0) {
      alert('Unable to identify session to book/cancel. Please refresh the page.');
      return;
    }

    setBookingLoading(prev => ({ ...prev, [keyForState]: true }));

    try {
      const isCurrentlyBooked = bookingStates[keyForState];
      const endpoint = isCurrentlyBooked ? 'cancel-booking' : 'book';

      let lastError = null;
      for (const cid of candidates) {
        try {
          const response = await apiRequest(`/live-sessions/${encodeURIComponent(cid)}/${endpoint}`, { method: 'POST' });
          const data = await response.json();

          setBookingStates(prev => ({ ...prev, [keyForState]: !isCurrentlyBooked }));
          const action = isCurrentlyBooked ? 'cancelled' : 'booked';
          alert(`Successfully ${action}! ${isCurrentlyBooked ? '' : 'You will receive a reminder before the session starts.'}`);
          return;
        } catch (err) {
          lastError = err;
          if (String(err).includes('404')) {
            console.warn(`Booking attempt failed for id=${cid} with 404; trying next candidate if available.`);
            continue;
          }
          throw err;
        }
      }
      throw lastError || new Error('Failed to book/cancel session');
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      setBookingLoading(prev => ({ ...prev, [keyForState]: false }));
    }
  };

  // Compute live / upcoming / archived sessions based on current time
  const now = currentTime;

  const { liveSessions, upcomingSessions, archivedSessions, displayedSessions } = useMemo(() => {
    const live = [];
    const upcoming = [];
    const archived = [];

    for (const session of sessions) {
      // If session explicitly marked archived, put it in archived immediately
      if (session.status && String(session.status).toLowerCase() === 'archived') {
        archived.push(session);
        continue;
      }

      const start = session.startTime ? new Date(session.startTime) : null;
      const end = session.endTime ? new Date(session.endTime) : null;

      if (start && end) {
        if (start <= now && now <= end) {
          live.push(session);
        } else if (start > now) {
          upcoming.push(session);
        } else {
          archived.push(session);
        }
      } else if (start) {
        // If there's only a start time treat it as upcoming when in future,
        // treat as live if it started recently (within 2 hours), otherwise archive.
        if (start > now) {
          upcoming.push(session);
        } else {
          const twoHours = 2 * 60 * 60 * 1000;
          if (now - start < twoHours) {
            live.push(session);
          } else {
            archived.push(session);
          }
        }
      } else {
        // No timing info — move to archive by default so it's not shown
        archived.push(session);
      }
    }

    // Sort for predictable UI: live first (by start), then upcoming (soonest first)
    live.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    upcoming.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    const displayed = [...live, ...upcoming];

    return {
      liveSessions: live,
      upcomingSessions: upcoming,
      archivedSessions: archived,
      displayedSessions: displayed
    };
  }, [sessions, currentTime]);

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderBookingButton = (session) => {
    const isBooked = bookingStates[session.id];
    const isLoading = bookingLoading[session.id];
    
    return (
      <button 
        className={`join-btn ${isBooked ? 'booked' : ''}`}
        onClick={() => handleBooking(session.id)}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : (isBooked ? 'Cancel Booking' : 'Book a seat')}
      </button>
    );
  };

  // Remove duplicate handleBooking implementation

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="sessions-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading sessions...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="sessions-page">
          <div className="error-container">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Error</h3>
            <p className="error-message">{error}</p>
            <button onClick={fetchSessions} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="sessions-page">
        {/* Header */}
        <header className="page-header">
          <h1>Live & Upcoming Sessions</h1>
          <p>Join our interactive sessions to enhance your financial skills and knowledge.</p>
          <div className="current-time">{currentTime.toLocaleTimeString()}</div>
        </header>

        {/* Main Content */}
        <div className="sessions-container">
          <div className="sessions-intro">
            <h2 className="section-title">Live & Upcoming Coaching Sessions</h2>
            <p className="section-description">
              Enhance your financial knowledge with our expert coaches and ask your burning questions. Register now!
            </p>
            {archivedSessions && archivedSessions.length > 0 && (
              <p className="archived-note">{archivedSessions.length} archived session{archivedSessions.length > 1 ? 's' : ''} hidden</p>
            )}
          </div>

          {displayedSessions.length === 0 ? (
            <div className="no-sessions">
              <div className="no-sessions-icon">📅</div>
              <h3>No Live or Upcoming Sessions</h3>
              <p>Check back soon for new coaching sessions!</p>
            </div>
          ) : (
            /* Timeline */
            <div className="timeline">
              {/* Vertical line */}
              <div className="timeline-line"></div>

              {/* Timeline items */}
              <div className="timeline-items">
                {displayedSessions.map((session, index) => {
                  const isLeft = index % 2 === 0;
                  // Use a robust key: prefer stable id fields, fall back to index-based key
                  const sessionKey = session.id ?? session._id ?? `${session.title ?? 'session'}-${index}`;
                  
                  return (
                    <div key={sessionKey} className="timeline-item">
                      {/* Timeline dot */}
                      <div className="timeline-dot"></div>
                      
                      {/* Desktop layout */}
                      <div className={`timeline-content ${isLeft ? 'left' : 'right'}`}>
                        <div className="session-image-wrapper">
                          <div className="session-image">
                            {session.imageUrl ? (
                              <img src={session.imageUrl} alt={session.title} />
                            ) : (
                              <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l10 6-10 6-10-6 10-6z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        
                        <div className="session-details">
                          <div className="session-date">
                            {session.date || formatDateTime(session.startTime)}
                          </div>
                          <h3 className="session-title">{session.title}</h3>
                          <p className="session-description">{session.description}</p>
                          {session.instructor && (
                            <p className="session-instructor">
                              <span className="instructor-label">Instructor:</span> {session.instructor}
                            </p>
                          )}
                          <div className="session-buttons">
                            {renderBookingButton(session)}
                            <button className="more-btn">More</button>
                          </div>
                        </div>
                      </div>

                      {/* Mobile layout */}
                      <div className="timeline-mobile">
                        <div className="session-date">
                          {session.date || formatDateTime(session.startTime)}
                        </div>
                        <div className="session-image">
                          {session.imageUrl ? (
                            <img src={session.imageUrl} alt={session.title} />
                          ) : (
                            <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l10 6-10 6-10-6 10-6z" />
                            </svg>
                          )}
                        </div>
                        <h3 className="session-title">{session.title}</h3>
                        <p className="session-description">{session.description}</p>
                        {session.instructor && (
                          <p className="session-instructor">
                            <span className="instructor-label">Instructor:</span> {session.instructor}
                          </p>
                        )}
                        <div className="session-buttons">
                          {renderBookingButton(session)}
                          <button className="more-btn">More</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}