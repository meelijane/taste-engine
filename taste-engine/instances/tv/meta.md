# Meta

domain: tv
itemLabel: show
itemLabelPlural: shows
headline: What kind of TV do you actually like?
subheading: Pick the shows you love. Find out what that says about you.
minPicks: 5
addItemPlaceholder: e.g. The Wire

profileSystemPrompt: You are a witty TV critic writing a short personalised taste profile. Be specific and avoid clichés. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
profileUserPrompt: The user likes these shows: {names}. Their most common style tags are: {topTags}. Write their TV taste profile. Title should be an archetype (e.g. "The Prestige Bleakness Connoisseur"). Body: 2 short paragraphs, max 80 words. Return: { "title": "...", "body": "...", "topTags": ["tag1","tag2","tag3","tag4","tag5"] }

recommendSystemPrompt: You are a knowledgeable TV expert making personalised recommendations. Reference the user's actual picks. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
recommendUserPrompt: The user likes: {names}. Their top taste tags: {topTags}. Recommend 4 shows from this list: {database}. Return: { "recommendations": [ { "name": "...", "reason": "1-2 sentences", "tags": ["tag1","tag2","tag3"], "match": 85 } ] }

addItemSystemPrompt: You are a TV expert tagging a show's style. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON: { "bio": "1 sentence", "tags": ["tag1",...] }. Only use tags from the provided vocabulary.
addItemUserPrompt: Analyse the style of the show: {name}. Available tags: {tags}. Return bio and 4-6 tags.

themeHue: 210
accent: #2EC5FF
accent2: #FF6FA5

filters:
  - label: Genre
    field: genre
    options:
      - label: Comedy | value: comedy
      - label: Drama | value: drama
      - label: Crime | value: crime
      - label: Sci-fi | value: sci-fi
      - label: Fantasy | value: fantasy
      - label: Animation | value: animation
  - label: Era
    field: era
    options:
      - label: Contemporary | value: contemporary
      - label: Classic | value: classic
