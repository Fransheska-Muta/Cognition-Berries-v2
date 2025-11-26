import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPages.css';
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  // RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

const LoginPage = () => {
  const auth = getAuth();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  const handleChange = e => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // ✅ Email + Password Login
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    // Strong email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(credentials.email)) {
      alert("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {

      // const ReCapture_Site_Key = import.meta.env.ReCapture_Site_Key

      // // ✅ Step 1: Generate reCAPTCHA token
      // const token = await grecaptcha.enterprise.execute(
      //   ReCapture_Site_Key,
      //   { action: "LOGIN" }
      // );

      // ✅ Step 2: Send token to your backend for verification
      // const verifyRes = await fetch(
      //   (import.meta.env.VITE_BASE_API || window.location.origin) + "/verify-recaptcha",
      //   {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({ token }),
      //   }
      // );
      // const verifyData = await verifyRes.json();

      // if (!verifyData.success || verifyData.score < 0.5) {
      //   alert("Suspicious activity detected. Please try again.");
      //   setLoading(false);
      //   return;
      // }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const idToken = await userCredential.user.getIdToken();

      localStorage.setItem("authToken", idToken);
      localStorage.setItem("user", JSON.stringify({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: userCredential.user.displayName || credentials.email
      }));

      alert(`Welcome back, ${credentials.email}!`);
      navigate("/home");

    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed. Please try again.";
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email address.";
          break;
        case 'auth/wrong-password':
          errorMessage = "Invalid password.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address.";
          break;
        case 'auth/user-disabled':
          errorMessage = "This account has been disabled.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed login attempts. Please try again later.";
          break;
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Google Login
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();

      // Store locally (optional)
      localStorage.setItem("authToken", idToken);
      localStorage.setItem("user", JSON.stringify({
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email,
      }));

      // Register user in backend with Authorization header
      const response = await fetch(
        `${import.meta.env.VITE_BASE_API || "http://localhost:3000"}/users`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email,
          }),
        }
      );

      if (!response.ok) {
        console.error("Backend registration failed:", await response.text());
        throw new Error("User registration failed");
      }

      alert(`Welcome, ${user.displayName || user.email}!`);
      navigate("/home");
    } catch (error) {
      console.error("Google Sign-in Error:", error);
      alert("Google Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };


  // ✅ Phone Login (OTP)
  const sendOtp = async () => {
    try {
      // window.recaptchaVerifier = new RecaptchaVerifier("recaptcha-container", {
      //   size: "invisible"
      // }, auth);

      const confirmationResult = await signInWithPhoneNumber(auth, phone);
      setConfirmation(confirmationResult);
      alert("OTP sent to your phone!");
    } catch (error) {
      console.error("Error sending OTP:", error);
      alert("Failed to send OTP. Please check your phone number format (+27...).");
    }
  };

  const verifyOtp = async () => {
    try {
      const result = await confirmation.confirm(otp);
      const user = result.user;
      alert(`Welcome back, ${user.phoneNumber}!`);
      navigate("/home");
    } catch (error) {
      alert("Invalid OTP. Please try again.");
    }
  };

  // Background images
  const bgImages = [
     '/Ancient-Torii-Gate-Amidst-Greenery.png',
  '/SereneCountrysideLandscape.png',
  '/Vintage-Compass-on-Map.png'
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
          <h1>Log In</h1>
          <p>Welcome back! Let’s continue learning.</p>
          <br />

          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              placeholder="Email address"
              value={credentials.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <button type="button" onClick={handleGoogleSignIn} className="google-btn">
              Continue with Google
            </button>
          </form>
          <p>Prefer to use your phone? <a href="/phone-login">Sign in with phone number</a></p>
          <p style={{ marginTop: '15px' }}>Don't have an account? <a href="/signup">Sign up</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
