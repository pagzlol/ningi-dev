# ningi.dev Redesign — Ink & Stone

**Date:** 2026-05-16  
**Status:** Approved

## Goal

Redesign ningi.dev to feel like a serious security researcher's portfolio — not a CTF scoreboard or an AI-generated dark template. Same content structure, entirely new visual language.

---

## Colour tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#111010` | Page background |
| `--surface` | `#1c1a19` | Cards, raised panels |
| `--surface-2` | `#221f1e` | Alternate section band |
| `--text` | `#f0ece6` | Primary text |
| `--muted` | `#9e958c` | Secondary text, labels, card body |
| `--soft` | `#6a625c` | Tertiary text, footer, finding IDs |
| `--accent` | `#6b8cae` | Links, active states, primary CTA only |
| `--line` | `rgba(240,236,230,0.09)` | Borders, dividers |
| `--shadow` | `rgba(0,0,0,0.5)` | Card shadows |

**No cyan. No green. No amber. No gradient blobs. No grid lines.**

---

## Typography

- **Headings (h1, h2, h3):** DM Serif Display — loaded from Google Fonts, weight 400, italic variant available
- **Body:** Inter (existing) — weight 400/500/600
- h1: `clamp(3.5rem, 12vw, 8.5rem)`, line-height 0.95, font-weight 400
- h2: `clamp(2rem, 4.5vw, 3.5rem)`, line-height 1.05, font-weight 400
- h3: `1.3rem`, line-height 1.3, font-weight 400
- Eyebrow labels: 0.72rem, weight 600, letter-spacing 0.14em, uppercase, colour `--accent`

---

## Layout — unchanged sections

Content structure is preserved exactly:

1. Header (fixed)
2. Hero (full-bleed image + text)
3. Metrics bar (4 columns)
4. Intro ("What this is")
5. Work / writeups (3-col card grid with filters)
6. Findings (list)
7. Tools (split layout)
8. Contact
9. Footer

---

## Component changes

### Header
- Same layout, backdrop blur stays
- Brand mark: small `32×32` rounded square, warm dark bg, serif "N" in accent
- Nav links: `--muted` at rest, `--text` on hover — no active colour

### Hero
- Background image opacity reduced to `0.45` (was 0.6)
- Scrim: warm dark (`#111010`) gradient replacing cold blue-black
- No radial cyan glow
- h1 in DM Serif Display
- CTA buttons: primary uses `--accent` bg + `--bg` text; secondary uses subtle warm transparent

### Parallax scroll effect
- Hero image: CSS `background-attachment: fixed` fallback OR JS `requestAnimationFrame` scroll handler that translates the image at 40% of scroll speed
- Hero text (eyebrow + h1 + lede + CTAs): fades out (`opacity: 0`) and translates upward (`translateY(-60px)`) as the hero exits the viewport — driven by scroll progress, not time
- Threshold: effect starts when user has scrolled ~15% of hero height, completes at ~85%
- `prefers-reduced-motion`: skip all transforms and opacity changes, no parallax

### Metrics bar
- Background: `--surface`
- Numbers in DM Serif Display
- No cyan divider lines — `--line` borders only

### Work cards
- Grid of 3 cols separated by `1px` `--line` gaps, single outer border, `border-radius: 10px`, overflow hidden
- Each card: `--surface` background, no individual card borders
- Category label: plain text, `--muted`, small caps style (uppercase + 0.72rem + letter-spacing)
- h3 in DM Serif Display
- Read link: `--accent`, no badge, no coloured pill

### Findings list
- Same `1px` gap grid treatment as cards
- Finding ID: `--soft`, small, no amber colour
- Title: `--text`, weight 500
- Hover: background shifts to `--surface-2`

### Contact
- No coral gradient — plain `--surface-2` background

### Footer
- Footer link: `--accent` (same as all other links)

---

## Parallax implementation detail

Use a lightweight JS scroll handler (no library):

```js
const hero = document.querySelector('.hero')
const heroImg = document.querySelector('.hero-media img')
const heroContent = document.querySelector('.hero-content')

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY
    const heroH = hero.offsetHeight
    const progress = Math.min(scrollY / heroH, 1)

    // image moves at 40% of scroll speed
    heroImg.style.transform = `translateY(${scrollY * 0.4}px)`

    // text fades and drifts up between 15%–85% scroll progress
    const textProgress = Math.max(0, Math.min((progress - 0.15) / 0.70, 1))
    heroContent.style.opacity = 1 - textProgress
    heroContent.style.transform = `translateY(${textProgress * -60}px)`
  }, { passive: true })
}
```

---

## Files to change

| File | Change |
|---|---|
| `styles.css` | Full rewrite of tokens, typography, all components |
| `index.html` | Add Google Fonts `<link>`, no structural changes |
| `script.js` | Add parallax scroll handler |
| `preview.html` | Delete after implementation |

---

## Out of scope

- No new sections or content changes
- No build tooling — stays as plain HTML/CSS/JS
- No dark/light toggle
- No animation library
