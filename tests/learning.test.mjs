import test from 'node:test';
import assert from 'node:assert/strict';
import {LearningDialog} from '../app/learning.js';
test('playing a word preserves the renderer so changing study tabs still works',async()=>{
  const previous=globalThis.Audio;
  globalThis.Audio=class {async play(){}pause(){this.paused=true}};
  try{
    const dialog=new LearningDialog({dialog:{addEventListener(){},querySelector(){return null}},toast:message=>assert.fail(message)});
    const button={textContent:'听一听',isConnected:true};
    await dialog.play('hello',button);
    assert.equal(typeof dialog.audioButton,'function');assert.match(dialog.audioButton('hello'),/data-audio/);
    dialog.stopAudio();assert.equal(button.textContent,'听一听');assert.equal(typeof dialog.audioButton,'function');
  }finally{globalThis.Audio=previous;}
});
