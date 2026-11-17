import {lessons} from '../app/curriculum.js';import {writeFileSync,mkdirSync} from 'node:fs';import {createHash} from 'node:crypto';
const jobs=new Map(),aliases={};
function add(text,dialogue){const key=text.trim().toLowerCase(),id=createHash('sha256').update('fish-s21-speed08-v1:'+key).digest('hex').slice(0,20);if(!jobs.has(key))jobs.set(key,{text,dialogue,path:'assets/audio/fish08-'+id+'.mp3'});aliases[text]=key;}
for(const l of lessons){for(const w of l.vocabulary){add(w.en);add(w.example);}for(const p of l.phrases)add(p.en);add(l.reading);for(const word of l.reading.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[’'-][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g))add(word);add(l.dialogueText,l.dialogue);}
mkdirSync('.work',{recursive:true});writeFileSync('.work/fish-course-jobs.json',JSON.stringify({jobs:[...jobs.values()],aliases}));console.log('Unique recordings:',jobs.size,'Text bytes:',[...jobs.values()].reduce((n,j)=>n+Buffer.byteLength(j.text),0));
