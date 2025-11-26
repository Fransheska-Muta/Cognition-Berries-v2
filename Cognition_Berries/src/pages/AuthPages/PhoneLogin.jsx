import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../utils/firebase";
import './AuthPages.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

export default function PhoneLogin() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // Initialize reCAPTCHA verifier
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          'size': 'normal', // Changed from 'invisible' to 'normal'
          'callback': (response) => {
            // reCAPTCHA solved
            console.log("reCAPTCHA verified");
          },
          'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
            setError("reCAPTCHA expired. Please try again.");
            // Clear and reinitialize
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear();
              window.recaptchaVerifier = null;
            }
          }
        }
      );
    }
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      setError("Phone number must include country code (e.g., +27712345678)");
      setLoading(false);
      return;
    }

    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        appVerifier
      );
      
      setConfirmation(confirmationResult);
      setError("");
      alert("OTP sent successfully! Check your phone.");
    } catch (err) {
      console.error("Error sending OTP:", err);
      setError(`Error: ${err.message}`);
      
      // Reset reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await confirmation.confirm(otp);
      console.log("User signed in:", result.user);
      
      // Store user data if needed
      // const token = await result.user.getIdToken();
      // localStorage.setItem('authToken', token);
      
      // Navigate to home page
      navigate('/home');
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setError("Invalid OTP. Please try again.");
      setLoading(false);
    }
  };

  const bgImages = [
    '../../../public/Ancient-Torii-Gate-Amidst-Greenery.png',
    '../../../public/SereneCountrysideLandscape.png',
    '../../../public/Vintage-Compass-on-Map.png'
  ];

  return (
    <div className="auth-split">
      <div className="left-pane">
        <div className="swipper-block">
          <Swiper
            modules={[EffectFade, Autoplay]}
            effect="fade"
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            loop
            style={{ height: '100%' }}
          >
            {bgImages.map((img, idx) => (
              <SwiperSlide key={idx}>
                <div
                  style={{
                    backgroundImage: `url(${img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1
                  }}
                >
                  <h4 className='authText'>Cognition Berries</h4>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          <div style={{
            position: 'relative',
            zIndex: 2,
            color: '#fff',
            textAlign: 'center',
            top: '40%',
            width: '100%'
          }}>
            <h4>Cognition Berries</h4>
          </div>
        </div>
      </div>
      
      <div className="right-pane">
        <div className="auth-content">
          <h1>Phone Login</h1>
          <p>Sign in with your phone number</p>
          <br />
          
          {error && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              backgroundColor: '#fee',
              color: '#c33',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}
          
          <div className="auth-form">
            {!confirmation ? (
              <>
                <input
                  type="tel"
                  placeholder="+27 71 234 5678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  disabled={loading}
                />
                <button onClick={sendOtp} disabled={loading}>
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
                  Enter phone number with country code (e.g., +27...)
                </p>
                {error.includes('too-many-requests') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.recaptchaVerifier) {
                        window.recaptchaVerifier.clear();
                        window.recaptchaVerifier = null;
                      }
                      setError("");
                      window.location.reload();
                    }}
                    style={{
                      marginTop: '10px',
                      background: '#f59e0b',
                      color: 'white',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Reset & Try Again
                  </button>
                )}
              </>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={6}
                />
                <button onClick={verifyOtp} disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  onClick={() => {
                    setConfirmation(null);
                    setOtp("");
                    setError("");
                  }}
                  style={{
                    marginTop: '10px',
                    background: 'transparent',
                    color: '#666',
                    border: '1px solid #ddd'
                  }}
                >
                  Change Phone Number
                </button>
              </>
            )}
          </div>
          
          {/* reCAPTCHA container - required for verification */}
          <div id="recaptcha-container"></div>
          
          <p style={{ marginTop: '20px' }}>
            <a href="/login">Login with email instead</a>
          </p>
        </div>
      </div>
    </div>
  );
}