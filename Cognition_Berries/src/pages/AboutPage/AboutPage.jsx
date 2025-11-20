import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import aboutContent from './aboutContent.json';
import styles from './AboutPage.module.css';

/**
 * AboutPage Component
 * Production-ready About page for Cognition Berries
 * Features: Full accessibility, SEO optimization, responsive design, performance optimization
 */

function AboutUs() {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [counters, setCounters] = useState({
    learners: 0,
    courses: 0,
    savings: 0,
  });

  // Animate counters on mount
  useEffect(() => {
    const animateCounters = () => {
      const duration = 2000;
      const start = Date.now();

      const updateCounters = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);

        setCounters({
          learners: Math.floor(aboutContent.impact.learners * progress),
          courses: Math.floor(aboutContent.impact.coursesCompleted * progress),
          savings: Math.floor(aboutContent.impact.avgSavingsPercent * progress),
        });

        if (progress < 1) requestAnimationFrame(updateCounters);
      };

      requestAnimationFrame(updateCounters);
    };

    animateCounters();
  }, []);

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <>
      <Navbar />
      
      {/* Skip to main content link (accessibility) */}
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      <main id="main-content" className={styles.container}>
        {/* ============ HERO SECTION ============ */}
        <section className={styles.hero} aria-label="Hero section">
          <div className={styles.heroContent}>
            <div className={styles.heroBg}>
              {/* Decorative SVG berries */}
              <svg
                className={styles.berrySvg}
                viewBox="0 0 400 400"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden="true"
              >
                {/* Berry 1 */}
                <circle cx="80" cy="100" r="25" fill="#9d1d4f" opacity="0.6" />
                <circle cx="95" cy="95" r="18" fill="#c42d6a" opacity="0.8" />
                <path d="M 90 70 Q 92 60 85 55" stroke="#6b3a4f" strokeWidth="2" fill="none" />

                {/* Berry 2 */}
                <circle cx="320" cy="150" r="30" fill="#f59e0b" opacity="0.5" />
                <circle cx="305" cy="165" r="22" fill="#fbbf24" opacity="0.7" />

                {/* Berry 3 */}
                <circle cx="150" cy="320" r="28" fill="#06b6d4" opacity="0.4" />
                <circle cx="165" cy="310" r="20" fill="#22d3ee" opacity="0.6" />
              </svg>
            </div>

            <div className={styles.heroText}>
              <h1 className={styles.heroHeadline}>{aboutContent.hero.headline}</h1>
              <p className={styles.heroSubheadline}>
                {aboutContent.hero.subheadline}
              </p>

              <div className={styles.heroCtas}>
                <Link to={aboutContent.hero.ctaPrimaryUrl}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={() =>
                      console.log('CTA: Start Free Lesson clicked')
                    }
                  >
                    {aboutContent.hero.ctaPrimaryText}
                  </button>
                </Link>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => {
                    document
                      .getElementById('our-story')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  aria-label={aboutContent.hero.ctaSecondaryText}
                >
                  {aboutContent.hero.ctaSecondaryText}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============ OUR STORY ============ */}
        <section
          id="our-story"
          className={styles.storySection}
          aria-labelledby="story-heading"
        >
          <div className={styles.storyContent}>
            <h2 id="story-heading" className={styles.sectionHeading}>
              Our Story
            </h2>
            <p className={styles.storyText}>{aboutContent.story.full}</p>

            {/* Timeline */}
            <div className={styles.timeline} role="group" aria-label="Our journey timeline">
              {aboutContent.story.timeline.map((milestone, index) => (
                <div key={index} className={styles.timelineItem}>
                  <div className={styles.timelineMarker} aria-hidden="true">
                    {milestone.year}
                  </div>
                  <div className={styles.timelineContent}>
                    <h3>{milestone.event}</h3>
                    <p>{milestone.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pull Quote */}
            <blockquote className={styles.pullQuote}>
              <p>
                "{aboutContent.story.founderQuote}"
              </p>
              <footer>— {aboutContent.story.founderName}</footer>
            </blockquote>
          </div>
        </section>

        {/* ============ MISSION, VISION, VALUES ============ */}
        <section
          className={styles.mvvSection}
          aria-labelledby="mission-heading"
        >
          <div className={styles.mvvContainer}>
            <h2 id="mission-heading" className={styles.sectionHeading}>
              Mission, Vision & Values
            </h2>

            <div className={styles.mvvCards}>
              {/* Mission */}
              <article className={styles.mvvCard}>
                <div className={styles.mvvIcon} aria-hidden="true">
                  🎯
                </div>
                <h3>{aboutContent.mission.title}</h3>
                <p>{aboutContent.mission.text}</p>
              </article>

              {/* Vision */}
              <article className={styles.mvvCard}>
                <div className={styles.mvvIcon} aria-hidden="true">
                  🌍
                </div>
                <h3>{aboutContent.vision.title}</h3>
                <p>{aboutContent.vision.text}</p>
              </article>

              {/* Values */}
              <article className={styles.mvvCard}>
                <div className={styles.mvvIcon} aria-hidden="true">
                  ❤️
                </div>
                <h3>{aboutContent.values[0].title}</h3>
                <p>{aboutContent.values[0].text}</p>
              </article>
            </div>
          </div>
        </section>

        {/* ============ HOW WE TEACH ============ */}
        <section
          className={styles.methodologySection}
          aria-labelledby="methodology-heading"
        >
          <div className={styles.methodologyContainer}>
            <h2 id="methodology-heading" className={styles.sectionHeading}>
              Our Teaching Approach
            </h2>
            <p className={styles.methodologyIntro}>
              Five principles that make learning stick:
            </p>

            <div className={styles.methodologyGrid}>
              {aboutContent.methodology.map((method, index) => (
                <article key={index} className={styles.methodCard}>
                  <div className={styles.methodIcon} aria-hidden="true">
                    {['📚', '👥', '✏️', '🎯', '🤝'][index]}
                  </div>
                  <h3>{method.title}</h3>
                  <p>{method.text}</p>
                </article>
              ))}
            </div>

            <div className={styles.methodCta}>
              <Link to="/courses">
                <button className={`${styles.btn} ${styles.btnPrimary}`}>
                  See a sample lesson
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ============ IMPACT & PROOF ============ */}
        <section
          className={styles.impactSection}
          aria-labelledby="impact-heading"
        >
          <div className={styles.impactContainer}>
            <h2 id="impact-heading" className={styles.sectionHeading}>
              Our Impact
            </h2>

            {/* Counters */}
            <div className={styles.counters}>
              <div className={styles.counterCard}>
                <div className={styles.counterNumber}>{counters.learners}+</div>
                <div className={styles.counterLabel}>
                  {aboutContent.impact.learnerLabel}
                </div>
              </div>
              <div className={styles.counterCard}>
                <div className={styles.counterNumber}>{counters.courses}+</div>
                <div className={styles.counterLabel}>
                  {aboutContent.impact.coursesLabel}
                </div>
              </div>
              <div className={styles.counterCard}>
                <div className={styles.counterNumber}>{counters.savings}%</div>
                <div className={styles.counterLabel}>
                  {aboutContent.impact.savingsLabel}
                </div>
              </div>
            </div>

            {/* Testimonials */}
            <div className={styles.testimonials}>
              <h3 className={styles.testimonialHeading}>What Our Learners Say</h3>
              <div className={styles.testimonialGrid}>
                {aboutContent.testimonials.map((testimonial, index) => (
                  <article
                    key={index}
                    className={styles.testimonialCard}
                    role="figure"
                    aria-label={`Testimonial from ${testimonial.name}`}
                  >
                    <img
                      src={testimonial.photoUrl}
                      alt={testimonial.alt}
                      className={styles.testimonialPhoto}
                      loading="lazy"
                    />
                    <p className={styles.testimonialQuote}>
                      "{testimonial.quote}"
                    </p>
                    <footer className={styles.testimonialAuthor}>
                      {testimonial.name}
                    </footer>
                  </article>
                ))}
              </div>
            </div>

            {/* Case Study */}
            {aboutContent.caseStudy && (
              <div className={styles.caseStudy}>
                <h3>Success Story</h3>
                <p className={styles.caseStudyText}>
                  {aboutContent.caseStudy.story}
                </p>
                <p className={styles.caseStudyOutcome}>
                  <strong>Result:</strong> {aboutContent.caseStudy.outcome}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ============ TEAM ============ */}
        <section className={styles.teamSection} aria-labelledby="team-heading">
          <div className={styles.teamContainer}>
            <h2 id="team-heading" className={styles.sectionHeading}>
              Meet Our Team
            </h2>
            <p className={styles.teamIntro}>
              Passionate educators, finance experts, and dreamers.
            </p>

            <div className={styles.teamGrid}>
              {aboutContent.team.map((member, index) => (
                <article key={index} className={styles.teamCard}>
                  <img
                    src={member.photoUrl}
                    alt={`${member.name}, ${member.role}`}
                    className={styles.teamPhoto}
                    loading="lazy"
                  />
                  <h3>{member.name}</h3>
                  <p className={styles.teamRole}>{member.role}</p>
                  <p className={styles.teamBio}>{member.bio}</p>
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${member.name} on LinkedIn`}
                      className={styles.linkedinLink}
                    >
                      LinkedIn
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ FAQ ============ */}
        <section className={styles.faqSection} aria-labelledby="faq-heading">
          <div className={styles.faqContainer}>
            <h2 id="faq-heading" className={styles.sectionHeading}>
              Frequently Asked Questions
            </h2>

            <div className={styles.faqList} role="region" aria-label="FAQ">
              {aboutContent.faqs.map((faq, index) => (
                <details
                  key={index}
                  className={styles.faqItem}
                  open={expandedFaq === index}
                  onToggle={() => toggleFaq(index)}
                >
                  <summary className={styles.faqQuestion}>
                    {faq.q}
                    <span
                      className={styles.faqIcon}
                      aria-hidden="true"
                    >
                      ⌄
                    </span>
                  </summary>
                  <div className={styles.faqAnswer}>{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ============ HOW YOU CAN HELP ============ */}
        <section
          className={styles.helpSection}
          aria-labelledby="help-heading"
        >
          <div className={styles.helpContainer}>
            <h2 id="help-heading" className={styles.sectionHeading}>
              Join Our Mission
            </h2>
            <p className={styles.helpIntro}>
              There are many ways to be part of Cognition Berries. Whether you're
              ready to learn or to give back, we'd love to have you.
            </p>

            <div className={styles.helpCtas}>
              <Link to="/courses">
                <button className={`${styles.btn} ${styles.btnPrimary}`}>
                  Start Learning Today
                </button>
              </Link>
              <a href="mailto:contact@cognitionberries.com">
                <button className={`${styles.btn} ${styles.btnSecondary}`}>
                  Become a Coach
                </button>
              </a>
              <a href="mailto:donate@cognitionberries.com">
                <button className={`${styles.btn} ${styles.btnSecondary}`}>
                  Support Our Mission
                </button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default AboutUs;
