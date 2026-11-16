import test from 'node:test';
import assert from 'node:assert/strict';
import {LearningDialog} from '../app/learning.js';
test('playing a word preserves the renderer so changing study tabs still works',async()=>{
  const previous={speechSynthesis:globalThis.speechSynthesis,SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance};let spoken,canceled=0;
  globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};globalThis.speechSynthesis={getVoices:()=>[{lang:'zh-CN'},{lang:'en-US',localService:true}],speak:u=>{spoken=u},cancel:()=>{canceled++}};
  try{
    const dialog=new LearningDialog({dialog:{addEventListener(){},querySelector(){return null}},toast:message=>assert.fail(message)});
    const button={textContent:'听一听',isConnected:true};
    await dialog.playSpeech('hello',button);
    assert.equal(typeof dialog.audioButton,'function');assert.match(dialog.audioButton('hello'),/data-audio/);
    assert.equal(spoken.text,'hello');assert.equal(spoken.lang,'en-US');assert.equal(spoken.voice.localService,true);dialog.stopAudio();assert.equal(canceled,1);assert.equal(button.textContent,'听一听');assert.equal(typeof dialog.audioButton,'function');
  }finally{Object.assign(globalThis,previous);}
});

test('course words play static system recordings without browser speech support and stop when navigating',async()=>{
 const previous=globalThis.Audio;let played;
 globalThis.Audio=class{constructor(path){this.src=path;this.paused=true;played=this}async play(){this.paused=false}pause(){this.paused=true}};
 try{const d=new LearningDialog({dialog:{addEventListener(){},querySelector(){return null}},toast:message=>assert.fail(message)}),b={textContent:'发音',isConnected:true};await d.play('water',b);assert.match(played.src,/assets\/audio\/system-.*\.mp3$/);assert.equal(played.paused,false);assert.equal(b.textContent,'正在播放…');d.stopAudio();assert.equal(played.paused,true);assert.equal(b.textContent,'发音');assert.equal(typeof d.audioButton,'function');}finally{globalThis.Audio=previous;}
});
test('a failed recording restores the button and reports the failure instead of silently hanging',async()=>{
 const previous=globalThis.Audio;let notice='';globalThis.Audio=class{async play(){throw new Error('not allowed')}pause(){}};
 try{const d=new LearningDialog({dialog:{addEventListener(){},querySelector(){return null}},toast:m=>{notice=m}}),b={textContent:'发音',isConnected:true};await d.play('water',b);assert.equal(b.textContent,'发音');assert.match(notice,/音频/);assert.equal(d.audio,null);}finally{globalThis.Audio=previous;}
});

test('every course utterance has a static recording and each full dialogue uses two system speakers',async()=>{
 const {lessons}=await import('../app/curriculum.js'),{systemAudio}=await import('../app/system-audio.js');const {stat}=await import('node:fs/promises');
 for(const l of lessons){for(const text of [...l.vocabulary.flatMap(w=>[w.en,w.example]),...l.phrases.map(p=>p.en),l.dialogueText]){assert.ok(systemAudio[text]?.path,text);assert.ok((await stat(new URL('../'+systemAudio[text].path,import.meta.url))).size>1000);}
 assert.deepEqual(systemAudio[l.dialogueText].speakers,{A:'Samantha',B:'Daniel'});}
});

test('an unresolved playback request times out even if Safari reports paused=false',async()=>{
 const previous={Audio:globalThis.Audio,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};let timeout,release,notice='';globalThis.setTimeout=fn=>{timeout=fn;return 1};globalThis.clearTimeout=()=>{};
 globalThis.Audio=class{constructor(){this.paused=false}play(){return new Promise(r=>{release=r})}pause(){this.paused=true}};
 try{const d=new LearningDialog({dialog:{addEventListener(){},querySelector(){return null}},toast:m=>{notice=m}}),button={textContent:'发音',isConnected:true};const pending=d.play('water',button);timeout();assert.equal(button.textContent,'发音');assert.ok(notice);release();await pending;assert.equal(d.audio,null);}finally{Object.assign(globalThis,previous);}
});
