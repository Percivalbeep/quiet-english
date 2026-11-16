import test from 'node:test';
import assert from 'node:assert/strict';
import {lessons,audioPath,reviewQuestions} from '../app/curriculum.js';
import {DAY,createEvent,isCorrect,LocalStore,SyncEngine,lessonStats,reviewState,mergeEvents} from '../app/core.js';
import {stat,readFile} from 'node:fs/promises';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
const event=(kind,payload={},lessonId='day-01',id=crypto.randomUUID(),now=new Date('2026-11-16T01:00:00Z'))=>createEvent({actorId:'learner',familyId:'family',lessonId,kind,payload,id,now});

test('normalization accepts case, curly apostrophes and terminal punctuation, not wrong words',()=>{
  assert.ok(isCorrect('  ANNA. ','Anna'));assert.ok(isCorrect('I’m Anna!',"I'm Anna"));assert.ok(!isCorrect('Annas','Anna'));
});
test('24 lessons have distinct question IDs, usable distractors and nonempty audio assets',async()=>{
  assert.equal(lessons.length,24);const ids=new Set();
  for(const l of lessons){assert.equal(l.questions.length,30);assert.equal(l.vocabulary.length,8);assert.equal(l.phrases.length,5);assert.equal(l.dialogue.length,6);assert.ok(l.reading.split(' ').length>=35);for(const q of l.questions){assert.ok(!ids.has(q.id));ids.add(q.id);if(q.options){assert.ok(q.options.includes(q.answer));assert.ok(new Set(q.options).size>=2);}if(q.type==='order')assert.deepEqual(q.tokens.slice().sort(),q.answer.split(' ').sort());}
    for(const text of [...l.phrases.map(p=>p.en),...l.vocabulary.map(w=>w.en),l.dialogueText]){assert.ok(audioPath(text),'Missing audio: '+text);const file=new URL('../'+audioPath(text),import.meta.url);assert.ok((await stat(file)).size>1000,file.pathname);}
    assert.ok(reviewQuestions(l).length<=10);assert.ok(reviewQuestions(l).every(q=>l.questions.some(original=>original.id===q.id)));
  }
});
test('retries preserve first result, latest performance and separate oral self-report',()=>{
  const l=lessons[0],q=l.questions[0];const events=[event('answer',{questionId:q.id,correct:false}),event('answer',{questionId:q.id,correct:true},l.id,undefined,new Date('2026-11-16T01:01:00Z'))];
  const s=lessonStats(l,events,'learner');assert.equal(s.answered,1);assert.equal(s.correct,1);assert.equal(s.firstCorrect,0);assert.equal(s.speaking,false);assert.equal(s.complete,false);
  assert.equal(lessonStats(l,[...events,event('speaking')],'learner').speaking,true);
  assert.equal(lessonStats(l,events,'someone-else').answered,0);
});
test('review is due after an interval; a missed review shortens subsequent spacing',()=>{
  const l=lessons[0],base=Date.parse('2026-11-16T01:00:00Z');const events=l.questions.map(q=>event('answer',{questionId:q.id,correct:true}));events.push(event('complete'));
  assert.equal(reviewState(l,events,'learner',base+DAY-1).overdue,false);
  assert.equal(reviewState(l,events,'learner',base+DAY).overdue,true);
  events.push(event('review',{passed:true},l.id,undefined,new Date(base+DAY)));
  assert.equal(reviewState(l,events,'learner').due,base+4*DAY);
  events.push(event('review',{passed:false},l.id,undefined,new Date(base+4*DAY)));
  assert.equal(reviewState(l,events,'learner').due,base+5*DAY);
});
test('curriculum expansion preserves completed lessons and their original review schedule',()=>{
  const l=lessons[0],original=l.questions.filter(q=>q.section==='基础表达');const old=original.map(q=>event('answer',{questionId:q.id,correct:true}));old.push(event('complete'));
  assert.equal(lessonStats(l,old,'learner').answered,5);assert.equal(lessonStats(l,old,'learner').legacyComplete,true);assert.equal(lessonStats(l,old,'learner').complete,true);assert.equal(lessonStats(l,old,'learner').currentContentComplete,false);
  const upgraded=[...old,...l.questions.filter(q=>!original.includes(q)).map(q=>event('answer',{questionId:q.id,correct:true}))];const now=new Date('2026-11-20T01:00:00Z');upgraded.push(event('complete',{curriculumVersion:2},l.id,undefined,now));
  assert.equal(reviewState(l,upgraded,'learner',now.getTime()).due,Date.parse(old.at(-1).created_at)+DAY);
});
test('short reviews rotate across every vocabulary item and prioritize a previous mistake',()=>{
  const l=lessons[0],covered=new Set();for(let round=0;round<4;round++)for(const q of reviewQuestions(l,{round}))if(q.wordId)covered.add(q.wordId);
  assert.equal(covered.size,l.vocabulary.length);
  const difficult=l.questions.find(q=>q.wordId===l.vocabulary.at(-1).id);
  assert.ok(reviewQuestions(l,{weakQuestionIds:[difficult.id]}).some(q=>q.id===difficult.id));
});
test('duplicate records are counted once and an acknowledged upload never removes a newly queued event',()=>{
  const store=new LocalStore(storage(),'test'),a=event('answer'),b=event('complete');store.append(a);store.append(a);assert.equal(store.read().events.length,1);store.append(b);store.reconcile([a],[a.id]);assert.deepEqual(store.read().outbox,[b.id]);assert.equal(mergeEvents([a],[a]).length,1);
});
test('failed local write is visible and not reported as saved',()=>{
  const store=new LocalStore({getItem:()=>null,setItem:()=>{throw Error('QuotaExceeded')}},'test');assert.throws(()=>store.append(event('answer')),/尚未保存/);
});
test('a failed upload survives reload and is retried exactly once by UUID',async()=>{
  const disk=storage(),store=new LocalStore(disk,'student'),e=event('answer');store.append(e);let offline=true;const remote=new Map();let status;
  const cloud={pushEvents:async rows=>{if(offline)throw Error('offline');for(const r of rows)remote.set(r.id,r)},pullEvents:async()=>[...remote.values()]};
  const engine=new SyncEngine({store,cloud,onState:s=>status=s});await engine.sync(true);assert.equal(status.status,'error');assert.deepEqual(store.read().outbox,[e.id]);
  offline=false;const restarted=new SyncEngine({store:new LocalStore(disk,'student'),cloud});await restarted.sync(true);await restarted.sync(true);assert.equal(remote.size,1);assert.equal(store.read().outbox.length,0);
});
test('overlapping sync calls share one request and hidden pages skip scheduled polls',async()=>{
  let pulls=0,release;const gate=new Promise(r=>release=r);const engine=new SyncEngine({store:new LocalStore(storage(),'test'),cloud:{pushEvents:async()=>{},pullEvents:async()=>{pulls++;await gate;return []}},isVisible:()=>false});
  await engine.sync();assert.equal(pulls,0);const a=engine.sync(true),b=engine.sync(true);assert.equal(a,b);release();await a;assert.equal(pulls,1);
});
test('two independent device stores converge without overwriting each other',async()=>{
  const remote=new Map(),cloud={pushEvents:async es=>es.forEach(e=>remote.set(e.id,e)),pullEvents:async()=>[...remote.values()]};
  const a=new LocalStore(storage(),'device-A'),b=new LocalStore(storage(),'device-B');a.append(event('answer',{questionId:'a',correct:true}));b.append(event('answer',{questionId:'b',correct:false}));const sa=new SyncEngine({store:a,cloud}),sb=new SyncEngine({store:b,cloud});await Promise.all([sa.sync(true),sb.sync(true)]);await sa.sync(true);await sb.sync(true);assert.equal(a.read().events.length,2);assert.deepEqual(a.read(),b.read());
});
test('SQL declares family RLS, immutable event grants and role-limited writes',async()=>{
  const sql=await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8');assert.match(sql,/qe_events enable row level security/);assert.match(sql,/actor_id=\(select auth.uid\(\)\)/);assert.match(sql,/grant select, insert on public.qe_events/);assert.doesNotMatch(sql,/grant[^;]*(update|delete)[^;]*to authenticated/i);
});

test('three completed lessons remain completed on another device after question IDs and version change',async()=>{
 const remote=new Map(),cloud={pushEvents:async rows=>rows.forEach(e=>remote.set(e.id,e)),pullEvents:async()=>[...remote.values()]};const a=new LocalStore(storage(),'a'),b=new LocalStore(storage(),'b');
 for(const lesson of lessons.slice(0,3)){for(let i=0;i<5;i++)a.append(event('answer',{questionId:lesson.id+'-old-'+i,correct:true},lesson.id));a.append(event('complete',{curriculumVersion:1},lesson.id));}
 await new SyncEngine({store:a,cloud}).sync(true);await new SyncEngine({store:b,cloud}).sync(true);
 assert.deepEqual(a.read().events,b.read().events);
 for(const lesson of lessons.slice(0,3)){const upgraded={...lesson,version:99,questions:lesson.questions.map(q=>({...q,id:q.id+'-new'}))};const stats=lessonStats(upgraded,b.read().events,'learner');assert.equal(stats.complete,true);assert.equal(stats.historicalAnswered,5);assert.equal(stats.historicalFirstCorrect,5);assert.equal(stats.answered,0);assert.ok(reviewState(upgraded,b.read().events,'learner'));}
 assert.equal(lessonStats(lessons[3],b.read().events,'learner').complete,false);
});

test('manual and startup synchronization request a full reconciliation, including late commits',async()=>{
 const flags=[];const engine=new SyncEngine({store:new LocalStore(storage(),'full'),cloud:{pushEvents:async()=>{},pullEvents:async options=>{flags.push(options.full);return []}}});await engine.sync(true);await engine.sync();assert.deepEqual(flags,[true,false]);
});
