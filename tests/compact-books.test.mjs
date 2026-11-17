import test from 'node:test';import assert from 'node:assert/strict';
import {isCorrect,createEvent,mergeEvents,LocalStore,SyncEngine} from '../app/core.js';import {mistakeItems} from '../app/practice.js';import {lessons} from '../app/curriculum.js';import {savedWords} from '../app/vocabulary.js';
const l=lessons[0],q=l.questions.find(q=>q.type==='order'),u='invited';
const ev=(payload,kind='review_answer',user=u)=>createEvent({actorId:user,familyId:'f',lessonId:l.id,kind,payload});
test('unambiguous contractions and full forms are equivalent, but grammar, spelling and negation remain required',()=>{
 for(const [a,b] of [["I'm Anna",'I am Anna'],["We're ready",'We are ready'],["I don't know",'I do not know'],["I can't go",'I cannot go'],['I can not go','I cannot go'],["I've arrived",'I have arrived'],["I’ll go",'I will go']]){assert.ok(isCorrect(a,b));assert.ok(isCorrect(b,a));}
 for(const [a,b] of [['I am go','I am going'],['I do know','I do not know'],['water','waiter'],['its','it is'],["John's bag",'John is bag'],['thirteen','thirty'],["I'm",'am']])assert.ok(!isCorrect(a,b),a);
 assert.ok(isCorrect('  I AM Anna! ',"I'm Anna"));
});
test('mistakes leave the active notebook on a correct retry, manual dismissal syncs, and a new mistake reopens the item',async()=>{
 const wrong=ev({questionId:q.id,answer:'wrong',correct:false,questionSnapshot:q},'answer');const dismiss=ev({activity:'dismiss_mistake',questionId:q.id});
 let events=[wrong,dismiss];assert.ok(mistakeItems(lessons,events,u)[0].dismissed);assert.equal(mistakeItems(lessons,events,'other').length,0);
 events.push(ev({activity:'restore_mistake',questionId:q.id}));assert.equal(mistakeItems(lessons,events,u)[0].dismissed,false);
 events.push(ev({questionId:q.id,answer:q.answer,correct:true,questionSnapshot:q}));assert.ok(mistakeItems(lessons,events,u)[0].corrected);
 events.push(ev({questionId:q.id,answer:'wrong again',correct:false,questionSnapshot:q}));const item=mistakeItems(lessons,events,u)[0];assert.equal(item.corrected,false);assert.equal(item.errors.length,2);
});
test('a historical contraction incorrectly marked wrong is no longer a pending mistake',()=>{
 const snap={...q,answer:"I'm Anna"};assert.deepEqual(mistakeItems(lessons,[ev({questionId:q.id,answer:'I am Anna',correct:false,questionSnapshot:snap})],u),[]);
});
test('saved vocabulary from both sources uses the same private stream and can be removed without touching original answers',()=>{
 const original=ev({questionId:q.id,answer:'x',correct:false},'answer');const events=[original,ev({activity:'saved_word',word:'water',meaning:'水',active:true,source:'vocabulary'}),ev({activity:'saved_word',word:'tomorrow',meaning:'明天',active:true,source:'reading'})];
 assert.equal(savedWords(events,u,l.id).length,2);events.push(ev({activity:'saved_word',word:'water',active:false}));assert.deepEqual(savedWords(events,u,l.id).map(w=>w.en),['tomorrow']);assert.ok(events.includes(original));assert.equal(savedWords(events,'other',l.id).length,0);
});
