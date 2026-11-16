import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons} from '../app/curriculum.js';
import {savedWords,dictationQuestions,readingMarkup} from '../app/vocabulary.js';
import {lessonStats} from '../app/core.js';
test('gaps teach reusable language rather than a Chinese city or personal name',()=>{
 const gap=lessons[0].questions.find(q=>q.id==='day-01-extra-gap-focus-1');assert.equal(gap.answer,'live');assert.equal(gap.template,'I ____ in Shanghai.');
 for(const l of lessons)for(const q of l.questions.filter(q=>q.id.includes('focus'))){assert.ok(q.template.includes('____'));assert.ok(!['Anna','Shanghai','China','Oxford','please'].includes(q.answer));}
});
test('saved reading words are scoped to user and lesson, deduplicated and removable without affecting lesson completion',()=>{
 const event=(word,active=true,actor='u',lesson='day-01')=>({actor_id:actor,lesson_id:lesson,kind:'review_answer',payload:{activity:'saved_word',word,meaning:'工作',active}});
 const events=[event('work'),event('Work'),event('name',true,'other'),event('ticket',true,'u','day-02')];assert.equal(savedWords(events,'u','day-01').length,1);assert.equal(lessonStats(lessons[0],events,'u').answered,0);
 events.push(event('work',false));assert.equal(savedWords(events,'u','day-01').length,0);
});
test('dictation covers every lesson word, merges saved words and hides the target until feedback',()=>{
 const l=lessons[0],qs=dictationQuestions(l,[...l.vocabulary,{id:'x',en:'hello'},{id:'y',en:'tomorrow',zh:'明天'}]);assert.equal(qs.length,9);assert.ok(qs.every(q=>q.type==='input'&&q.audioText===q.answer&&!q.template.includes(q.answer)));assert.match(readingMarkup('I work.'),/data-save-reading-word="work"/);assert.ok(!readingMarkup('<img>').includes('<img>'));
});

test('standalone dictation renders reading controls and does not emit lesson completion or interval review',async()=>{
 const {LearningDialog}=await import('../app/learning.js');const writes=[];
 const d=new LearningDialog({dialog:{addEventListener(){},scrollTop:0},getEvents:()=>[],getUserId:()=> 'u',getRole:()=> 'learner',syncText:()=>'',save:(...args)=>writes.push(args),onComplete(){}});
 d.run={lesson:lessons[0],tab:3};assert.match(d.studyView(),/save-reading-word/);d.render=()=>{};d.startDictation();assert.equal(d.run.questions.length,8);assert.match(d.quizView(),/data-audio/);d.finish();assert.equal(writes.length,0);assert.match(d.summaryView(),/单词听写/);
});
