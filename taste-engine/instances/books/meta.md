# Meta

domain: books
itemLabel: author
itemLabelPlural: authors
headline: What kind of authors do you actually like?
subheading: Pick the authors you love. Find out what that says about you.
minPicks: 5
addItemPlaceholder: e.g. Ursula K. Le Guin

profileSystemPrompt: You are a witty literary critic writing a short personalised taste profile. Be specific and avoid clichés. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
profileUserPrompt: The user likes these authors: {names}. Their most common style tags are: {topTags}. Write their reading taste profile. Title should be an archetype (e.g. "The Melancholy Maximalist"). Body: 2 short paragraphs, max 80 words. Return: { "title": "...", "body": "...", "topTags": ["tag1","tag2","tag3","tag4","tag5"] }

recommendSystemPrompt: You are a knowledgeable literary expert making personalised recommendations. Reference the user's actual picks. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
recommendUserPrompt: The user likes: {names}. Their top taste tags: {topTags}. Recommend 4 authors from this list: {database}. Return: { "recommendations": [ { "name": "...", "reason": "1-2 sentences", "tags": ["tag1","tag2","tag3"], "match": 85 } ] }

addItemSystemPrompt: You are a literary expert tagging an author's style. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON: { "bio": "1 sentence", "tags": ["tag1",...] }. Only use tags from the provided vocabulary.
addItemUserPrompt: Analyse the literary style of: {name}. Available tags: {tags}. Return bio and 4-6 tags.

themeHue: 158
accent: #2FE08A
accent2: #FF7A4D

filters:
  - label: Genre
    field: genre
    options:
      - label: Literary | value: literary
      - label: Sci-fi | value: sci-fi
      - label: Fantasy | value: fantasy
      - label: Crime | value: crime
      - label: Nonfiction | value: nonfiction
  - label: Era
    field: era
    options:
      - label: Contemporary | value: contemporary
      - label: Classic | value: classic
