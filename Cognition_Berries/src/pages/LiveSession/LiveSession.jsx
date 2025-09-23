import { useState, useEffect } from 'react';
import './LiveSession.css';
import { getAuthHeaders } from '../../utils/auth'
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';

export default function LiveSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const Base_API = import.meta.env.VITE_BASE_API  


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

      // Get authentication from localStorage
      const authData = localStorage.getItem('auth');
      if (!authData) {
        throw new Error('Please log in to view sessions');
      }

      const { email, password } = JSON.parse(authData);
      // const credentials = btoa(`${email}:${password}`);

      const response = await fetch(`http://${Base_API}:3000/live-sessions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": getAuthHeaders()
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your credentials.');
        }
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }

      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter sessions based on current time
  const now = currentTime;
  const liveSessions = sessions.filter(session => {
    const startTime = new Date(session.startTime);
    const endTime = new Date(session.endTime);
    return startTime <= now && endTime >= now;
  });

  const upcomingSessions = sessions.filter(session => {
    const startTime = new Date(session.startTime);
    return startTime > now;
  });

  const completedSessions = sessions.filter(session => {
    const endTime = new Date(session.endTime);
    return endTime < now;
  });

  // Time formatting helpers
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeRemaining = (startTime) => {
    const diff = new Date(startTime) - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Starts in ${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `Starts in ${minutes}m`;
    } else {
      return 'Starting soon';
    }
  };

  if (loading) {
    return (
      <div className="sessions-page">
        <div className="loading">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sessions-page">
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchSessions} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="sessions-page">
        <header className="page-header">
          <h1>Upcoming Live Sessions</h1>
          <p>Join our interactive sessions to enhance your financial skills and knowledge.</p>
          <div className="current-time">{currentTime.toLocaleTimeString()}</div>
        </header>

        <section className="sessions-section">
          <h2 className="section-title">Upcoming Live Coaching Sessions</h2>
          <p>Enhance your financial knowledge with our expert coaches and ask your burning questions. Register now!</p>
          <div className="timeline">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="timeline-item">
                <div className="timeline-date">{session.date}</div>
                <div className="session-card">
                  <div className="session-placeholder"></div>
                  <div className="session-content">
                    <h3 className="session-title">{session.title}</h3>
                    <p className="session-description">{session.description}</p>
                    <button className="join-btn">Join Now</button>
                    <button className="more-btn">More</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <Footer/>
      </div>
    </>
  );
}