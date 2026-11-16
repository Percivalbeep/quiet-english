import test from 'node:test';
import assert from 'node:assert/strict';
import {LearningDialog} from '../app/learning.js';
test('playing a word preserves the renderer so changing study tabs still works',async()=>{
  const previous={speechSynthesis:globalThis.speechSynthesis,SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance};let spoken,canceled=0;
  globalThis.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};globalThis.speechSynthesis={getVoices:()=>[{lang:'zh-CN'},{lang:'en-US',localService:true}],speak:u=>{spoken=u},cancel:()=>{canceled++}};
  try{
    const dialog=new LearningDialog({dialog:{addEventListener(){},querySelector(){return null}},toast:message=>assert.fail(message)});
    const button={textContent:'听一听',isConnected:true};
    await dialog.play('hello',button);
    assert.equal(typeof dialog.audioButton,'function');assert.match(dialog.audioButton('hello'),/data-audio/);
    assert.equal(spoken.text,'hello');assert.equal(spoken.lang,'en-US');assert.equal(spoken.voice.localService,true);dialog.stopAudio();assert.equal(canceled,1);assert.equal(button.textContent,'听一听');assert.equal(typeof dialog.audioButton,'function');
  }finally{Object.assign(globalThis,previous);}
});
