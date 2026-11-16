"""macOS-only authoring utility. Generated m4a assets are committed for all clients."""
import json
import subprocess
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
module = (root / 'app/curriculum.js').as_uri()
code = f"const {{lessons}}=await import({json.dumps(module)}); console.log(JSON.stringify(lessons.map(l=>({{id:l.id,phrases:l.phrases}}))))"
lessons = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', code], text=True))
with tempfile.TemporaryDirectory(prefix='quiet-english-audio-') as tmp:
    for lesson in lessons:
        for i, phrase in enumerate(lesson['phrases'], start=1):
            destination = root / 'assets/audio' / f"{lesson['id']}-{i}.m4a"
            if destination.exists() and destination.stat().st_size > 1000:
                continue
            intermediate = Path(tmp) / 'line.aiff'
            subprocess.run(['/usr/bin/say', '-v', 'Samantha', '-r', '145', '-o', str(intermediate), phrase['en']], check=True)
            subprocess.run(['/opt/homebrew/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(intermediate), '-c:a', 'aac', '-b:a', '64k', str(destination)], check=True)
            if destination.stat().st_size < 1000:
                raise RuntimeError('Speech synthesis produced no audio. Run with access to the macOS voice service.')
    print(f"Prepared {len(lessons)*3} short English audio files.")
