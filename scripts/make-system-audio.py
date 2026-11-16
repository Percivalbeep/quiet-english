"""Create static English speech using the installed macOS Samantha voice."""
import concurrent.futures,json,subprocess,tempfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
jobs=json.loads((root/'.work/system-audio-jobs.json').read_text())
def generate(job):
 dest=root/job['path']
 if dest.exists() and dest.stat().st_size>1000:return
 with tempfile.TemporaryDirectory() as folder:
  wav=Path(folder)/'voice.aiff'
  subprocess.run(['/usr/bin/say','-v','Samantha','-r','145','-o',str(wav),job['text']],check=True)
  subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-y','-i',str(wav),'-af','apad=pad_dur=0.15','-codec:a','libmp3lame','-b:a','64k',str(dest)],check=True)
  if dest.stat().st_size<1000:raise RuntimeError('Empty speech: '+job['text'])
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for i,_ in enumerate(pool.map(generate,jobs),1):
  if i%50==0:print(f'Generated {i}/{len(jobs)}',flush=True)
manifest={j['text']:{'path':j['path']} for j in jobs}
(root/'app/system-audio.js').write_text('export const systemAudio='+json.dumps(manifest,ensure_ascii=False)+';\n')
print(f'Completed {len(jobs)} recordings',flush=True)
