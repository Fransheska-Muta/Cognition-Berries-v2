import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar/Navbar'
import SignupPage from '../AuthPages/SignUp'
import Courses from '../Courses/Courses'
import LoginPage from '../AuthPages/Login'
import './LandingPage.css'
import FeedbackCarousel from '../../components/FeedBackCourosel/FeedbackCarousel'
import Footer from '../../components/Footer/Footer'
import LiveSession from '../LiveSession/LiveSession'


function LandingPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <>
      <Navbar />

      {/* Box 1, Banner 1 of landing Page */}

      <div className="box1">
        <h1>
          Unlock Your Financial Future
          <br />
          with Confidence
        </h1>
        <p>
          Join us at Cognition Berries, where we empower you to master the essentials
          of stock investing and financial literacy. Our engaging courses and supportive
          community are here to guide you every step of the way.
        </p>
        <div className="box-1-buttons">
          <Link to="/courses" className="cta-btn">Start Learning</Link>
          <Link to='/signup' element={<SignupPage />} > Join </Link>
        </div>
      </div>

      {/* Ennding of Banner 1  */}

      {/* Banner 2 of Landing Page */}

      <div className="banner2">
        <div className="img-box">
        </div>
      </div>

      {/* Ending of Banner 2 Landing Page */}

      {/* Section 3 of Lading Page */}

      <section className='features'>
        <p>
          Features
        </p>
        <h1 className='pageTitle' >
          Explore our Comprehensice
          <br />
          Learning Offerings
        </h1>


        <div className="card-block">
          <div className="card">
            <img src="/Learnin2.jpg" alt="" />
            <h3>
              Diverse Learning
              <br />
              Oppotunities Await You
            </h3>
            <p>Unlock your potential with tailored courses designed for all levels.</p>
          </div>
          <div className="card">
            <img src="/Cozy-Workspace-Setup.png" alt="" />
            <h3>
              Join Live Coaching for
              <br />
              Real-Time Guidance</h3>
            <p>Participate in live sessions to enhance your skills.</p>
          </div>
          <div className="card">
            <img src="/Learning.jpg" alt="" />
            <h3>
              Engage with Our Vibrant
              <br />
              Community Forum</h3>
            <p>Connect, share, and learn from fellow learners.</p>
          </div>
        </div>

        <div className="features-btns">
          <Link to='/signup' element={<SignupPage />} >Start </Link>
          <Link to='/live-session' element={<LiveSession />} >Join </Link>
        </div>
      </section>

      {/* Ending of features section */}

      {/* Begginig of User Feedback Section  */}

      <section className="user-feedback">
        {!user ? (
          <div></div>
        ) : (
          <FeedbackCarousel />
        )}
      </section>


      {/* Beging of Banner 3 */}

      <section className="banner3">

      </section>

      {/* Ennding of Banner 3 */}

      {/* Beggining of Footer */}

      <Footer />

      {/* Ending of Footer */}
    </>
  )
}

export default LandingPage
