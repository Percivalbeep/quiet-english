"""Render A with Samantha, B with Daniel, including a pause at each turn."""
import concurrent.futures,json,subprocess,tempfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
jobs=json.loads((root/'.work/conversation-jobs.json').read_text())
def generate(job):
 dest=root/job['path']
 if dest.exists() and dest.stat().st_size>1000:return
 with tempfile.TemporaryDirectory() as folder:
  files=[]
  for i,(speaker,text,translation) in enumerate(job['turns']):
   aiff=Path(folder)/f'{i}.aiff';wav=Path(folder)/f'{i}.wav';voice='Samantha' if speaker=='A' else 'Daniel'
   subprocess.run(['/usr/bin/say','-v',voice,'-r','145','-o',str(aiff),text],check=True)
   subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-y','-i',str(aiff),'-ar','24000','-ac','1','-af','apad=pad_dur=0.55',str(wav)],check=True)
   files.append(wav)
  listing=Path(folder)/'concat.txt';listing.write_text(''.join("file '"+str(p)+"'\n" for p in files))
  subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(listing),'-codec:a','libmp3lame','-b:a','64k',str(dest)],check=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for i,_ in enumerate(pool.map(generate,jobs),1):print(f'Conversation {i}/{len(jobs)}',flush=True)
# Replace only conversation references; vocabulary keeps the original system recordings.
path=root/'app/system-audio.js';manifest=json.loads(path.read_text().removeprefix('export const systemAudio=').strip().removesuffix(';'))
for job in jobs:manifest[job['text']]={'path':job['path'],'speakers':{'A':'Samantha','B':'Daniel'}}
path.write_text('export const systemAudio='+json.dumps(manifest,ensure_ascii=False)+';\n')
