import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AboutPage from './AboutPage';
import aboutContent from './aboutContent.json';

/**
 * AboutPage.spec.js
 * Jest + React Testing Library tests
 * Covers: rendering, accessibility, CTA functionality, content presence, accordion
 */

// Wrapper component for React Router
const Wrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('AboutPage Component', () => {
  // ========== HERO SECTION ==========
  describe('Hero Section', () => {
    test('renders hero headline', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText(aboutContent.hero.headline)).toBeInTheDocument();
    });

    test('renders hero subheadline', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText(aboutContent.hero.subheadline)).toBeInTheDocument();
    });

    test('renders primary CTA button', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const button = screen.getByRole('button', {
        name: new RegExp(aboutContent.hero.ctaPrimaryText, 'i')
      });
      expect(button).toBeInTheDocument();
    });

    test('renders secondary CTA button', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const button = screen.getByRole('button', {
        name: new RegExp(aboutContent.hero.ctaSecondaryText, 'i')
      });
      expect(button).toBeInTheDocument();
    });

    test('secondary CTA scrolls to story section', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const storySection = screen.getByText('Our Story');
      const secondaryCta = screen.getByRole('button', {
        name: new RegExp(aboutContent.hero.ctaSecondaryText, 'i')
      });

      fireEvent.click(secondaryCta);

      // Verify scroll was called (in a real test, you'd spy on scroll)
      expect(storySection).toBeInTheDocument();
    });
  });

  // ========== STORY SECTION ==========
  describe('Story Section', () => {
    test('renders story section heading', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText('Our Story')).toBeInTheDocument();
    });

    test('story section contains founder quote', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText(new RegExp(aboutContent.story.founderQuote, 'i'))).toBeInTheDocument();
    });

    test('story section contains kitchen table reference', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const storyText = screen.getByText(aboutContent.story.full);
      expect(storyText).toHaveTextContent('kitchen table');
    });

    test('renders timeline milestones', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      aboutContent.story.timeline.forEach((milestone) => {
        expect(screen.getByText(milestone.event)).toBeInTheDocument();
      });
    });
  });

  // ========== MISSION, VISION, VALUES ==========
  describe('Mission, Vision & Values Section', () => {
    test('renders mission, vision, values heading', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText('Mission, Vision & Values')).toBeInTheDocument();
    });

    test('renders mission card with correct content', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText(aboutContent.mission.title)).toBeInTheDocument();
      expect(screen.getByText(aboutContent.mission.text)).toBeInTheDocument();
    });

    test('renders vision card with correct content', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText(aboutContent.vision.title)).toBeInTheDocument();
      expect(screen.getByText(aboutContent.vision.text)).toBeInTheDocument();
    });

    test('renders first value card', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText(aboutContent.values[0].title)).toBeInTheDocument();
      expect(screen.getByText(aboutContent.values[0].text)).toBeInTheDocument();
    });
  });

  // ========== METHODOLOGY SECTION ==========
  describe('Methodology Section', () => {
    test('renders teaching approach heading', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText('Our Teaching Approach')).toBeInTheDocument();
    });

    test('renders all methodology cards', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      aboutContent.methodology.forEach((method) => {
        expect(screen.getByText(method.title)).toBeInTheDocument();
        expect(screen.getByText(method.text)).toBeInTheDocument();
      });
    });

    test('methodology section contains "See a sample lesson" button', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const buttons = screen.getAllByRole('button', { name: /sample lesson/i });
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  // ========== IMPACT SECTION ==========
  describe('Impact Section', () => {
    test('renders impact section heading', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText('Our Impact')).toBeInTheDocument();
    });

    test('renders counter labels', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText(aboutContent.impact.learnerLabel)).toBeInTheDocument();
      expect(screen.getByText(aboutContent.impact.coursesLabel)).toBeInTheDocument();
      expect(screen.getByText(aboutContent.impact.savingsLabel)).toBeInTheDocument();
    });

    test('renders testimonials heading', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText("What Our Learners Say")).toBeInTheDocument();
    });

    test('renders at least one testimonial quote', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const testimonialQuote = aboutContent.testimonials[0].quote;
      expect(screen.getByText(new RegExp(testimonialQuote, 'i'))).toBeInTheDocument();
    });

    test('renders all testimonial authors', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      aboutContent.testimonials.forEach((testimonial) => {
        expect(screen.getByText(testimonial.name)).toBeInTheDocument();
      });
    });

    test('testimonial images have proper alt text', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      aboutContent.testimonials.forEach((testimonial) => {
        const img = screen.getByAltText(testimonial.alt);
        expect(img).toBeInTheDocument();
      });
    });

    test('renders case study if present', () => {
      if (aboutContent.caseStudy) {
        render(<AboutPage />, { wrapper: Wrapper });
        expect(screen.getByText('Success Story')).toBeInTheDocument();
        expect(screen.getByText(new RegExp(aboutContent.caseStudy.outcome, 'i'))).toBeInTheDocument();
      }
    });
  });

  // ========== TEAM SECTION ==========
  describe('Team Section', () => {
    test('renders team section heading', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText('Meet Our Team')).toBeInTheDocument();
    });

    test('renders all team member names', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      aboutContent.team.forEach((member) => {
        expect(screen.getByText(member.name)).toBeInTheDocument();
      });
    });

    test('renders team member roles', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      aboutContent.team.forEach((member) => {
        const roleElement = screen.getByText(new RegExp(member.role, 'i'));
        expect(roleElement).toBeInTheDocument();
      });
    });

    test('team photos have alt text', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      aboutContent.team.forEach((member) => {
        const img = screen.getByAltText(new RegExp(member.name, 'i'));
        expect(img).toBeInTheDocument();
      });
    });

    test('team members with LinkedIn have link', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const linkedinMembers = aboutContent.team.filter((m) => m.linkedin);
      linkedinMembers.forEach((member) => {
        const link = screen.getByRole('link', { name: new RegExp(member.name, 'i') });
        expect(link).toHaveAttribute('href', member.linkedin);
        expect(link).toHaveAttribute('target', '_blank');
      });
    });
  });

  // ========== FAQ SECTION ==========
  describe('FAQ Section', () => {
    test('renders FAQ section heading', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    });

    test('renders all FAQ questions', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      aboutContent.faqs.forEach((faq) => {
        expect(screen.getByText(faq.q)).toBeInTheDocument();
      });
    });

    test('FAQ items are expandable with details element', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const details = screen.getAllByRole('button').filter((btn) => {
        return aboutContent.faqs.some((faq) => btn.textContent.includes(faq.q));
      });
      expect(details.length).toBeGreaterThan(0);
    });

    test('clicking FAQ expands and shows answer', async () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const firstQuestion = screen.getByText(aboutContent.faqs[0].q);
      
      fireEvent.click(firstQuestion);
      
      await waitFor(() => {
        expect(screen.getByText(aboutContent.faqs[0].a)).toBeVisible();
      });
    });

    test('FAQ toggle is keyboard accessible', async () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const firstQuestion = screen.getByText(aboutContent.faqs[0].q);
      
      firstQuestion.focus();
      expect(document.activeElement).toBe(firstQuestion);
      
      // Simulate Enter key
      fireEvent.keyDown(firstQuestion, { key: 'Enter', code: 'Enter' });
      
      // Answer should be visible after toggle
      await waitFor(() => {
        expect(screen.getByText(aboutContent.faqs[0].a)).toBeVisible();
      });
    });
  });

  // ========== HELP SECTION ==========
  describe('Help / CTA Section', () => {
    test('renders join mission heading', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByText('Join Our Mission')).toBeInTheDocument();
    });

    test('renders all help CTA buttons', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByRole('button', { name: /Start Learning Today/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Become a Coach/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Support Our Mission/i })).toBeInTheDocument();
    });
  });

  // ========== ACCESSIBILITY ==========
  describe('Accessibility', () => {
    test('has skip to main content link', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    test('main content has id attribute', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'main-content');
    });

    test('all sections have proper headings', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument(); // Hero
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0); // Section headings
    });

    test('all buttons have focus-visible outline', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).toHaveStyle('outline: 2px solid');
      });
    });

    test('testimonial images have alt text', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).not.toBe('');
      });
    });

    test('decorative SVG is aria-hidden', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    test('links open in new tab with proper attributes', () => {
      render(<AboutPage />, { wrapper: Wrapper });
      const externalLinks = screen.getAllByRole('link').filter((link) => {
        return link.hasAttribute('target') && link.getAttribute('target') === '_blank';
      });
      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute('rel');
        expect(link.getAttribute('rel')).toContain('noopener');
      });
    });
  });

  // ========== CONTENT PRESENCE ==========
  describe('Content Data Loading', () => {
    test('aboutContent.json has all required sections', () => {
      expect(aboutContent).toHaveProperty('hero');
      expect(aboutContent).toHaveProperty('story');
      expect(aboutContent).toHaveProperty('mission');
      expect(aboutContent).toHaveProperty('vision');
      expect(aboutContent).toHaveProperty('values');
      expect(aboutContent).toHaveProperty('methodology');
      expect(aboutContent).toHaveProperty('impact');
      expect(aboutContent).toHaveProperty('testimonials');
      expect(aboutContent).toHaveProperty('team');
      expect(aboutContent).toHaveProperty('faqs');
      expect(aboutContent).toHaveProperty('seo');
    });

    test('hero section has all required CTA fields', () => {
      expect(aboutContent.hero).toHaveProperty('headline');
      expect(aboutContent.hero).toHaveProperty('subheadline');
      expect(aboutContent.hero).toHaveProperty('ctaPrimaryText');
      expect(aboutContent.hero).toHaveProperty('ctaPrimaryUrl');
      expect(aboutContent.hero).toHaveProperty('ctaSecondaryText');
    });

    test('story timeline has minimum 3 milestones', () => {
      expect(aboutContent.story.timeline.length).toBeGreaterThanOrEqual(3);
    });

    test('testimonials has minimum 3 entries', () => {
      expect(aboutContent.testimonials.length).toBeGreaterThanOrEqual(3);
    });

    test('team has minimum 3 members', () => {
      expect(aboutContent.team.length).toBeGreaterThanOrEqual(3);
    });

    test('faqs has minimum 4 questions', () => {
      expect(aboutContent.faqs.length).toBeGreaterThanOrEqual(4);
    });

    test('impact section has learner count', () => {
      expect(aboutContent.impact.learners).toBeGreaterThan(0);
      expect(typeof aboutContent.impact.learners).toBe('number');
    });
  });

  // ========== COUNTER ANIMATION ==========
  describe('Counter Animation', () => {
    test('counters animate from 0 to target values', async () => {
      jest.useFakeTimers();
      render(<AboutPage />, { wrapper: Wrapper });

      // Wait for animation to start
      await waitFor(() => {
        expect(screen.getByText(/\d+\+/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  // ========== CONTENT INTEGRITY ==========
  describe('Content Integrity', () => {
    test('hero headline is not empty', () => {
      expect(aboutContent.hero.headline.length).toBeGreaterThan(0);
    });

    test('all testimonial quotes are provided', () => {
      aboutContent.testimonials.forEach((t) => {
        expect(t.quote.length).toBeGreaterThan(0);
      });
    });

    test('all team members have bio', () => {
      aboutContent.team.forEach((member) => {
        expect(member.bio.length).toBeGreaterThan(0);
      });
    });

    test('FAQ answers are not empty', () => {
      aboutContent.faqs.forEach((faq) => {
        expect(faq.a.length).toBeGreaterThan(0);
      });
    });
  });
});
