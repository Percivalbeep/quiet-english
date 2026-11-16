import {lessons} from '../app/curriculum.js';
import {createHash} from 'node:crypto';
const texts=new Map();
for(const lesson of lessons){
  for(const phrase of lesson.phrases)texts.set(phrase.en,'phrase');
  for(const word of lesson.vocabulary)texts.set(word.en,'word');
  texts.set(lesson.dialogueText,'dialogue');
}
const jobs=[...texts].map(([text,kind])=>({text,kind,voice:'Aiden',path:`assets/audio/qwen-${createHash('sha256').update('qwen3-aiden-adult-v1:'+text).digest('hex').slice(0,16)}.mp3`}));
console.log(JSON.stringify(jobs));
