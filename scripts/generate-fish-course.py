"""Offline authoring only. FISH_KEY_FILE points to a private local key file."""
import os,pathlib,re,json,urllib.request,urllib.error,concurrent.futures,subprocess,time,random,threading
root=pathlib.Path(__file__).resolve().parent.parent
key_source=pathlib.Path(os.environ['FISH_KEY_FILE']).read_text();match=re.search(r'sk-fish-[A-Za-z0-9_-]+',key_source)
if not match:raise SystemExit('No valid Fish key found')
key=match.group(0);model='s2.1-pro-free';voices={'A':'9a9cf47702da476aa4629e2506d4a857','B':'802e3bc2b27e49c2995d23ef70e6ac89'}
data=json.loads((root/'.work/fish-course-jobs.json').read_text());jobs=data['jobs'];count=0;lock=threading.Lock()
def generate(job):
 global count
 dest=root/job['path']
 if not(dest.exists() and dest.stat().st_size>1000):
  dialogue=job.get('dialogue');text=job['text'];reference=voices['A']
  if dialogue:
   reference=[voices['A'],voices['B']];text=''.join('<|speaker:'+str(0 if row[0]=='A' else 1)+'|>'+row[1] for row in dialogue)
  payload={'text':text,'reference_id':reference,'format':'mp3','mp3_bitrate':128,'temperature':.5,'top_p':.7,'prosody':{'speed':.8},'language':'en'}
  for attempt in range(6):
   try:
    request=urllib.request.Request('https://api.fish.audio/v1/tts',data=json.dumps(payload).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json','model':model},method='POST')
    with urllib.request.urlopen(request,timeout=180) as response:audio=response.read()
    temp=dest.with_suffix('.tmp.mp3');temp.write_bytes(audio)
    result=subprocess.run(['/opt/homebrew/bin/ffmpeg','-v','error','-i',str(temp),'-f','null','-'],capture_output=True)
    if result.returncode or len(audio)<1000:temp.unlink(missing_ok=True);raise ValueError('Invalid audio')
    temp.replace(dest);break
   except urllib.error.HTTPError as error:
    if error.code not in (429,500,502,503,504):raise RuntimeError('Fish API HTTP '+str(error.code)) from None
    time.sleep(min(60,5*2**attempt)+random.random())
   except Exception as error:
    if attempt==5:raise RuntimeError('Fish generation failed: '+type(error).__name__) from None
    time.sleep(5+attempt*3)
  else:raise RuntimeError('Fish retries exhausted')
 with lock:
  count+=1
  if count%25==0 or count==len(jobs):print(f'Validated {count}/{len(jobs)}',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(generate,jobs))
bykey={j['text'].strip().lower():j for j in jobs};manifest={}
for text,keytext in data['aliases'].items():
 job=bykey[keytext];entry={'path':job['path'],'engine':'Fish Audio','model':model,'speed':.8}
 if job.get('dialogue'):entry['speakers']=voices
 manifest[text]=entry
(root/'app/fish-audio.js').write_text('export const fishAudio='+json.dumps(manifest,ensure_ascii=False)+';\n')
print('Fish manifest ready',flush=True)
