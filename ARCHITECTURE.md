# CEDHU Web Architecture

## 1. Purpose

This document defines the technical architecture of the official CEDHU website.

The project must remain:

* maintainable
* modular
* accessible
* performant
* scalable
* easy to understand
* easy to extend
* independent from unnecessary frameworks

The architecture must support future interactive experiences without making the website dependent on animation.

---

# 2. Core Stack

Current approved technologies:

* Astro
* TypeScript
* semantic HTML
* plain CSS

Future technologies may include:

* GSAP
* Rive
* Spline

These must only be introduced when explicitly required.

Do not introduce additional frameworks or UI systems without a clear architectural reason.

---

# 3. Main Architectural Principle

The project follows strict separation of concerns.

```text
Astro
↓
structure and composition

CSS
↓
visual presentation

TypeScript
↓
browser behavior

GSAP / Rive
↓
progressive interaction
```

A single file must not become responsible for all of these layers.

---

# 4. Project Structure

```text
src/
├── content/
│   ├── paginas/
│   ├── noticias/
│   ├── reconocimientos/
│   └── eventos/
├── content.config.ts
├── schemas/
├── lib/
├── assets/
│   ├── images/
│   ├── icons/
│   └── animations/
│
├── components/
│   ├── common/
│   ├── navigation/
│   ├── sections/
│   └── ui/
│
├── layouts/
│
├── pages/
│
├── scripts/
│   ├── animations/
│   ├── interactions/
│   └── utils/
│
└── styles/
    ├── reset.css
    ├── tokens.css
    ├── global.css
    ├── components/
    ├── layouts/
    └── utilities/
```

---

# 5. Pages

Editorial content is stored in Astro Content Collections under `src/content/`.
`src/content.config.ts` defines current build-time `glob()` loaders and schemas;
`src/lib/content.ts` provides typed queries. Routes pass collection titles and
descriptions to the existing layout for SEO. Components preserve their markup,
CSS classes and image pipeline; shared sections have one editorial source.
See [Content Collections](docs/CONTENT-COLLECTIONS.md) for the field and route map.

Directory:

`src/pages/`

Responsibilities:

* routing
* page composition
* page-level metadata
* page-level data loading

Pages must remain thin.

They should compose layouts and reusable components instead of containing complete page sections.

Example:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Hero from "../components/sections/Hero.astro";
---

<BaseLayout
	title="CEDHU | Centro de Desarrollo Humano"
	description="Centro de Desarrollo Humano"
>
	<Hero />
</BaseLayout>
```

Avoid placing large amounts of markup directly inside page files.

---

# 6. Layouts

Directory:

`src/layouts/`

Layouts define shared page shells.

Examples:

* `BaseLayout.astro`
* `ArticleLayout.astro`
* `LandingLayout.astro`

The base layout may contain:

* document structure
* `<head>`
* metadata
* global CSS imports
* shared site-level elements
* default slots

Layouts must not contain page-specific content.

---

# 7. Components

Directory:

`src/components/`

Components must have one clear responsibility.

## sections

Large page sections.

Examples:

* `Hero.astro`
* `About.astro`
* `AcademicExperience.astro`
* `NewsSection.astro`

## navigation

Navigation components.

Examples:

* `BottomNav.astro`
* `MobileNav.astro`
* `SectionNavigation.astro`

## common

Small reusable structural elements.

Examples:

* `Logo.astro`
* `SectionLabel.astro`
* `Footer.astro`

## ui

Reusable interface elements.

Examples:

* buttons
* links
* badges
* indicators
* chips

Avoid excessive component fragmentation.

Do not create a component for trivial markup unless it improves readability, reuse, accessibility or architectural clarity.

---

# 8. Component Naming

Use PascalCase.

Correct:

```text
Hero.astro
BottomNav.astro
NewsCard.astro
SectionTitle.astro
```

Avoid:

```text
hero-section.astro
navbar2.astro
component-final.astro
box.astro
```

---

# 9. Styling Architecture

All CSS lives inside:

`src/styles/`

Do not use:

* `<style>` blocks inside `.astro`
* inline `style=""`
* CSS-in-JS
* Tailwind
* Sass
* Less

unless the architecture is explicitly revised.

---

# 10. CSS Responsibilities

## reset.css

Responsible for:

* normalization
* box sizing
* default browser behavior
* basic element reset

---

## tokens.css

Responsible for all reusable design values.

Examples:

```css
--color-bg;
--color-text;
--color-primary;
--color-accent;

--font-body;
--font-display;

--space-xs;
--space-sm;
--space-md;
--space-lg;
--space-xl;

--radius-sm;
--radius-md;
--radius-full;

--duration-fast;
--duration-normal;

--ease-standard;
```

Component files should consume tokens instead of repeatedly inventing values.

---

## global.css

Responsible for:

* body
* base typography
* anchors
* global accessibility behavior
* page background
* global focus behavior

Do not place component-specific styles here.

---

## styles/components

Every major component receives its own stylesheet.

Example:

```text
src/components/sections/Hero.astro
src/styles/components/hero.css
```

```text
src/components/navigation/BottomNav.astro
src/styles/components/bottom-nav.css
```

---

# 11. CSS Naming

Use readable component-scoped naming.

Preferred:

```css
.hero
.hero__content
.hero__title
.hero__description
.hero__interactive

.bottom-nav
.bottom-nav__list
.bottom-nav__link
```

Avoid:

```css
.box
.text1
.left-side
.circle2
.wrapper-final
```

---

# 12. HTML

Use semantic HTML.

Prefer:

* `header`
* `main`
* `nav`
* `section`
* `article`
* `footer`
* `button`
* `a`

Avoid unnecessary generic containers.

Interactive behavior must use native interactive elements.

Use:

`button`

for actions.

Use:

`a`

for navigation.

Never use clickable `div` elements.

---

# 13. Accessibility

Accessibility is mandatory.

All interactive elements must:

* support keyboard navigation
* expose visible focus states
* maintain sufficient contrast
* use appropriate semantic elements

Images require meaningful alternative text unless decorative.

Decorative content must not create unnecessary accessibility noise.

Motion must respect:

```css
@media (prefers-reduced-motion: reduce)
```

Essential information must never depend exclusively on animation.

---

# 14. Responsive Architecture

Design mobile-first unless a specific component requires another strategy.

The website must work across:

* mobile
* tablet
* laptop
* desktop
* large desktop

Prefer fluid layout techniques:

* CSS Grid
* Flexbox
* `clamp()`
* `min()`
* `max()`
* percentages
* viewport-relative units

Avoid excessive fixed pixel positioning.

Avoid breakpoint proliferation.

---

# 15. JavaScript and TypeScript

Reusable client-side logic belongs inside:

`src/scripts/`

## interactions

UI behavior.

Example:

```text
src/scripts/interactions/navigation.ts
```

## animations

Animation controllers.

Example:

```text
src/scripts/animations/hero.ts
```

## utils

Reusable helpers.

Do not place large JavaScript implementations inside `.astro` files.

Astro frontmatter may contain:

* imports
* props
* build-time logic
* data transformation

---

# 16. Animation Architecture

Animation is progressive enhancement.

The page must remain readable and functional without animation.

Future layers:

```text
semantic Astro structure
        ↓
CSS layout
        ↓
GSAP interaction
        ↓
Rive interactive graphics
        ↓
optional Spline 3D
```

Animation libraries must not define the layout architecture.

---

# 17. GSAP

When introduced, GSAP should control:

* entrance sequences
* scroll-driven transitions
* text reveals
* coordinated motion
* magnetic interactions
* cursor behaviors

GSAP logic belongs in:

`src/scripts/animations/`

Do not distribute independent GSAP timelines randomly across components.

---

# 18. Rive

When introduced, Rive should be reserved for:

* interactive identity elements
* state-based illustrations
* menu interactions
* meaningful microinteractions
* interactive visual systems

Rive assets belong in:

`src/assets/animations/`

Rive should not replace semantic navigation or essential content.

---

# 19. Spline

Spline is optional.

Only use it when true 3D interaction meaningfully improves the experience.

Do not add 3D merely as decoration.

Performance cost must always be considered.

---

# 20. Performance

Prefer Astro static output wherever possible.

Avoid unnecessary client-side hydration.

Avoid loading large libraries globally.

Interactive functionality should load only where required.

Optimize:

* images
* fonts
* animation assets
* JavaScript
* third-party resources

Do not use animation at the expense of page usability.

---

# 21. Dependency Policy

Do not install packages without explicit authorization.

Before adding a dependency:

1. verify the feature cannot reasonably be solved using the existing stack
2. explain why the dependency is needed
3. confirm that it fits the architecture

Do not introduce frontend frameworks merely to solve basic interactions.

---

# 22. Scope Control

When implementing a task:

* modify only relevant files
* do not redesign unrelated sections
* do not rename unrelated files
* do not refactor unrelated systems
* do not introduce speculative features
* do not introduce new dependencies unless required

Architecture changes require explanation before implementation.

---

# 23. Validation

After implementation:

1. run:

```bash
npm run build
```

2. fix errors caused by the changes
3. check unused imports
4. check duplicated code
5. check invalid HTML
6. check responsive behavior
7. check keyboard usability
8. verify no unauthorized dependency was introduced

---

# 24. Architectural Direction

The CEDHU website must behave as one coherent design system.

Pages must not become isolated visual experiences.

Components, tokens, motion and interaction patterns must remain reusable across the entire website.

New functionality should extend the system rather than create exceptions to it.
