# Taste Engine

A reusable taste profiler. Point it at a folder of markdown files and it builds a full picker + profile + radar chart + recommendations UI powered by Claude.

## How it works

The engine reads 5 markdown files and builds everything dynamically:

| File | What it contains |
|------|-----------------|
| `meta.md` | Domain config, labels, Claude prompts, filters |
| `items.md` | The list of things to pick from + metadata |
| `tags.md` | The full vocabulary of style tags |
| `axes.md` | How tags group into radar dimensions |
| `tagging.md` | Each item mapped to its tags |

## Creating a new instance

1. Copy `instances/comedy/` to `instances/yourdomainname/`
2. Edit the 5 markdown files for your domain
3. The `index.html` is identical for every instance — no changes needed

## File format

### items.md
```
- Item Name | field:value | field:value,value
```

### tagging.md
```
- Item Name | tag1, tag2, tag3, tag4
```

### axes.md
```
- Axis Label | tag1, tag2, tag3
```

### tags.md
```
tag1, tag2, tag3, tag4...
```

### meta.md
```
domain: comedy
itemLabel: comedian
itemLabelPlural: comedians
headline: What kind of funny do you actually like?
...
filters:
  - label: Country
    field: country
    options:
      - label: 🇦🇺 Australian | value: AU
```

## Running locally

The instances are static but load markdown via `fetch` (so `file://` won't work) and call
Claude. Use the bundled Node server, which serves the files **and** proxies the Claude API:

```
cp .env.example .env   # add your ANTHROPIC_API_KEY
node server.js         # → http://127.0.0.1:8777
```

`/` serves the overview landing page (`index.html`); each `instances/<domain>/` is its own app.
Outside the chat sandbox, `engine/local-shim.js` routes Claude through `/api/claude` and shims
`window.storage` onto localStorage. Comedian/artist/etc. photos are pulled from Wikipedia at runtime.

## Instances

- `instances/comedy/` — 79 comedians across Dropout, Taskmaster, Aunty Donna, British panel shows, SNL, and stand-up
- `instances/music/` — 12 artists
- `instances/tv/` — 16 shows
- `instances/film/` — 16 directors
- `instances/books/` — 16 authors

## Features

- Alphabetical list with live search + autocomplete
- Multiselect filters (country, format, era, genre — whatever you define in meta.md)
- Minimum pick threshold before results unlock
- Three result modes: written profile, radar chart, recommendations
- Progressive nudge from each result to the next
- "I already like them" on recommendations re-runs with tighter data
- Add unknown items inline via Claude API — saved to shared storage
