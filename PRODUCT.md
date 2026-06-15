# Product

## Register

brand

## Users
People playing with their own taste for fun — figuring out (and sharing) what their picks in comedy, music, TV, film, and books say about them. They arrive curious and a little self-aware; the reward is a sharp, flattering, slightly cheeky read on themselves plus things to go discover.

## Product Purpose
A reusable "taste profiler": pick the things you love in a category, and it builds a written profile, a radar map, and recommendations (via Claude). It exists to make self-knowledge feel like a toy — playful, opinionated, instantly shareable.

The deeper mission: help people **learn their own taste** so they rely less on opaque algorithms. Two jobs — (1) give people the **vocabulary** to describe their taste, and (2) restore **agency** over discovery: explore new things on purpose rather than having them auto-wedged into a feed. The ethos is Last.fm / Pandora (recommendation you opt into) over Spotify / Netflix (pushy auto-curation) — more human judgment in the curation loop. Success = the result makes you grin, want to send it to a friend, and feel more in control of what you go explore.

**Launch:** ships to production with **Comedy only**; the other sections are built and live in development, gated behind a feature flag until ready (see `engine/te-config.js`).

## Brand Personality
Loud, witty, confident. Three words: **playful, opinionated, vivid.** It has a point of view and isn't afraid of colour or a joke. Voice is a smart friend roasting you affectionately, not a wellness app.

## Anti-references
- Generic "Claude / SaaS" cleanliness: muted palette, safe centred column, rounded-everything, tiny grey uppercase eyebrows, identical card grids.
- Wellness/meditation calm. This is not a spa.
- Beige editorial restraint. Colour is the point.

## Design Principles
- **Colour is voice.** Each category owns a vivid accent; the UI commits to it, doesn't hedge with neutrals.
- **Type with attitude.** Big, chunky, characterful display. The headline is a graphic, not a label.
- **Fill the room.** Use the whole viewport; no timid centred column.
- **Playful, never cute-helpless.** Personality through boldness and wit, not mascots.
- **The result is the payoff.** Profile / radar / recs should feel like a reveal worth screenshotting.

## Accessibility & Inclusion
Maintain ≥4.5:1 body contrast and ≥3:1 for large/bold text even on saturated fills (use near-black ink on bright accents, not white). Full `prefers-reduced-motion` support: the generative backdrop settles to a still frame and entrance motion becomes an instant/crossfade. Keyboard-operable controls; visible focus.
