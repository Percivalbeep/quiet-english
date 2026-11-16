"""Pitch-preserving pacing for adult beginner practice; retains originals locally."""
from pathlib import Path
import json,re,shutil,subprocess,tempfile
root=Path(__file__).resolve().parent.parent
manifest_path=root/'assets/audio/qwen-provenance.json'
data=json.loads(manifest_path.read_text())
originals=root/'.work/qwen-originals';originals.mkdir(parents=True,exist_ok=True)
for text,item in data.items():
    if item.get('pacing')=='beginner-v1':continue
    out=root/item['path'];original=originals/out.name
    if not original.exists():shutil.copyfile(out,original)
    words=len(re.findall(r"[A-Za-z]+(?:['’][A-Za-z]+)?",text))
    tempo=1.0 if item['kind']=='word' else min(1.0,max(.75,item['seconds']/(words/2.65)))
    filters=f'atempo={tempo:.4f},adelay=80,apad=pad_dur=0.12'
    with tempfile.TemporaryDirectory(prefix='quiet-pace-') as tmp:
        wav=Path(tmp)/'paced.wav';encoded=Path(tmp)/'paced.mp3'
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(original),'-af',filters,'-codec:a','pcm_s16le',str(wav)],check=True)
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','4',str(encoded)],check=True)
        shutil.copyfile(encoded,out)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(out)],text=True))
    item['seconds']=round(float(probe['format']['duration']),3);item['pacing']='beginner-v1';item['tempo']=round(tempo,4)
manifest_path.write_text(json.dumps(data,ensure_ascii=False,indent=2))
(root/'app/audio-manifest.js').write_text('export const audioManifest = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
print(f'Paced {len(data)} Qwen clips, preserving voice pitch. Originals retained in ignored .work/.')
