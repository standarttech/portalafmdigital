

## Plan

### 1. Restyle sidebar module buttons (AFM Internal, AdminScale Pro, CRM)

Current buttons use violet/amber/emerald gradients that look generic. Restyle them to match the platform's gold/dark premium aesthetic:
- Use subtle dark backgrounds with gold accent borders and text
- Differentiate modules with icon color accents but keep unified premium feel
- More refined, less "neon" — match the sidebar's dark navy/charcoal style

### 2. Build full marketing website at `/` route

Create a multi-page public-facing website for AFM Digital, accessible at the root `/` path. Content sourced from afmdigital.com. Pages:

**Structure (all public, no auth required):**
- `/` — Landing/Home page
- `/about` — About us / founders
- `/services` — Services (E-commerce, Info Products, Local Business)
- `/case-studies` — Case studies with results
- `/contact` — Contact form + application to work with AFM

**Home page sections:**
- Hero: "Welcome to the New Era of Paid Advertising" with bold headline, CTA button
- Stats bar: $42M+ revenue, $12M+ ad spend, 80+ projects
- Platform partners (Meta, Google, TikTok) with benefits (no bans, no limits, etc.)
- Industry verticals (Coaches, E-com, Local Business)
- Case studies preview (Lapin Group, Kelner Homes, Hyper Cyber, etc.)
- Founders message (Denis Ishimov & Danil Yussupov)
- CTA: "Book a Free Ads Audit"
- Footer with links

**Contact/Application page:**
- Form fields: Name, Email, Company, Website, Monthly ad budget, Message
- Submit stores to a `contact_requests` table in database
- Success confirmation

**Design approach:**
- Dark theme matching platform aesthetic (dark bg, gold accents)
- Premium typography with Inter font
- Smooth scroll animations using framer-motion
- Full-width sections with dramatic spacing
- Responsive for all devices
- Navigation bar with logo + links + "Client Portal" button (links to `/auth`)

### 3. SEO configuration

- Update `index.html` meta tags: title, description, keywords, OG tags for the public site
- Add `robots.txt` with proper sitemap reference
- Add structured data (JSON-LD) for Organization schema
- Add semantic HTML (h1/h2/h3 hierarchy, proper alt texts, meta descriptions per route)
- Use `react-helmet` pattern or update `index.html` directly for core meta

### 4. Routing changes

Update `App.tsx`:
- Add public website routes (`/`, `/about`, `/services`, `/case-studies`, `/contact`) BEFORE auth check
- Keep `/auth` as portal login entry point
- Authenticated users who visit `/` get redirected to `/dashboard` (or show website with "Go to Dashboard" button)
- The public site has its own layout (no sidebar)

### 5. Database migration

Create `contact_requests` table:
- `id`, `name`, `email`, `company`, `website`, `budget`, `message`, `created_at`
- No RLS needed (public insert, admin-only read)

### Files to create:
- `src/pages/website/WebsiteLayout.tsx` — public site layout with nav + footer
- `src/pages/website/HomePage.tsx` — main landing page
- `src/pages/website/AboutPage.tsx` — about/founders
- `src/pages/website/ServicesPage.tsx` — services breakdown
- `src/pages/website/CaseStudiesPage.tsx` — case studies
- `src/pages/website/ContactPage.tsx` — contact/application form

### Files to modify:
- `src/App.tsx` — add public routes
- `src/components/layout/AppSidebar.tsx` — restyle module buttons
- `index.html` — SEO meta tags
- `public/robots.txt` — SEO sitemap

