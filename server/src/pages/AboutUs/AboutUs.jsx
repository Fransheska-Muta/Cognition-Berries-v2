import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar/Navbar'
import './AboutUs.css'
import Footer from '../../components/Footer/Footer'

/**
 * AboutUs Component
 * Production-ready About page with semantic HTML, accessibility, animations
 * Features: Skip link, ARIA labels, counter animations, responsive layout
 */
function AboutUs() {
    const [counters, setCounters] = useState({ learners: 0, courses: 0, savings: 0 });

    // Animated counter effect on mount
    useEffect(() => {
        const animateCounters = () => {
            const duration = 2000;
            const start = Date.now();
            const updateCounters = () => {
                const elapsed = Date.now() - start;
                const progress = Math.min(elapsed / duration, 1);
                setCounters({
                    learners: Math.floor(12500 * progress),
                    courses: Math.floor(45000 * progress),
                    savings: Math.floor(35 * progress),
                });
                if (progress < 1) requestAnimationFrame(updateCounters);
            };
            requestAnimationFrame(updateCounters);
        };
        animateCounters();
    }, []);

    return (
        <>
            {/* Skip to main content link for keyboard navigation */}
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>
            
            <Navbar />
            
            <main id="main-content" className="about-us-main">
                <div className="main-block">
                {/* HERO SECTION */}
                <section className="sec-box hero-section" aria-label="Hero section">
                    <div className="in-block blk1-1">
                        <span className="section-label">Empowerment</span>
                        <h1>Our Purpose Matters</h1>
                    </div>
                    <div className="in-block blk1-2">
                        <p>
                            At Cognition Berries, our mission is to empower individuals through
                            financial education, making investing accessible and engaging. We
                            envision a future where everyone, especially young adults, can confidently
                            navigate their financial journeys.
                        </p>
                        <p>
                            We are committed to breaking down barriers to financial literacy by providing
                            resources, tools, and a supportive community for learners at every stage.
                        </p>
                        <div className="abt-btns abt-btns-blk-1">
                            <Link to="/courses">
                                <button aria-label="Learn more about our courses">
                                    Learn
                                </button>
                            </Link>
                            <Link to="/signup">
                                <button aria-label="Join Cognition Berries community">
                                    Join
                                </button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* MISSION & VISION SECTION */}
                <section className="sec-box mvv-section" aria-label="Mission and Vision">
                    <div className="in-block blk2-1">
                        <h2>
                            Empowering the next generation through accessible
                            financial education and resources.
                        </h2>
                        <p>
                            At Cognition Berries, we believe that financial literacy
                            is essential for everyone. Our mission is to provide engaging
                            and impactful learning experiences that equip young adults with
                            the knowledge and skills they need to succeed in their financial
                            journeys.
                        </p>
                        <p>
                            Our team consists of passionate educators, finance professionals, and technologists
                            dedicated to making a difference in the lives of our users.
                        </p>
                    </div>
                    <div className="in-block decorative-block"></div>
                </section>

                {/* VALUES SECTION */}
                <section className="sec-box values-section" aria-label="Our values">
                    <div className="in-block blk3-1">
                        <h2>
                            Empowering the next generation through accessible financial education and resources.
                        </h2>
                        <p>
                            At Cognition Berries, we believe that financial literacy is essential for everyone. Our platform is designed to make learning about finance engaging and accessible.
                        </p>
                        <p>
                            Through interactive courses, real-world simulations, and community support, we help learners build confidence and practical skills for their financial future.
                        </p>
                        <div className="icon-blk">
                            <div className="i-Blocks" role="article">
                                <span className="value-icon">🎯</span>
                                <h3>Our Mission</h3>
                                <p>To provide innovative learning experiences that inspire confidence in financial decision-making.</p>
                            </div>
                            <div className="i-Blocks" role="article">
                                <span className="value-icon">🌟</span>
                                <h3>Our Vision</h3>
                                <p>A world where financial knowledge empowers individuals to achieve their dreams.</p>
                            </div>
                        </div>
                    </div>
                    <div className="in-block decorative-block"></div>
                </section>

                {/* IMPACT SECTION */}
                <section className="sec-box impact-section" aria-label="Our impact and reach">
                    <div className="in-block">
                        <span className="section-label">Impact</span>
                        <h2>Making Financial Education Accessible to Millions</h2>
                        <p>At Cognition Berries, we believe in the potential of youth. Our mission is to equip young individuals with the financial knowledge they need to thrive.</p>
                        <p>
                            Join our growing community and start your journey towards financial independence today.
                        </p>
                        <div className="icon-blk impact-stats">
                            <div className="i-Blocks stat-card" role="group" aria-label="Active learners count">
                                <p className="stat-number">{counters.learners.toLocaleString()}+</p>
                                <p className="stat-label">Active Learners</p>
                            </div>
                            <div className="i-Blocks stat-card" role="group" aria-label="Courses completed count">
                                <p className="stat-number">{counters.courses.toLocaleString()}+</p>
                                <p className="stat-label">Courses Completed</p>
                            </div>
                            <div className="i-Blocks stat-card" role="group" aria-label="Average savings increase">
                                <p className="stat-number">{counters.savings}%</p>
                                <p className="stat-label">Avg Savings Increase</p>
                            </div>
                        </div>
                        <div className="abt-btns abt-btns-blk-2">
                            <Link to="/signup">
                                <button aria-label="Join our community">
                                    Join
                                </button>
                            </Link>
                            <Link to="/courses">
                                <button aria-label="Explore our courses">
                                    Learn {`>`}
                                </button>
                            </Link>
                        </div>
                    </div>
                    <div className="in-block decorative-block"></div>
                </section>
                </div>
            </main>
            
            <Footer />
        </>
    )
}

export default AboutUs
