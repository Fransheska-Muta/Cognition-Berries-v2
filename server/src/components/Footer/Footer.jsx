import React from "react";
import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaLinkedinIn,
  FaYoutube
} from "react-icons/fa6";
import "./Footer.css";


function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Left Section */}
        <div className="footer-left">
          <h2 className="footer-logo"><img src="./Cog-Berr-Logo.svg" alt="" /></h2>

          <div className="footer-contact">
            <p><strong>Address:</strong></p>
            <p>Level 1, 12 Sample St, Cape Town 8000</p>

            <p><strong>Contact:</strong></p>
            <p>0800 123 456</p>
            <p>
              <a href="mailto:info@cognitionberries.com">
                info@cognitionberries.com
              </a>
            </p>
          </div>

          {/* Social Icons */}
          <div className="footer-social">
            <a href="#"><FaFacebookF /></a>
            <a href="#"><FaInstagram /></a>
            <a href="#"><FaXTwitter /></a>
            <a href="#"><FaLinkedinIn /></a>
            <a href="#"><FaYoutube /></a>
          </div>
        </div>

        {/* Right Section */}
        <div className="footer-links">
          <ul>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/courses">Courses Offered</Link></li>
            <li><Link to="/liveSession">Live Sessions</Link></li>
            <li><Link to="/CommunityForum">Community Forum</Link></li>
            <li><Link to="/blog">Blog Articles</Link></li>
          </ul>
          <ul>
            <li><Link to="/testimonials">Testimonials</Link></li>
            <li><Link to="/pricing">Pricing Plans</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/newsletter">Newsletter Signup</Link></li>
            <li><Link to="/social">Social Media</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Cognition Berries. All rights reserved.</p>
        <div className="footer-policy-links">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/cookies">Cookies Settings</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
