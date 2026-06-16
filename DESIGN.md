# Design

**Lane:** acid-pop / playful — vivid, chunky, color-blocked, confident, on a dark base so the neon accents glow and the generative backdrop reads. Motion is subtle & refined (no scroll-jacking, no heavy library).

The system lives in **`taste-engine/engine/taste-engine.css`** as a set of CSS custom-property tokens on `:root`, plus per-section overrides written at runtime by `_applyTheme()` in `taste-engine.js`. The landing page (`taste-engine/index.html`) adds a few page-specific styles but consumes the same tokens.

## Tokens (`:root`)

### Color
The `:root` values are the **neutral hub palette** (the landing). Each instance overrides them via `meta.md` (`themeHue` / `accent` / `accent2`), applied by `_applyTheme()`:

| Token | Role |
|---|---|
| `--bg` `--surface` `--surface2` `--border` | dark ramp, derived from `themeHue` (HSL) per section |
| `--accent` | the section's voice (e.g. comedy `#FF8A33`, music `#B96BFF`, tv `#2EC5FF`, film `#FF4D58`, books `#2FE08A`, podcasts `#25D0C0`, hub `#FF5C9A`) |
| `--accent2` | a deliberate **contrast** colour, used so themes aren't monochromatic (progress fill, "N selected", `te-tag-md`, watch button, the radar "them" line) |
| `--on-accent` / `--on-accent2` | near-black ink for text **on** bright fills — sticker contrast, passes ≥4.5:1. Never white-on-accent. |
| `--accent-dim/-soft`, `--accent2-dim/-soft` | translucent accent for glows, hover shadows, soft borders |
| `--text` `--text-muted` `--text-dim` | light end of the ramp for copy |
| `--footer-bg` | translucent bar background (nav + floating CTA) |

A `body::before` radial uses `--accent2-dim` so the surface always carries a second hue.

### Typography
- **Display:** `--display` = Unbounded (700–800). Headlines are graphics: fluid `clamp()`, tracking ≥ -0.03em, `text-wrap: balance`.
- **Body / UI:** `--body` = Hanken Grotesk. (Both replace Playfair + Inter, on the impeccable reflex-reject list.)
- **Size scale:** `--fz-xs` 12 · `--fz-sm` 13.5 · `--fz-body` `clamp(15,1.05vw,17)` · `--fz-body-lg` `clamp(16,1.4vw,19)` · `--fz-lead` `clamp(17,1.6vw,21)`.
- **Weight scale:** `--fw-body` **500** · `--fw-semibold` 600 · `--fw-bold` 700.
- **Body baseline:** `body` sets `--fz-body` / `--fw-body` / `--lh-body` (1.6). Body copy runs at weight **500** so it stays legible directly on the textured backdrop. All body-copy classes (`.te-subtitle`, `.te-result-body`, `.te-sum-profile-body`, `.te-rec-reason`, `.te-card-desc`, landing `.te-why-lead/.te-why-text/.te-domain-desc`) route through these tokens — change the scale in one place.

### Space · Radius · Motion
- `--gutter: clamp(20px, 5vw, 96px)` — the single horizontal inset everywhere (full-bleed, no centred column).
- **Corners are square — everywhere.** `--radius: 0` and `--r-pill: 0`; nothing is rounded. Cards, panels, inputs, buttons, icon tiles, chips, tags, eyebrows, match pills, nav highlights — all sharp rectangles. The one exception is **people avatars** (`50%` circles, since they're cropped photos); poster/cover art is square. When adding a component, default to square.
- `--ease: cubic-bezier(0.22,1,0.36,1)` (ease-out-quint) for entrances/hovers.

## Layout
- **Full-bleed.** Content fills the viewport with `--gutter` insets. Long prose capped ~62ch for readability only.
- **Breakpoint-free grids:** `repeat(auto-fit, minmax(min(Npx, 100%), 1fr))` — the `min(…,100%)` caps each track to the viewport so nothing overflows on phones (verified to 320px).
- **Backdrop readability rule.** Large blocky display headlines (and solid accent chips like `.te-eyebrow`) may sit **directly on the geo backdrop** — they're big and high-contrast enough to read, and that's where the pattern gets to show off. **Body copy and any smaller text must sit on a solid surface** — a `.te-panel`, a result card (`.te-profile-card`, `.te-radar-card`), or a solid chip. So titles float on the geo; paragraphs go in panels (`.te-hero-sub`, `.te-why-body`, `.te-picker-sub`, etc.). A light fixed **scrim** (`body::after`, ~0.22) keeps the pattern from getting noisy behind the titles. When adding a screen: headline on the backdrop is fine, never lay a `<p>` of body text straight over it.
- Full-width sticky nav; floating, width-capped action bar.

## Components
- **Eyebrow / section labels:** solid accent (or surface) chips, not the grey uppercase tell.
- **Chips/pills:** pill radius, solid accent + ink text.
- **Cards:** square, 1.5px border, flat fill. Hover is **geometric**: the card shifts up-left (`translate(-Npx, -Npx)`) and drops a hard, zero-blur solid shadow in its accent colour (`Npx Npx 0 0 var(--card/accent)`), so it reads as a block lifting off a coloured slab. No soft glows.
- **CTA / match pill / watch link:** accent (or accent2) fill, ink text, chunky.
- **Avatars / media:** circular for people (Wikipedia photos), rounded-rect `te-avatar--poster` for TV (TMDB) / podcasts (iTunes). Lazy-loaded, cached, initials/placeholder fallback.
- **Taste map:** radar on a solid card, DPR-aware (crisp on Retina), beside a **spectrum key** listing both poles of every axis (e.g. *Dark ↔ Wholesome*), driven by the `opposite` field in `axes.md`.

## Motion
- **Entrance:** `te-rise` (fade + 16px rise) once per screen; cards / tag-clouds stagger via `:nth-child` delays.
- **Hover:** transform + shadow, ~120–180ms.
- **Backdrop:** generative geometric pattern, opacity fade-in, re-skins per section.
- **Theme:** applied synchronously before render (no colour morph); arrival smoothness comes from the entrance + backdrop fade.
- **`prefers-reduced-motion`:** entrances become instant, backdrop renders one still frame.

## Flow & gating
One path: the instance page **is** the picker → a single combined result (profile + radar + recommendations + export). Production launches **Comedy only**; other sections are dev-gated by `engine/te-config.js` (host-based; `?prod` / `?all` overrides).

## File map
- `engine/taste-engine.css` — the system (tokens + components).
- `engine/taste-engine.js` — engine + `_applyTheme()` (per-section tokens), radars, media, summary.
- `engine/te-backdrop.js` · `te-export.js` · `te-config.js` — backdrop, PNG export, feature flags.
- `instances/<domain>/{meta,items,tags,axes,tagging}.md` — per-section data + theme + axis opposites.
- `index.html` — landing (hub + manifesto), consumes the same tokens.
