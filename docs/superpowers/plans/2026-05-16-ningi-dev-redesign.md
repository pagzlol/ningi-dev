# ningi.dev Ink & Stone Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hackerish cyan/amber dark template with a warm charcoal + serif editorial design (Ink & Stone) while keeping the exact same HTML structure.

**Architecture:** Three files change — `styles.css` is fully rewritten with new tokens, typography, and component styles; `index.html` gets a Google Fonts `<link>` added; `script.js` gets a parallax scroll handler added. No build tooling, no new dependencies beyond a Google Fonts CDN link.

**Tech Stack:** Plain HTML, CSS, JavaScript (no framework, no bundler). Google Fonts (DM Serif Display). Python http.server for local preview.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Modify | Add Google Fonts preconnect + stylesheet links |
| `styles.css` | Full rewrite | All design tokens, typography, layout, components |
| `script.js` | Modify | Add parallax scroll handler (preserve existing filter logic) |
| `preview.html` | Delete | Temporary mockup — remove after implementation |

---

### Task 1: Add Google Fonts to index.html

**Files:**
- Modify: `index.html` (inside `<head>`, before `styles.css` link)

- [ ] **Step 1: Add font preconnect and stylesheet links**

In `index.html`, replace:
```html
    <link rel="stylesheet" href="styles.css">
```
with:
```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
```

- [ ] **Step 2: Verify font loads in browser**

Open `http://localhost:8090` and check the browser DevTools Network tab — confirm `fonts.googleapis.com` request returns 200 and the DM Serif Display font file loads.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add DM Serif Display from Google Fonts"
```

---

### Task 2: Rewrite CSS tokens and base styles

**Files:**
- Modify: `styles.css` — replace the entire `:root` block and `body` rule

- [ ] **Step 1: Replace :root tokens and body**

Replace everything from line 1 through the closing `}` of the `body` rule (lines 1–56 in the current file) with:

```css
:root {
  color-scheme: dark;
  --bg:        #111010;
  --surface:   #1c1a19;
  --surface-2: #221f1e;
  --text:      #f0ece6;
  --muted:     #9e958c;
  --soft:      #6a625c;
  --accent:    #6b8cae;
  --line:      rgba(240, 236, 230, 0.09);
  --shadow:    rgba(0, 0, 0, 0.5);
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
}
```

- [ ] **Step 2: Verify in browser**

Reload `http://localhost:8090` — page should be warm dark charcoal with no grid lines, no cyan glow, no gradient blobs. Text should be warm off-white.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: replace CSS tokens with Ink & Stone palette"
```

---

### Task 3: Header styles

**Files:**
- Modify: `styles.css` — replace `.skip-link`, `.site-header`, `.brand`, `.nav` rules

- [ ] **Step 1: Replace header CSS**

Replace the existing `.skip-link` through `.nav a:hover` rules with:

```css
a {
  color: inherit;
  text-decoration: none;
}

.skip-link {
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 20;
  transform: translateY(-180%);
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--text);
  color: var(--bg);
  padding: 0.6rem 0.8rem;
}

.skip-link:focus {
  transform: translateY(0);
}

.site-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 4.5rem;
  padding: 0.85rem clamp(1rem, 4vw, 3rem);
  border-bottom: 1px solid var(--line);
  background: rgba(17, 16, 16, 0.88);
  backdrop-filter: blur(16px);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
}

.brand img {
  width: 2.5rem;
  height: 2.5rem;
}

.nav {
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 3vw, 1.6rem);
  color: var(--muted);
  font-size: 0.9rem;
  font-weight: 500;
}

.nav a:hover,
.nav a:focus-visible {
  color: var(--text);
}
```

- [ ] **Step 2: Verify in browser**

Header should be warm dark, no cyan border, nav links muted warm grey.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: restyle header for Ink & Stone"
```

---

### Task 4: Hero styles

**Files:**
- Modify: `styles.css` — replace `.hero` through `.hero-actions` rules

- [ ] **Step 1: Replace hero CSS**

Replace the existing `.hero` through `.hero-actions` rules with:

```css
.hero {
  position: relative;
  min-height: 92svh;
  display: grid;
  align-items: end;
  overflow: hidden;
  padding: 7rem clamp(1rem, 5vw, 5.5rem) 5.25rem;
}

.hero-media,
.hero-media img,
.hero-scrim {
  position: absolute;
  inset: 0;
}

.hero-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0.45;
  will-change: transform;
}

.hero-scrim {
  background:
    linear-gradient(90deg, rgba(17, 16, 16, 0.97) 0%, rgba(17, 16, 16, 0.80) 44%, rgba(17, 16, 16, 0.22) 100%),
    linear-gradient(0deg, var(--bg) 0%, rgba(17, 16, 16, 0) 42%);
}

.hero-content {
  position: relative;
  max-width: 54rem;
  will-change: transform, opacity;
}

.eyebrow {
  margin: 0 0 0.85rem;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  overflow-wrap: anywhere;
}

h1 {
  margin: 0;
  font-family: 'DM Serif Display', serif;
  font-size: clamp(3.5rem, 12vw, 8.5rem);
  line-height: 0.95;
  font-weight: 400;
  letter-spacing: -0.01em;
}

h2 {
  margin: 0;
  max-width: 52rem;
  font-family: 'DM Serif Display', serif;
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.05;
  font-weight: 400;
  letter-spacing: -0.01em;
}

h3 {
  margin: 0;
  font-family: 'DM Serif Display', serif;
  font-size: 1.3rem;
  line-height: 1.3;
  font-weight: 400;
}

.lede {
  max-width: 43rem;
  margin: 1.4rem 0 0;
  color: var(--muted);
  font-size: clamp(1.05rem, 2.3vw, 1.4rem);
  line-height: 1.65;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
}
```

- [ ] **Step 2: Verify in browser**

Hero heading should render in DM Serif Display. Scrim should be warm, no cyan glow. Eyebrow label in muted slate-blue.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: restyle hero with DM Serif and warm scrim"
```

---

### Task 5: Button and metrics styles

**Files:**
- Modify: `styles.css` — replace `.button` through `.metrics span` rules

- [ ] **Step 1: Replace button and metrics CSS**

Replace the existing `.button` through `.metrics span` rules with:

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.85rem;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0.75rem 1.1rem;
  font-weight: 600;
  font-size: 0.9rem;
  transition:
    transform 140ms ease,
    background 140ms ease,
    border-color 140ms ease;
}

.button:hover,
.button:focus-visible {
  transform: translateY(-1px);
}

.button.primary {
  border-color: transparent;
  background: var(--accent);
  color: var(--bg);
}

.button.secondary {
  background: rgba(240, 236, 230, 0.06);
  color: var(--text);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-block: 1px solid var(--line);
  background: var(--surface);
}

.metrics div {
  min-height: 7.25rem;
  padding: 1.5rem clamp(1rem, 3vw, 2rem);
  border-right: 1px solid var(--line);
}

.metrics div:last-child {
  border-right: 0;
}

.metrics strong,
.metrics span {
  display: block;
}

.metrics strong {
  font-family: 'DM Serif Display', serif;
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 400;
  line-height: 1;
}

.metrics span {
  margin-top: 0.55rem;
  color: var(--muted);
  font-size: 0.88rem;
}
```

- [ ] **Step 2: Verify in browser**

Primary button should be slate-blue with dark text. Metric numbers should render in DM Serif Display.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: restyle buttons and metrics bar"
```

---

### Task 6: Section, intro, and filter styles

**Files:**
- Modify: `styles.css` — replace `.section` through `.filter.active` rules

- [ ] **Step 1: Replace section and filter CSS**

Replace the existing `.section` through `.filter.active` rules with:

```css
.section,
.section-band,
.intro,
.contact {
  padding: clamp(4rem, 8vw, 7rem) clamp(1rem, 5vw, 5.5rem);
}

.section-band {
  background: var(--surface-2);
  border-block: 1px solid var(--line);
}

.section-heading {
  display: grid;
  gap: 0.5rem;
  margin-bottom: 2.5rem;
}

.intro {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(18rem, 0.65fr);
  gap: clamp(2rem, 6vw, 5rem);
  align-items: start;
}

.intro-copy {
  color: var(--muted);
  font-size: 1.05rem;
  line-height: 1.75;
}

.intro-copy p {
  margin: 0;
}

.intro-copy p + p {
  margin-top: 1.2rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.filter {
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  min-height: 2.1rem;
  padding: 0.38rem 0.85rem;
  font: 500 0.82rem/1 'Inter', sans-serif;
}

.filter.active,
.filter:hover,
.filter:focus-visible {
  border-color: rgba(107, 140, 174, 0.5);
  background: rgba(107, 140, 174, 0.1);
  color: var(--text);
}
```

- [ ] **Step 2: Verify in browser**

Section bands should use warm surface-2. Filter pills should use slate-blue on active/hover, no cyan.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: restyle sections and filter pills"
```

---

### Task 7: Work card styles

**Files:**
- Modify: `styles.css` — replace `.work-grid` through `.work-card a` rules

- [ ] **Step 1: Replace work card CSS**

Replace the existing `.work-grid` through `.work-card a` rules with:

```css
.work-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}

.work-card {
  min-height: 19rem;
  display: grid;
  align-content: start;
  gap: 0.85rem;
  background: var(--surface);
  padding: 1.5rem;
}

.work-card[hidden] {
  display: none;
}

.tag {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.work-card p,
.tool-list span {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
  font-size: 0.92rem;
}

.work-card a {
  align-self: end;
  color: var(--accent);
  font-size: 0.88rem;
  font-weight: 600;
}

.work-card a:hover {
  text-decoration: underline;
}
```

- [ ] **Step 2: Verify in browser**

Cards should be warm surface panels separated by thin lines, no individual card borders, no coloured pill badges. Category labels plain muted text. Read links in slate-blue.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: restyle work cards"
```

---

### Task 8: Findings, tools, contact, and footer styles

**Files:**
- Modify: `styles.css` — replace `.finding-list` through end of file (before media queries)

- [ ] **Step 1: Replace findings, tools, contact, footer CSS**

Replace the existing `.finding-list` through `.footer a` rules with:

```css
.finding-list,
.tool-list {
  display: grid;
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}

.finding-list a,
.tool-list a {
  display: grid;
  gap: 0.35rem;
  background: var(--surface);
  padding: 1.1rem 1.4rem;
  transition: background 140ms;
}

.finding-list a:hover,
.finding-list a:focus-visible,
.tool-list a:hover,
.tool-list a:focus-visible {
  background: var(--surface-2);
}

.finding-list span {
  color: var(--soft);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.finding-list strong,
.tool-list strong {
  font-size: 0.97rem;
  font-weight: 500;
  color: var(--text);
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(18rem, 1fr);
  gap: clamp(2rem, 6vw, 5rem);
}

.contact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  border-block: 1px solid var(--line);
  background: var(--surface-2);
}

.contact h2 {
  font-size: clamp(1.8rem, 4vw, 3.2rem);
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.4rem clamp(1rem, 5vw, 5.5rem);
  color: var(--soft);
  font-size: 0.85rem;
}

.footer a {
  color: var(--accent);
  font-weight: 600;
}
```

- [ ] **Step 2: Verify in browser**

Findings list: no amber IDs, plain muted grey. Contact section: warm surface-2, no coral gradient. Footer link: slate-blue.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: restyle findings, tools, contact, footer"
```

---

### Task 9: Media queries

**Files:**
- Modify: `styles.css` — replace all `@media` blocks at the end of the file

- [ ] **Step 1: Replace media query CSS**

Replace the existing `@media` blocks with:

```css
@media (max-width: 940px) {
  .site-header {
    position: absolute;
  }

  .nav {
    display: none;
  }

  .hero {
    min-height: 88svh;
    padding-top: 6rem;
  }

  .metrics,
  .work-grid,
  .intro,
  .split {
    grid-template-columns: 1fr;
  }

  .metrics div {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }

  .metrics div:last-child {
    border-bottom: 0;
  }
}

@media (max-width: 620px) {
  .brand span {
    font-size: 0.98rem;
  }

  .hero {
    min-height: 84svh;
  }

  .hero-actions,
  .contact,
  .footer {
    align-items: stretch;
    flex-direction: column;
  }

  .button {
    width: 100%;
  }

  .work-card {
    min-height: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition: none !important;
  }
}
```

- [ ] **Step 2: Verify at mobile widths**

In browser DevTools, toggle to 375px and 768px. Cards should stack to single column. Hero should fill viewport. No horizontal overflow.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: update media queries for Ink & Stone"
```

---

### Task 10: Parallax scroll handler

**Files:**
- Modify: `script.js` — add parallax handler before or after existing filter code

- [ ] **Step 1: Read existing script.js**

Open `script.js` and note where the existing filter logic lives so the parallax code is added without disrupting it.

- [ ] **Step 2: Add parallax handler**

At the end of `script.js`, add:

```js
(function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const heroImg = document.querySelector('.hero-media img')
  const heroContent = document.querySelector('.hero-content')
  const hero = document.querySelector('.hero')
  if (!heroImg || !heroContent || !hero) return

  let ticking = false

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        const scrollY = window.scrollY
        const heroH = hero.offsetHeight

        heroImg.style.transform = 'translateY(' + (scrollY * 0.4) + 'px)'

        const progress = scrollY / heroH
        const textProgress = Math.max(0, Math.min((progress - 0.15) / 0.70, 1))
        heroContent.style.opacity = 1 - textProgress
        heroContent.style.transform = 'translateY(' + (textProgress * -60) + 'px)'

        ticking = false
      })
      ticking = true
    }
  }, { passive: true })
}())
```

- [ ] **Step 3: Verify parallax in browser**

Scroll down from the top of `http://localhost:8090`. The hero image should move slower than the page scroll. The hero text should fade and drift upward as you scroll past the hero. Below the hero, everything should scroll normally.

- [ ] **Step 4: Verify reduced motion**

In browser DevTools → Rendering → Emulate CSS media feature → `prefers-reduced-motion: reduce`. Scroll the page — no transform or fade should occur.

- [ ] **Step 5: Commit**

```bash
git add script.js
git commit -m "feat: add parallax scroll effect to hero"
```

---

### Task 11: Cleanup

**Files:**
- Delete: `preview.html`

- [ ] **Step 1: Delete the preview file**

```bash
git rm preview.html
```

- [ ] **Step 2: Final visual check**

Open `http://localhost:8090` and scroll the full page. Verify:
- No cyan, no amber, no green anywhere
- All headings in DM Serif Display
- Parallax works on scroll
- Cards are clean borderless panels
- Findings list has no amber IDs
- Contact section is plain warm dark, no coral gradient
- Footer link is slate-blue

- [ ] **Step 3: Final commit**

```bash
git commit -m "chore: remove preview.html after redesign complete"
```
