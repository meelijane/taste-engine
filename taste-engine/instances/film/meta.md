# Meta

domain: film
itemLabel: director
itemLabelPlural: directors
headline: What kind of cinema do you actually like?
subheading: Pick the directors you love. Find out what that says about you.
minPicks: 5
addItemPlaceholder: e.g. Wong Kar-wai

profileSystemPrompt: You are a witty film critic writing a short personalised taste profile. Be specific and avoid clichés. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
profileUserPrompt: The user likes these directors: {names}. Their most common style tags are: {topTags}. Write their film taste profile. Title should be an archetype (e.g. "The Formalist Romantic"). Body: 2 short paragraphs, max 80 words. Return: { "title": "...", "body": "...", "topTags": ["tag1","tag2","tag3","tag4","tag5"] }

recommendSystemPrompt: You are a knowledgeable film expert making personalised recommendations. Reference the user's actual picks. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON.
recommendUserPrompt: The user likes: {names}. Their top taste tags: {topTags}. Recommend 4 directors from this list: {database}. Return: { "recommendations": [ { "name": "...", "reason": "1-2 sentences", "tags": ["tag1","tag2","tag3"], "match": 85 } ] }

addItemSystemPrompt: You are a film expert tagging a director's style. Write like a sharp human, not a content mill: no em dashes, no clichés, no AI filler words (delve, tapestry, landscape, realm, robust, seamless, testament to, vibrant), and no it-is-not-X-it-is-Y constructions. Vary sentence length and stay concrete. Respond ONLY with JSON: { "bio": "1 sentence", "tags": ["tag1",...] }. Only use tags from the provided vocabulary.
addItemUserPrompt: Analyse the directorial style of: {name}. Available tags: {tags}. Return bio and 4-6 tags.

themeHue: 352
accent: #FF4D58
accent2: #FFC94D

filters:
  - label: Region
    field: region
    options:
      - label: US | value: US
      - label: UK | value: GB
      - label: France | value: FR
      - label: Japan | value: JP
      - label: Korea | value: KR
      - label: Hong Kong | value: HK
      - label: Canada | value: CA
  - label: Era
    field: era
    options:
      - label: Contemporary | value: contemporary
      - label: Classic | value: classic
