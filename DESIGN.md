# Design

Aesthetic lane: **acid pop / playful** — vivid, chunky, color-blocked, confident. Motion is **subtle & refined** (no scroll-jacking, no heavy library): one gentle entrance per screen, springy hovers, and the generative "Quiet Currents" backdrop. Dark base so the neon accents glow and the flow-field reads.

## Color
Per-section accent is the voice. The engine derives a dark, slightly-saturated ramp from `themeHue` and applies vivid `accent` / `accent2` (see `meta.md` per instance + `_applyTheme()`).

- comedy — amber `#FF8A33`
- music — electric violet `#B96BFF`
- tv — electric cyan `#2EC5FF`
- film — vivid red `#FF4D58`
- books — acid green `#2FE08A`
- hub (landing default) — hot magenta `#FF5C9A` on near-black slate

**Ink-on-accent, not white-on-accent.** Bright fills (CTAs, match pills, badges) use near-black ink (`--on-accent`, ~`hsl(hue 40% 9%)`) for that sticker contrast and to pass ≥4.5:1. Body text uses the light end of the ramp.

## Typography
- Display: **Unbounded** (700–800) — chunky, geometric, characterful. Headlines are graphics: fluid `clamp()`, tight tracking (≥ -0.03em), `text-wrap: balance`.
- Body / UI: **Hanken Grotesk** (400–600) — clean neutral grotesk for contrast against the loud display.
- (Replaces Playfair + Inter — both on the impeccable reflex-reject list.)

## Layout
- **Full-bleed.** No centred max-width column. Fluid gutters `clamp(20px, 5vw, 96px)`; content fills the viewport. Long prose (profile body) capped ~62ch for readability only.
- Item & rec grids: `repeat(auto-fit, minmax(240px, 1fr))` — breakpoint-free, fills wide screens.
- Full-width sticky nav; chunky floating action bar.
- Eyebrow re-cast as a small solid **accent chip** (voice), not the grey uppercase tell.

## Components
- **Chips/pills:** solid accent + ink text, pill radius, slight tilt on hover.
- **Cards:** bold border, flat fill, springy `translateY` + hard accent shadow on hover. Featured card = accent-tinted.
- **CTA:** full accent fill, ink text, chunky.
- **Match pill / numbers:** big, accent-filled, sticker energy.

## Motion
- Entrance: `te-rise` — each screen fades + rises once on show (200–500ms, ease-out-quint). Item lists stagger lightly.
- Hover: transform + shadow, ~120ms.
- Theme: long eased color transition (`~0.9s`) so the slate→accent wash on arrival is smooth, not abrupt; paired with the entrance fade to mask any snap.
- `prefers-reduced-motion`: backdrop still-frame, entrances become instant.
