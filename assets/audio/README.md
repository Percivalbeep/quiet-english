# Course speech

The current course uses the Qwen3-TTS-12Hz-1.7B-CustomVoice model, Aiden speaker,
run offline through the existing MLX 4-bit environment on the author's Mac.
No voice cloning, cloud TTS key or paid inference endpoint is used.

`qwen-provenance.json` maps each text to the generated MP3 and records voice,
model, duration and pitch-preserving beginner pacing. The browser also offers
an additional slower playback option. Old day-numbered m4a files are retained
for source history but are not selected by the updated course.

The model source and its Apache-2.0 license:
https://github.com/QwenLM/Qwen3-TTS

Regenerate with `scripts/make-qwen-audio.py` in the existing Qwen environment,
then run `scripts/pace-audio.py`. Model weights and intermediate recordings
stay outside the public website.
