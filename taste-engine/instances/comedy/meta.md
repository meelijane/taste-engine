# Meta

domain: comedy
itemLabel: comedian
itemLabelPlural: comedians
headline: What kind of funny do you actually like?
subheading: Pick the comedians you love. Find out what that says about you.
minPicks: 5
addItemPlaceholder: e.g. Dylan Moran
addItemPrompt: You are a comedy expert tagging a comedian's style. Respond ONLY with JSON.

profileSystemPrompt: You are a witty, warm comedy critic writing a short personalised taste profile. Be specific, insightful, and avoid clichés. Write like a smart friend, not a press release. Respond ONLY with JSON.
profileUserPrompt: The user likes these comedians: {names}. Their most common style tags are: {topTags}. Write their comedy taste profile. The title should be like a horoscope archetype (e.g. "The Thoughtful Provocateur", "The Warm Absurdist"). Body should be 2 short paragraphs, max 80 words total, feeling personal and specific to their actual picks. Return: { "title": "...", "body": "...", "topTags": ["tag1","tag2","tag3","tag4","tag5"] }

recommendSystemPrompt: You are a knowledgeable comedy expert making personalised recommendations. Be specific about WHY each comedian matches, referencing the user's actual picks. Respond ONLY with JSON.
recommendUserPrompt: The user likes: {names}. Their top taste tags: {topTags}. Recommend 4 comedians from this list they'll love: {database}. Return: { "recommendations": [ { "name": "...", "reason": "1-2 sentences max", "tags": ["tag1","tag2","tag3"], "match": 85 } ] }

addItemSystemPrompt: You are a comedy expert tagging a comedian's style. Respond ONLY with JSON: { "bio": "1 sentence describing their style", "tags": ["tag1",...] }. Tags must only come from the provided vocabulary.
addItemUserPrompt: Analyse the comedic style of: {name}. Available tags: {tags}. Return bio and 4-6 tags.

themeHue: 25
accent: #FF8A33
accent2: #36D6C3

filters:
  - label: Country
    field: country
    options:
      - label: 🇦🇺 Australian | value: AU
      - label: 🇳🇿 New Zealand | value: NZ
      - label: 🇬🇧 British | value: GB
      - label: 🇮🇪 Irish | value: IE
      - label: 🇺🇸 American | value: US
      - label: 🇨🇦 Canadian | value: CA
      - label: 🇿🇦 South African | value: ZA
  - label: Format
    field: format
    options:
      - label: Stand-up | value: stand-up
      - label: Sketch | value: sketch
      - label: Improv | value: improv
      - label: Character | value: character
      - label: Musical | value: musical
      - label: Panel | value: panel
  - label: Era
    field: era
    options:
      - label: Contemporary | value: contemporary
      - label: Classic | value: classic
