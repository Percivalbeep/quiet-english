import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons} from '../app/curriculum.js';
import {LearningDialog} from '../app/learning.js';
import {stageQuestions,stageProgress,firstUnanswered} from '../app/practice.js';
import {createEvent,lessonStats,completionEvents,recommendedLesson,LocalStore,SyncEngine,mergeEvents} from '../app/core.js';
const disk=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
const lesson=lessons[3],user='invited-learner';
const answer=(q,l=lesson,actor=user)=>createEvent({actorId:actor,familyId:'f',lessonId:l.id,kind:'answer',payload:{questionId:q.id,correct:true,curriculumVersion:l.version}});
function harness(events=[]){
  const state={events};const handlers=new Map();
  const d=new LearningDialog({dialog:{addEventListener:(name,fn)=>handlers.set(name,fn),showModal(){},querySelector(){return null},scrollTop:0},getStats:l=>lessonStats(l,state.events,user),getUserId:()=>user,getEvents:()=>state.events,getRole:()=> 'learner',syncText:()=> '本机已保存 · 等待上传',onOpen(){},onClose(){},onComplete(){},hasCompletion:l=>state.events.some(e=>e.kind==='complete'&&e.lesson_id===l.id),save:(kind,lessonId,payload)=>{state.events.push(createEvent({actorId:user,familyId:'f',lessonId,kind,payload}));},toast:m=>assert.fail(m)});
  d.render=()=>{};return {d,state,handlers};
}
test('the reported fourth-lesson path preserves five reading answers and identifies the two missing stages',()=>{
  const questions=stageQuestions(lesson,2),events=questions.flatMap(q=>[answer(q),answer(q)]);
  const s=lessonStats(lesson,events,user);assert.equal(s.answered,5);assert.equal(s.complete,false);
  assert.deepEqual(stageProgress(lesson,s).map(s=>s.complete),[false,false,true]);
  const {d}=harness(events);d.open(lesson);assert.equal(d.run.tab,0);assert.match(d.studyView(),/开始生词练习/);assert.doesNotMatch(d.studyView(),/id="next-study"/);
  d.run.tab=2;d.startStage();assert.equal(d.run.phase,'summary');assert.equal(d.run.index,5);
  const summary=d.summaryView();assert.match(summary,/整课还有练习/);assert.match(summary,/已做的题目无需重做/);assert.match(summary,/继续尚未完成的部分/);assert.doesNotMatch(summary,/本课已完成，进步已保存/);
});
test('a complete stage does not restart at zero, while a stage with holes resumes its first missing question',()=>{
  const questions=stageQuestions(lesson,0),events=questions.filter((q,i)=>i!==3).map(q=>answer(q));
  const {d,state}=harness(events);d.open(lesson);d.startStage();assert.equal(d.run.index,3);
  state.events.push(answer(questions[3]));d.startStage();assert.equal(d.run.index,questions.length);assert.equal(d.run.phase,'summary');
  assert.equal(firstUnanswered(questions,lessonStats(lesson,state.events,user)),questions.length);
});
test('a paused submitted question or remote completion never overrides newer persisted progress',()=>{
  const {d,state}=harness();d.open(lesson);d.startStage();const old={...d.run};
  state.events.push(answer(old.questions[0]));d.paused=old;d.open(lesson);assert.equal(d.run.index,1);assert.notEqual(d.run.questions[d.run.index].id,old.questions[0].id);
  state.events=lesson.questions.map(q=>answer(q));d.paused=old;d.open(lesson);assert.equal(d.run.phase,'study');assert.notEqual(d.run,old);
});
test('reopening a completed lesson directly in quiz mode shows a summary instead of an undefined question',()=>{
  const {d}=harness(lesson.questions.map(q=>answer(q)));d.open(lesson,false,'quiz');assert.equal(d.run.phase,'summary');assert.match(d.summaryView(),/本课已完成/);
});
test('the last answer and completion marker are durably stored together before clicking Next or closing',()=>{
  const store=new LocalStore(disk(),'u'),events=lesson.questions.slice(0,-1).map(q=>answer(q));store.appendMany(events);
  const last=answer(lesson.questions.at(-1)),merged=mergeEvents(events,[last]),stamps=completionEvents(lessons,merged,user,'f');
  assert.equal(stamps.length,1);store.appendMany([last,...stamps]);
  const reload=new LocalStore(store.storage,'u').read();assert.ok(lessonStats(lesson,reload.events,user).complete);assert.equal(reload.events.filter(e=>e.kind==='complete').length,1);assert.equal(reload.outbox.length,31);
  assert.deepEqual(completionEvents(lessons,reload.events,user,'f'),[]);
});
test('legacy full answer sets recover missing completion stamps, without awarding incomplete or optional work',()=>{
  const full=lesson.questions.map(q=>answer(q));const recovered=completionEvents(lessons,full,user,'f');assert.equal(recovered.length,1);assert.equal(recovered[0].created_at,full.at(-1).created_at);
  assert.deepEqual(completionEvents(lessons,full.slice(1),user,'f'),[]);
  assert.deepEqual(completionEvents(lessons,full.map(e=>({...e,kind:'review_answer'})),user,'f'),[]);
  assert.deepEqual(completionEvents(lessons,full,'original-learner','f'),[]);
});
test('storage exhaustion cannot persist only half of a final answer and completion pair',()=>{
  const memory=disk(),store=new LocalStore(memory,'u');store.appendMany(lesson.questions.slice(0,-1).map(q=>answer(q)));const before=memory.getItem('u');
  memory.setItem=()=>{throw Error('quota')};const last=answer(lesson.questions.at(-1));assert.throws(()=>store.appendMany([last,...completionEvents(lessons,mergeEvents(store.read().events,[last]),user,'f')]),/尚未保存/);assert.equal(memory.getItem('u'),before);
});
test('a completed teacher assignment cannot pin the homepage to that lesson; genuine incomplete assignments still apply',()=>{
  const events=lessons.slice(0,4).map(l=>createEvent({actorId:user,familyId:'f',lessonId:l.id,kind:'complete',payload:{curriculumVersion:1}}));
  assert.equal(recommendedLesson(lessons,events,user,{lesson_id:lesson.id}).id,'day-05');
  assert.equal(recommendedLesson(lessons,events,user,{lesson_id:'day-08'}).id,'day-08');
  assert.equal(recommendedLesson(lessons,events,'other',null).id,'day-01');
});
test('a final answer queued during an upload drains immediately, including a concurrent full reconciliation request',async()=>{
  const store=new LocalStore(disk(),'u'),remote=new Map();let release,entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r),flags=[];let calls=0;
  store.append(answer(lesson.questions[0]));
  const engine=new SyncEngine({store,cloud:{pushEvents:async rows=>{if(++calls===1){entered();await gate;}rows.forEach(e=>remote.set(e.id,e));},pullEvents:async({full})=>{flags.push(full);return [...remote.values()]}}});
  const running=engine.sync();await ready;const last=answer(lesson.questions.at(-1));store.append(last);assert.equal(engine.sync(true),running);release();await running;
  assert.equal(remote.size,2);assert.equal(store.read().outbox.length,0);assert.deepEqual(flags,[false,true]);
});
test('an upload accepted by the server with a lost response retries by UUID after reload without duplicating answers',async()=>{
  const memory=disk(),store=new LocalStore(memory,'u'),remote=new Map();store.appendMany(lesson.questions.map(q=>answer(q)));let lost=true;
  const cloud={pushEvents:async rows=>{rows.forEach(e=>remote.set(e.id,e));if(lost){lost=false;throw Error('lost response');}},pullEvents:async()=>[...remote.values()]};
  await new SyncEngine({store,cloud}).sync(true);assert.equal(store.read().outbox.length,30);
  await new SyncEngine({store:new LocalStore(memory,'u'),cloud}).sync(true);assert.equal(remote.size,30);assert.equal(store.read().outbox.length,0);
});
test('a partially successful multi-batch upload preserves only unacknowledged work for retry',async()=>{
  const store=new LocalStore(disk(),'u'),remote=new Map();const rows=Array.from({length:205},()=>answer(lesson.questions[0]));store.appendMany(rows);let calls=0,fail=true;
  const cloud={pushEvents:async batch=>{if(++calls===2&&fail)throw Error('offline');batch.forEach(e=>remote.set(e.id,e));},pullEvents:async()=>[...remote.values()]};
  await new SyncEngine({store,cloud}).sync(true);assert.equal(store.read().outbox.length,105);fail=false;
  await new SyncEngine({store,cloud}).sync(true);assert.equal(remote.size,205);assert.equal(store.read().events.length,205);assert.equal(store.read().outbox.length,0);
});
test('an account switch stops an in-flight sync from applying its late response',async()=>{
  const store=new LocalStore(disk(),'u');let release,entered,states=[];const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  const engine=new SyncEngine({store,onState:s=>states.push(s.status),cloud:{pushEvents:async()=>{},pullEvents:async()=>{entered();await gate;return [answer(lesson.questions[0])];}}});
  const running=engine.sync(true);await ready;engine.stop();release();await running;assert.deepEqual(states,['syncing']);assert.equal(store.read().events.length,0);
});
test('two invited-account devices finishing different stages converge to one completed lesson without cross-account leakage',async()=>{
  const remote=new Map(),cloud={pushEvents:async rows=>rows.forEach(e=>remote.set(e.id,e)),pullEvents:async()=>[...remote.values()]};
  const a=new LocalStore(disk(),'a'),b=new LocalStore(disk(),'b');a.appendMany(stageQuestions(lesson,0).map(q=>answer(q)));b.appendMany([...stageQuestions(lesson,1),...stageQuestions(lesson,2)].map(q=>answer(q)));
  const sa=new SyncEngine({store:a,cloud}),sb=new SyncEngine({store:b,cloud});await Promise.all([sa.sync(true),sb.sync(true)]);await sa.sync(true);
  a.appendMany(completionEvents(lessons,a.read().events,user,'f'));await sa.sync(true);await sb.sync(true);
  assert.ok(lessonStats(lesson,b.read().events,user).complete);assert.equal(b.read().events.filter(e=>e.kind==='complete').length,1);assert.equal(lessonStats(lesson,b.read().events,'original-learner').complete,false);
});
