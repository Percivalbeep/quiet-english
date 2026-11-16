import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudClient} from '../app/cloud.js';
import {LocalStore,SyncEngine,createEvent} from '../app/core.js';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
test('browser-native fetch receives the global receiver, not the CloudClient instance',async()=>{
  let called=false;
  function browserFetch(){assert.equal(this,globalThis);called=true;return Promise.resolve(new Response('{}',{headers:{'content-type':'application/json'}}));}
  const cloud=new CloudClient({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},memory(),browserFetch);
  await cloud.request('/auth/v1/health');assert.equal(called,true);
});
// An API-contract fixture, not a substitute for checking deployed Supabase RLS.
function service(){
  const rows=[],tokens=new Map();let seq=0,refreshes=0;
  const members=[{user_id:'student',family_id:'family',role:'learner'},{user_id:'teacher',family_id:'family',role:'teacher'}];
  const reply=(data,status=200)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
  const fetcher=async(url,opts={})=>{
    const u=new URL(url),body=opts.body?JSON.parse(opts.body):null;
    if(u.pathname==='/auth/v1/token'){
      if(u.searchParams.get('grant_type')==='refresh_token')refreshes++;
      const id=body.email==='teacher@test.local'||body.refresh_token==='refresh-teacher'?'teacher':'student';
      const token=`token-${id}-${refreshes}`;tokens.set(token,id);
      return reply({access_token:token,refresh_token:`refresh-${id}`,expires_in:3600,user:{id}});
    }
    const id=tokens.get(opts.headers.Authorization?.slice(7));if(!id)return reply({message:'unauthorized'},401);
    if(u.pathname==='/rest/v1/qe_members')return reply(members);
    if(opts.method==='POST'){
      for(const row of body){if(row.actor_id!==id||row.family_id!=='family')return reply({message:'RLS'},403);if(!rows.some(r=>r.id===row.id))rows.push({...row,seq:++seq});}return reply(null,204);
    }
    const cursor=Number(u.searchParams.get('seq')?.replace('gt.','')||0);return reply(rows.filter(r=>r.seq>cursor).slice(0,500));
  };
  return {fetcher,rows,get refreshes(){return refreshes}};
}
test('two logged-in accounts exchange student progress and teacher assignment through the API adapter',async()=>{
  const api=service(),config={supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'};
  const studentDisk=memory(),teacherDisk=memory();const student=new CloudClient(config,studentDisk,api.fetcher),teacher=new CloudClient(config,teacherDisk,api.fetcher);
  await student.signIn('student@test.local','test-only');await teacher.signIn('teacher@test.local','test-only');
  assert.equal((await student.membership()).own.role,'learner');assert.equal((await teacher.membership()).own.role,'teacher');
  const ss=new LocalStore(studentDisk,'s'),ts=new LocalStore(teacherDisk,'t');
  const answer=createEvent({actorId:'student',familyId:'family',lessonId:'day-01',kind:'answer',payload:{correct:true}});ss.append(answer);
  const se=new SyncEngine({store:ss,cloud:student}),te=new SyncEngine({store:ts,cloud:teacher});await se.sync(true);await te.sync(true);assert.equal(ts.read().events[0].id,answer.id);
  const assignment=createEvent({actorId:'teacher',familyId:'family',lessonId:'day-02',kind:'assignment',payload:{targetId:'student',date:'2026-11-17'}});ts.append(assignment);await te.sync(true);await se.sync(true);assert.equal(ss.read().events.length,2);
  await student.pushEvents([answer]);assert.equal(api.rows.length,2);
});
test('expired tokens refresh once for concurrent requests and survive reload',async()=>{
  const api=service(),disk=memory(),config={supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'};const cloud=new CloudClient(config,disk,api.fetcher);await cloud.signIn('student@test.local','test-only');disk.setItem(cloud.sessionKey,JSON.stringify({...cloud.session,expires_at:0}));await Promise.all([cloud.token(),cloud.token()]);assert.equal(api.refreshes,1);const reload=new CloudClient(config,disk,api.fetcher);assert.equal(await reload.token(),cloud.session.access_token);
});
test('remote cursor only commits after successful local reconciliation',async()=>{
  const api=service(),disk=memory(),cloud=new CloudClient({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},disk,api.fetcher);await cloud.signIn('student@test.local','test-only');await cloud.pushEvents([createEvent({actorId:'student',familyId:'family',lessonId:'day-01',kind:'complete'})]);assert.equal((await cloud.pullEvents()).length,1);assert.equal(cloud.cursor,0);cloud.commitCursor();assert.equal(cloud.cursor,1);assert.equal((await cloud.pullEvents()).length,0);
});
