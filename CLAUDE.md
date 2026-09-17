# CEDHU Web — Agent Instructions

## Project purpose

This repository contains the official CEDHU website.

The website is being built with Astro and will progressively incorporate motion and interactive technologies such as GSAP and Rive.

The project must prioritize:

1. Maintainability
2. Clear separation of concerns
3. Performance
4. Accessibility
5. Semantic HTML
6. Responsive design
7. Reusable architecture
8. Progressive enhancement

Do not sacrifice architecture for implementation speed.

---

# Core architecture

The project follows a strict separation of responsibilities.

## Astro

`.astro` files are responsible for:

* semantic markup
* component composition
* page structure
* Astro props
* Astro imports
* data rendering

Astro files must NOT contain component CSS.

Do not add `<style>` blocks to `.astro` files.

Do not add inline `style=""` attributes.

Do not use CSS-in-JS.

---

## CSS

All styling must live inside:

`src/styles/`

Component-specific styles must live inside:

`src/styles/components/`

Examples:

`Hero.astro`
→ `src/styles/components/hero.css`

`BottomNav.astro`
→ `src/styles/components/bottom-nav.css`

Global design primitives belong in:

`src/styles/tokens.css`

Global base styles belong in:

`src/styles/global.css`

Browser normalization/reset belongs in:

`src/styles/reset.css`

Avoid duplicated CSS between components.

---

## JavaScript and TypeScript

Reusable browser behavior must live inside:

`src/scripts/`

Use subdirectories when appropriate:

`src/scripts/animations/`

`src/scripts/interactions/`

`src/scripts/utils/`

Do not mix large JavaScript implementations directly into Astro markup.

Small Astro frontmatter scripts used for imports, props, or build-time logic are allowed.

---

# Directory responsibilities

## src/pages

Pages and routes only.

Pages should compose layouts and components.

Do not build large UI sections directly inside page files.

Example:

`src/pages/index.astro`

should compose components such as:

* Hero
* About
* Academic
* News
* Footer

rather than containing their complete implementation.

---

## src/layouts

Shared page shells.

Examples:

* BaseLayout
* ArticleLayout
* LandingLayout

Global metadata, document structure and shared site-level elements belong here when appropriate.

---

## src/components

Reusable interface components.

Organize components according to responsibility.

### common

Small reusable interface elements.

### navigation

Navigation-related components.

### sections

Large page sections.

Examples:

`src/components/sections/Hero.astro`

`src/components/navigation/BottomNav.astro`

---

# Component rules

Each component must have one clear responsibility.

Prefer small composable components over large monolithic components.

Do not create a new component for trivial markup that is only used once unless it improves readability or architecture.

Do not duplicate an existing component.

Before creating a component, inspect the repository for an equivalent implementation.

Component names use PascalCase.

Examples:

`Hero.astro`

`BottomNav.astro`

`NewsCard.astro`

---

# CSS rules

Use plain CSS unless explicitly instructed otherwise.

Do NOT introduce:

* Tailwind
* Sass
* Less
* CSS Modules
* styled-components
* CSS-in-JS frameworks

unless explicitly requested.

Use CSS custom properties for reusable design values.

Example:

`--color-primary`

`--color-secondary`

`--space-md`

`--font-display`

Do not hardcode the same design value repeatedly throughout the project.

Prefer tokens.

---

# Design tokens

Design-system values must be centralized in:

`src/styles/tokens.css`

This includes:

* colors
* typography
* spacing
* radii
* shadows
* z-index layers
* animation timings
* breakpoints when practical

Do not invent new colors or typography values inside individual components when an existing token can be used.

---

# HTML

Use semantic HTML whenever possible.

Prefer:

`header`

`nav`

`main`

`section`

`article`

`footer`

over unnecessary generic `div` containers.

Maintain a logical heading hierarchy.

There must only be one primary `h1` per page unless there is a strong semantic reason otherwise.

Interactive elements must use the correct native element.

Use:

`button`

for actions.

Use:

`a`

for navigation.

Do not create clickable `div` elements.

---

# Accessibility

Accessibility is mandatory.

Interactive elements must be keyboard accessible.

Images require meaningful alternative text unless decorative.

Decorative images must use empty alternative text when appropriate.

Respect `prefers-reduced-motion` for non-essential animations.

Do not rely exclusively on color to communicate state or meaning.

Maintain visible keyboard focus states.

---

# Responsive design

All components must be designed mobile-first unless a task explicitly requires another approach.

Components must work at:

* mobile
* tablet
* desktop
* large desktop

Avoid fixed dimensions that break responsive layouts.

Prefer:

* clamp()
* min()
* max()
* flexbox
* grid
* relative units

when appropriate.

---

# Animation architecture

Animation is progressive enhancement.

The underlying page must remain understandable and usable without animation.

GSAP must only be introduced when explicitly requested.

Rive must only be introduced when explicitly requested.

Spline must only be introduced when explicitly requested.

Do not install animation libraries proactively.

When GSAP is introduced, animation logic belongs in:

`src/scripts/animations/`

When Rive is introduced, Rive runtime/control logic belongs in:

`src/scripts/animations/`

Rive assets belong in:

`src/assets/animations/`

Animation must not contain essential content unavailable elsewhere in semantic HTML.

---

# Dependency policy

Do not install packages without explicit authorization.

Before adding any dependency:

1. Explain why it is necessary.
2. Check whether the requirement can be solved with the existing stack.
3. Ask for approval if the task did not explicitly authorize the dependency.

Do not introduce React, Vue, Svelte, Solid, Tailwind, GSAP, Rive, Spline or other frameworks/libraries unless requested.

Astro should remain the default implementation technology.

---

# Scope control

Only implement what the task requests.

Do not:

* redesign unrelated sections
* rename unrelated files
* refactor unrelated components
* introduce new libraries
* change the architecture
* create speculative features
* modify unrelated styling

If an architectural change appears necessary, explain it before implementing it.

---

# Existing code

Before modifying code:

1. Inspect the relevant files.
2. Understand existing conventions.
3. Reuse existing utilities, tokens and components.
4. Avoid duplication.

Do not overwrite working implementations without a reason.

---

# File creation

Before creating a new file:

1. Determine whether an existing file already has that responsibility.
2. Place the file in the correct architectural directory.
3. Follow naming conventions.
4. Keep responsibilities focused.

Do not create miscellaneous files in the repository root.

---

# Code quality

Code must be:

* readable
* maintainable
* intentionally structured
* minimally complex
* documented where necessary

Avoid clever implementations when a simpler solution exists.

Do not leave dead code.

Do not leave commented-out implementations.

Do not leave unused imports.

Do not use placeholder code unless explicitly requested.

---

# Astro rules

Prefer native Astro components.

Do not introduce a frontend framework merely to implement basic interactivity.

Pages should use layouts.

Reusable page sections should use components.

Keep Astro frontmatter focused.

Never place large CSS blocks inside `.astro` files.

---

# Validation

After making code changes:

1. Check for obvious TypeScript or Astro errors.
2. Run the existing project build command.
3. Resolve errors caused by the change.
4. Do not hide build failures.

Use:

`npm run build`

unless the repository defines another validation command.

Do not install additional validation tools unless authorized.

---

# Communication before major changes

For substantial or architectural tasks, first provide a short implementation plan containing:

* files to create
* files to modify
* responsibility of each file
* dependencies required, if any

Do not start a major architectural change without first understanding the affected structure.

---

# Current technology policy

Approved:

* Astro
* TypeScript
* HTML
* CSS

Not yet approved:

* GSAP
* Rive
* Spline
* React
* Vue
* Svelte
* Tailwind
* other UI or animation frameworks

These technologies may be added later when explicitly requested.

---

# Primary rule

Maintain separation of concerns.

Markup belongs to Astro.

Presentation belongs to CSS.

Reusable browser behavior belongs to TypeScript.

Never collapse these layers into a single file simply because the framework allows it.
