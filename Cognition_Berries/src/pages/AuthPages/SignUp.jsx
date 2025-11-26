import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPages.css';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  // RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

const SignUpPage = () => {
  const auth = getAuth();
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  // handle input
  const handleChange = e => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // ✅ Email + Password Signup
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    // ✅ Strong Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(credentials.email)) {
      alert("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {

      const ReCapture_Site_Key = import.meta.env.ReCapture_Site_Key

      // ✅ Step 1: Generate reCAPTCHA token
      // function setUpRecaptcha() {
      //   if (!recaptchaVerifier) {
      //     recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      //       size: "invisible", // You can also use "normal" if you want a visible box
      //       callback: (response) => {
      //         console.log("reCAPTCHA solved:", response);
      //       },
      //     });
      //     recaptchaVerifier.render();
      //   }
      // }

      // ✅ Step 2: Send OTP
      async function sendOtp(phoneNumber) {
        try {
          // setUpRecaptcha();

          const confirmationResult = await signInWithPhoneNumber(
            auth,
            phoneNumber,
            // recaptchaVerifier
          );

          window.confirmationResult = confirmationResult;
          alert("OTP sent successfully!");
        } catch (error) {
          console.error("Error sending OTP:", error);
          alert("Failed to send OTP. Check phone format (+27712345678).");
        }
      }

      async function verifyOtp(otp) {
        try {
          const result = await window.confirmationResult.confirm(otp);
          console.log("User signed in:", result.user);
          alert("Phone number verified!");
        } catch (error) {
          alert("Invalid OTP. Please try again.");
        }
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      if (credentials.name) {
        await updateProfile(userCredential.user, { displayName: credentials.name });
      }

      const idToken = await userCredential.user.getIdToken();
      localStorage.setItem("authToken", idToken);
      localStorage.setItem("user", JSON.stringify({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: credentials.name || userCredential.user.email
      }));

      // ✅ Register user in backend
      await fetch(
        (import.meta.env.VITE_BASE_API || window.location.origin) + '/users',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: credentials.name
          })
        }
      );

      alert(`Welcome to Cognition Berries, ${credentials.name || credentials.email}!`);
      navigate("/home");

    } catch (error) {
      console.error("Sign up error:", error);
      let errorMessage = "Sign up failed. Please try again.";
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "This email is already in use.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Invalid email address.";
          break;
        case 'auth/weak-password':
          errorMessage = "Password should be at least 6 characters.";
          break;
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Google Sign-In
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const idToken = await user.getIdToken();
      localStorage.setItem("authToken", idToken);
      localStorage.setItem("user", JSON.stringify({
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email
      }));

      await fetch(
        (import.meta.env.VITE_BASE_API || window.location.origin) + '/users',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: user.displayName
          })
        }
      );

      alert(`Welcome, ${user.displayName || user.email}!`);
      navigate("/home");
    } catch (error) {
      console.error("Google Sign-in Error:", error);
      alert("Google Sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Phone Authentication (Optional)
  const sendOtp = async () => {
    try {
      // window.recaptchaVerifier = new RecaptchaVerifier("recaptcha-container", {
      //   size: "invisible"
      // }, auth);

      const confirmationResult = await signInWithPhoneNumber(auth, phone);
      setConfirmation(confirmationResult);
      alert("OTP sent!");
    } catch (error) {
      console.error("Error sending OTP:", error);
    }
  };

  const verifyOtp = async () => {
    try {
      const result = await confirmation.confirm(otp);
      const user = result.user;
      alert(`Phone verified: ${user.phoneNumber}`);
      navigate("/home");
    } catch (error) {
      alert("Invalid OTP");
    }
  };

  const bgImages = [
     '/Ancient-Torii-Gate-Amidst-Greenery.png',
  '/SereneCountrysideLandscape.png',
  '/Vintage-Compass-on-Map.png'
  ];

  return (
    <div className="auth-split">
      <div className="left-pane">
        <div className="swipper-block" >
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
          <h1>Sign Up</h1>
          <p>Join Cognition Berries and start learning today!</p>
          <br />
          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={credentials.name}
              onChange={handleChange}
              required
            />
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
              {loading ? "Signing up..." : "Sign Up"}
            </button>
            <button type="button" onClick={handleGoogleSignIn} className="google-btn">
              Continue with Google
            </button>
          </form>
          <p>Prefer to use your phone? <a href="/phone-login">Sign in with phone number</a></p>
          <p>Already have an account? <a href="/login">Log in</a></p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
