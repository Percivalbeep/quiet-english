# Current course speech

The course player uses static MP3 files generated with installed macOS English voices.
Vocabulary, example sentences and expressions use Samantha. Full conversations use
Samantha for speaker A and Daniel for speaker B, with 0.55 seconds of padding after
each turn. These recordings do not require the learner device to have browser TTS voices.

`app/system-audio.js` maps all 399 course utterances to their recordings and records
conversation speaker assignments. All files are decoded before publication.
Personal words absent from the course library still use browser speech, with an
explicit timeout or failure message if that device cannot start speech.

Regeneration: run `node scripts/system-audio-jobs.mjs`, then
`python3 scripts/make-system-audio.py` and `python3 scripts/make-conversation-audio.py`
on a Mac with Samantha, Daniel, and ffmpeg installed. Intermediate jobs are ignored.

Older Qwen and day-numbered m4a assets are retained for history. They are not used
by the current player. Qwen sources: https://github.com/QwenLM/Qwen3-TTS
