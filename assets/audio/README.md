# Current course audio

Course playback uses pre-generated Fish Audio S2.1 Pro Free MP3 recordings,
with prosody.speed=0.8 in every synthesis request. Vocabulary, examples and
reading use the approved trial voice; dialogues use separate A/B reference voices.
`app/fish-audio.js` records paths, engine, speed and dialogue speaker IDs.
All files must pass decoding before the manifest is emitted. Keys are never part
of the app, manifest, scripts, repository or published site.

Generation: `node scripts/fish-course-jobs.mjs`, then provide FISH_KEY_FILE to
`scripts/generate-fish-course.py`. It uses only the explicitly named free model,
retries rate limits and can resume existing recordings.

Old system/Qwen files are retained for history but are not selected by the current
course player. User-created words outside the full course library still use device
speech, since no private API key is exposed to the browser.
