"""Offline batch authoring with an already installed Qwen3-TTS MLX model.
The model is loaded once. Public output contains speech and provenance, no keys.
"""
import argparse, json, os, subprocess, sys, time, tempfile
from pathlib import Path
os.environ['HF_HUB_OFFLINE']='1'
os.environ['HF_HUB_DISABLE_IMPLICIT_TOKEN']='1'
os.environ['TOKENIZERS_PARALLELISM']='false'
parser=argparse.ArgumentParser()
parser.add_argument('--model',required=True)
parser.add_argument('--limit',type=int,default=0)
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
jobs=json.loads(subprocess.check_output(['node',str(root/'scripts/qwen-audio-jobs.mjs')],text=True))
if args.limit: jobs=jobs[:args.limit]
import numpy as np
import soundfile as sf
import mlx.core as mx
from mlx_audio.tts.utils import load_model
model=load_model(args.model)
manifest_path=root/'assets/audio/qwen-provenance.json'
manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
started=time.time()
for index,job in enumerate(jobs):
    out=root/job['path']
    repair=job['kind']=='word' and manifest.get(job['text'],{}).get('seconds',0)>2 and len(job['text'].split())==1
    if out.exists() and out.stat().st_size>1500 and job['text'] in manifest and not repair:
        continue
    instruction=('Say this English word or short word group once, as a clear pronunciation example. Do not spell it or add explanations.' if job['kind']=='word' else
      'Speak this short everyday conversation in clear, warm, natural American English. Leave a brief natural pause between turns. Do not add an introduction.' if job['kind']=='dialogue' else
      'Speak naturally and warmly in clear American English, like a patient adult language tutor. Use conversational intonation, a comfortable slightly slower pace, and clear word endings. Do not add any words.')
    max_tokens=min(1500,max(140,len(job['text'].split())*24+90))
    for attempt in range(2):
        mx.random.seed(42+attempt)
        pieces=[]; sr=24000; tokens=0
        for result in model.generate_custom_voice(text=job['text'],language='English',speaker='Aiden',instruct=instruction,max_tokens=max_tokens,verbose=False):
            pieces.append(np.asarray(result.audio));sr=result.sample_rate;tokens=getattr(result,'token_count',0)
        audio=np.concatenate(pieces) if pieces else np.array([])
        if len(audio)>sr*.2 and np.isfinite(audio).all() and tokens<max_tokens and not(job['kind']=='word' and len(job['text'].split())==1 and len(audio)>sr*2.0):
            break
    else: raise RuntimeError('Invalid or truncated Qwen audio: '+job['text'])
    active=np.flatnonzero(np.abs(audio)>=max(.0005,float(np.max(np.abs(audio)))*.005))
    if not len(active): raise RuntimeError('Silent Qwen audio: '+job['text'])
    margin=int(sr*.06);audio=audio[max(0,active[0]-margin):min(len(audio),active[-1]+margin+1)]
    out.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='quiet-qwen-') as tmp:
        wav=Path(tmp)/'speech.wav';sf.write(wav,audio,sr)
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','4',str(out)],check=True)
    manifest[job['text']]={**job,'engine':'Qwen3-TTS-12Hz-1.7B-CustomVoice','quantization':'MLX 4-bit','seconds':round(len(audio)/sr,3)}
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    (root/'app/audio-manifest.js').write_text('export const audioManifest = '+json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+';\n')
    print(json.dumps({'done':index+1,'total':len(jobs),'seconds':round(len(audio)/sr,2),'elapsed':round(time.time()-started),'text':job['text'][:55]},ensure_ascii=False),flush=True)
    mx.clear_cache()
print('Qwen audio batch complete.',flush=True)
