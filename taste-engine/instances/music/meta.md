# Meta

domain: music
itemLabel: artist
itemLabelPlural: artists
headline: What kind of music do you actually like?
subheading: Pick the artists you love. Find out what that says about you.
minPicks: 5
addItemPlaceholder: e.g. Björk

profileSystemPrompt: You are a witty music critic writing a short personalised taste profile. Be specific and avoid clichés. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
profileUserPrompt: The user likes these artists: {names}. Their most common style tags are: {topTags}. Write their music taste profile. Title should be an archetype (e.g. "The Cerebral Hedonist"). Body: 2 short paragraphs, max 80 words. Return: { "title": "...", "body": "...", "topTags": ["tag1","tag2","tag3","tag4","tag5"] }

recommendSystemPrompt: You are a knowledgeable music expert making personalised recommendations. Reference the user's actual picks. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
recommendUserPrompt: The user likes: {names}. Their top taste tags: {topTags}. Recommend 4 artists from this list: {database}. Return: { "recommendations": [ { "name": "...", "reason": "1-2 sentences", "tags": ["tag1","tag2","tag3"], "match": 85 } ] }

addItemSystemPrompt: You are a music expert tagging an artist's style. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON: { "bio": "1 sentence", "tags": ["tag1",...] }. Only use tags from the provided vocabulary.
addItemUserPrompt: Analyse the musical style of: {name}. Available tags: {tags}. Return bio and 4-6 tags.

themeHue: 270
accent: #B96BFF
accent2: #FFC23D

filters:
  - label: Genre
    field: genre
    options:
      - label: Electronic | value: electronic
      - label: Rock | value: rock
      - label: Pop | value: pop
      - label: Hip-hop | value: hip-hop
      - label: Folk | value: folk
      - label: Jazz | value: jazz
      - label: Classical | value: classical
  - label: Era
    field: era
    options:
      - label: Contemporary | value: contemporary
      - label: 90s/00s | value: 90s-00s
      - label: Classic | value: classic
