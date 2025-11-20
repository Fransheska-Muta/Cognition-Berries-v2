# About Page Integration Guide

## Quick Setup

### 1. Import in Router
Add the AboutPage component to your React Router configuration:

```jsx
import AboutPage from './pages/AboutPage/AboutPage';

// In your Routes:
<Route path="/about" element={<AboutPage />} />
```

### 2. Update Navigation
Add link to Navbar component:
```jsx
<Link to="/about">About</Link>
```

### 3. Verify Dependencies
The component requires these packages (already in package.json):
- `react` (18+)
- `react-router-dom` (v6+)

## Component Props

The AboutPage component accepts no required props but can optionally receive callbacks:

```jsx
// No props needed - uses internal state
<AboutPage />

// Optional: Pass handlers for CTAs
<AboutPage 
  onSignup={() => navigate('/signup')}
  onBecomeCoach={() => navigate('/coach-signup')}
/>
```

## Content Management (CMS Integration)

### JSON Structure
Content is stored in `aboutContent.json` with this structure:

```json
{
  "hero": { 
    "headline": "...",
    "subheadline": "...",
    "ctaPrimaryText": "...",
    "ctaPrimaryUrl": "...",
    "ctaSecondaryText": "..."
  },
  "story": {
    "short": "...",
    "full": "...",
    "timeline": [{ "year": "...", "event": "...", "detail": "..." }],
    "founderQuote": "...",
    "founderName": "..."
  },
  "mission": { "title": "...", "text": "..." },
  "vision": { "title": "...", "text": "..." },
  "values": [{ "title": "...", "text": "...", "icon": "..." }],
  "methodology": [{ "title": "...", "text": "..." }],
  "impact": {
    "learners": 12500,
    "coursesCompleted": 45000,
    "avgSavingsPercent": 35,
    "learnerLabel": "Active Learners",
    "coursesLabel": "Courses Completed",
    "savingsLabel": "Avg Savings Increase"
  },
  "testimonials": [{ "name": "...", "quote": "...", "photoUrl": "...", "alt": "..." }],
  "team": [{ "name": "...", "role": "...", "bio": "...", "photoUrl": "...", "linkedin": "..." }],
  "faqs": [{ "q": "...", "a": "..." }],
  "seo": { "title": "...", "description": "...", "keywords": "..." }
}
```

### To Update Content
1. Open `src/pages/AboutPage/aboutContent.json`
2. Modify relevant section following JSON format
3. No component code changes needed - content updates automatically

### Adding New Testimonial
```json
{
  "testimonials": [
    {
      "name": "Jane Doe",
      "quote": "This platform changed my financial journey...",
      "photoUrl": "https://images.unsplash.com/...",
      "alt": "Jane Doe, learner from Lagos"
    }
  ]
}
```

### Adding Team Member
```json
{
  "team": [
    {
      "name": "Sarah Johnson",
      "role": "Head of Partnerships",
      "bio": "10+ years in fintech...",
      "photoUrl": "https://images.unsplash.com/...",
      "linkedin": "https://linkedin.com/in/sarahjohnson"
    }
  ]
}
```

## Localization (i18n)

### Current Support
- English (default)
- South African English (partial)

### Implementation
Add language files to `aboutContent.json`:

```json
{
  "i18n": {
    "south_african_english": {
      "hero": { "headline": "Lessons small, gains big. Eh!", ... },
      "story": { ... }
    }
  }
}
```

### Using with i18next
```jsx
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';

const AboutPage = () => {
  const { i18n } = useTranslation();
  const content = i18n.language === 'af' 
    ? aboutContent.i18n.south_african_english
    : aboutContent;
  // ... render using content
};
```

## SEO Configuration

### 1. Meta Tags
The component imports structured data. Add to your `<head>` in Providers.jsx or index.html:

```html
<title>About — Cognition Berries | Financial lessons for beginners</title>
<meta name="description" content="Learn how Cognition Berries is making financial education simple, kind, and accessible to 2M+ learners across Africa.">
<meta name="keywords" content="financial education, financial literacy, investing for beginners, money management">

<!-- Open Graph for Social Sharing -->
<meta property="og:title" content="About Cognition Berries">
<meta property="og:description" content="Making financial education simple, kind, and accessible.">
<meta property="og:image" content="https://cognitionberries.com/og-image.png">
```

### 2. JSON-LD Schema
Include `meta.jsonld` in page head:

```jsx
import schema from './meta.jsonld';

useEffect(() => {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.innerHTML = JSON.stringify(schema);
  document.head.appendChild(script);
  
  return () => script.remove();
}, []);
```

## Environment Variables
No special environment variables required. The About page works with default configuration.

## Styling & Theming

### CSS Module Variables
Color palette defined in `AboutPage.module.css`:

```css
--berry-maroon: #9d1d4f;
--berry-teal: #06b6d4;
--berry-orange: #f59e0b;
--cream: #fffbf0;
--dark: #1a1a1a;
```

To customize, override in your app's global CSS:

```css
:root {
  --berry-maroon: #your-maroon;
  --berry-teal: #your-teal;
}
```

## Testing

### Run Tests
```bash
npm test -- AboutPage.spec.js
```

### Test Coverage
- ✅ Hero section rendering and CTAs
- ✅ Content presence and data integrity
- ✅ FAQ accordion keyboard navigation
- ✅ Accessibility (ARIA, skip links, alt text)
- ✅ Counter animations
- ✅ Testimonial loading and display
- ✅ Team member information

## Performance Optimization

### 1. Image Lazy Loading
Images are lazy-loaded by default via `loading="lazy"`:
```jsx
<img src={testimonial.photoUrl} alt={testimonial.alt} loading="lazy" />
```

### 2. CSS Animation Optimization
Animations respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}
```

### 3. SVG Optimization
Berry SVG decorations use CSS animations (no JS):
```jsx
<svg className={styles.berry} aria-hidden="true">...</svg>
```

## Troubleshooting

### Issue: Content not updating
- Clear browser cache (Ctrl+Shift+Delete)
- Restart dev server (`npm run dev`)
- Verify JSON syntax in `aboutContent.json`

### Issue: Styles not applying
- Confirm CSS module import: `import styles from './AboutPage.module.css'`
- Check class name spelling in JSX
- Verify CSS module loader in Vite config

### Issue: Animations not smooth
- Check CPU usage in DevTools Performance tab
- Reduce animation duration if needed
- Enable hardware acceleration: `transform: translateZ(0)`

## File Structure
```
src/pages/AboutPage/
├── AboutPage.jsx                 # Main component (400 lines)
├── AboutPage.module.css          # Styles (900 lines)
├── aboutContent.json             # Content data
├── meta.jsonld                   # SEO structured data
├── AboutPage.spec.js             # Tests (330 lines)
└── DEVELOPER_README.md           # This file
```

## Related Documentation
- [Production Checklist](./PRODUCTION_CHECKLIST.md)
- [Component Specs](./AboutPage.spec.js)

## Support
For questions about integration, styling, or content updates, refer to the inline JSDoc comments in AboutPage.jsx or the test file for usage examples.
