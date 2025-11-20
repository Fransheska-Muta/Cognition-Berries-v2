import { useState } from "react";
import { 
  // RecaptchaVerifier, 
  signInWithPhoneNumber } from "firebase/auth";
import { auth } from "../../utils/firebase";
import './AuthPages.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';

export default function PhoneLogin() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      //   size: "invisible",
      // });
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmation(confirmationResult);
      alert("OTP sent!");
    } catch (err) {
      alert("Error sending OTP: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await confirmation.confirm(otp);
      alert("Phone number verified!");
      // You may want to redirect or set authToken here
    } catch (err) {
      alert("Invalid OTP");
    } finally {
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
          <form className="auth-form" onSubmit={confirmation ? verifyOtp : sendOtp}>
            {!confirmation && (
              <>
                <input
                  type="tel"
                  placeholder="+27 71 234 5678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
                <button type="submit" disabled={loading}>
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </>
            )}
            {confirmation && (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <button type="submit" disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </>
            )}
          </form>
          {/* <div id="recaptcha-container"></div> */}
          <p>
            <a href="/login">login with email</a>
          </p>
        </div>
      </div>
    </div>
  );
}
