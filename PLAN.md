# Hand-Built RaretifiedRealty Clone

## Summary
Build a hand-coded static recreation of the public ExpertListing core experience in this folder using plain `html`, `css`, and `js`, without copying the site’s implementation code. The source site is only the visual and behavioral reference.

The delivered site will:
- Match the public homepage, listing/search, property-detail, and snagging flows closely in layout, UX, and responsiveness
- Be fully rebranded as `RaretifiedRealty`
- Use the supplied logo’s purple and lavender palette as the theme system
- Run as a clean local multipage static site with reusable assets, styles, and scripts

## Key Changes
### Hand-built design system and branding
- Create a fresh CSS theme with tokens derived from the provided logo:
  - primary purple for brand surfaces and CTAs
  - lavender for accents, chips, highlights, and soft backgrounds
  - neutral white, charcoal, and muted grays for readable content layers
- Recreate the reference site’s visual hierarchy by hand: large search-led hero, rounded cards, soft shadows, layered sections, clean listing grid, and premium property-detail presentation.
- Replace all source branding and copy references to `Expert Listing` with `RaretifiedRealty`, including navigation, CTA labels, footer identity, and metadata.

### Multipage static architecture
- Build separate pages for:
  - `index.html` for the homepage
  - `listings.html` for search/results
  - `property.html` for reusable property-detail rendering by query param or slug
  - `snagging.html` for the inspection service flow
- Keep shared layout and UI in common CSS/JS so the header, footer, filters, cards, and forms behave consistently across pages.
- Use relative links and assets so the project works on a simple local/static server with no framework dependency.

### Local data and frontend behavior
- Define local mock data for listings, locations, categories, featured sections, testimonials if used, FAQs, and snagging packages.
- Implement client-side search/filter/sort/pagination behavior in JS so the experience feels like a real frontend app without backend calls.
- Drive property-detail pages from local data using URL params or slugs so listing cards link into real detail views.
- Recreate visible UI behavior only, hand-built in JS:
  - mobile navigation
  - search and filter drawers
  - tabs, accordions, and FAQ toggles
  - gallery switching on property pages
  - load-more or paginated result states
  - form validation and success states for snagging/contact actions

### Public interfaces and internal contracts
- Use stable local data shapes for:
  - `listing`: id, slug, title, transactionType, category, location, price, specs, gallery, tags, summary, amenities, coordinatesLabel
  - `searchState`: transactionType, location, category, beds, baths, priceRange, sort, exactLocationOnly, page
  - `snaggingPackage`: id, title, priceLabel, features, turnaround, CTA text
  - `themeTokens`: primary, primaryHover, lavender, surface, border, text, muted
- Organize JS into small reusable modules for data access, URL state parsing, rendering, and UI interactions, but keep it framework-free and simple to maintain.

## Test Plan
- Visual checks against the reference site for homepage, listings page, property page, and snagging page on desktop and mobile widths.
- Branding checks to confirm the supplied `RaretifiedRealty` logo and purple/lavender theme are applied consistently across all pages.
- Functional checks for:
  - nav and footer links
  - mobile menu open/close
  - hero search submission
  - listing filter and sort updates
  - card-to-detail navigation
  - property gallery interaction
  - FAQ/accordion toggles
  - snagging/contact form validation states
- Static serving checks to confirm all assets, routes, and query-driven page states work locally without broken paths.

## Assumptions
- The implementation will be fully hand-written in this repo; no extraction or reuse of the source site’s codebase or framework output.
- The source site is only a reference for structure, styling direction, spacing, and visible behavior.
- Blog and legal pages remain out of scope.
- “Clone” means close visual and behavioral parity for public pages, while the code itself is original and local to this folder.
