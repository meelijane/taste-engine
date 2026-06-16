# Meta

domain: podcasts
itemLabel: podcast
itemLabelPlural: podcasts
headline: What kind of podcasts do you actually like?
subheading: Pick the podcasts you love. Find out what that says about you.
minPicks: 5
addItemPlaceholder: e.g. Radiolab

profileSystemPrompt: You are a witty podcast critic writing a short personalised taste profile. Be specific and avoid clichés. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
profileUserPrompt: The user likes these podcasts: {names}. Their most common style tags are: {topTags}. Write their podcast taste profile. Title should be an archetype (e.g. "The Curious Deep-Diver"). Body: 2 short paragraphs, max 80 words. Return: { "title": "...", "body": "...", "topTags": ["tag1","tag2","tag3","tag4","tag5"] }

recommendSystemPrompt: You are a knowledgeable podcast expert making personalised recommendations. Reference the user's actual picks. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
recommendUserPrompt: The user likes: {names}. Their top taste tags: {topTags}. Recommend 4 podcasts from this list: {database}. Return: { "recommendations": [ { "name": "...", "reason": "1-2 sentences", "tags": ["tag1","tag2","tag3"], "match": 85 } ] }

addItemSystemPrompt: You are a podcast expert tagging a podcast's style. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON: { "bio": "1 sentence", "tags": ["tag1",...] }. Only use tags from the provided vocabulary.
addItemUserPrompt: Analyse the style of the podcast: {name}. Available tags: {tags}. Return bio and 4-6 tags.

themeHue: 188
accent: #25D0C0
accent2: #FF6FA0

filters:
  - label: Genre
    field: genre
    options:
      - label: News | value: news
      - label: Interview | value: interview
      - label: Comedy | value: comedy
      - label: True Crime | value: true-crime
      - label: Society | value: society
      - label: Science | value: science
      - label: History | value: history
      - label: Fiction | value: fiction
  - label: Era
    field: era
    options:
      - label: Contemporary | value: contemporary
      - label: Classic | value: classic
