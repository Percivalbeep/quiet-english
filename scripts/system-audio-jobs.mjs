import {lessons} from '../app/curriculum.js';
import {writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';
mkdirSync('.work',{recursive:true});
const texts=[...new Set(lessons.flatMap(l=>[...l.vocabulary.flatMap(w=>[w.en,w.example]),...l.phrases.map(p=>p.en),l.dialogueText]))];
writeFileSync('.work/system-audio-jobs.json',JSON.stringify(texts.map(text=>({text,path:'assets/audio/system-'+createHash('sha256').update('samantha-v1:'+text).digest('hex').slice(0,16)+'.mp3'}))));
writeFileSync('.work/conversation-jobs.json',JSON.stringify(lessons.map(l=>({text:l.dialogueText,turns:l.dialogue,path:'assets/audio/conversation-'+createHash('sha256').update('samantha-daniel-v1:'+l.dialogueText).digest('hex').slice(0,16)+'.mp3'}))));
