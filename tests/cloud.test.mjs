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
test('self-registration sends only profile metadata and keeps an immediate session',async()=>{
  const disk=memory();let sent;
  const fetcher=async(url,options)=>{sent={url,body:JSON.parse(options.body)};return new Response(JSON.stringify({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'new-learner'}}));};
  const cloud=new CloudClient({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},disk,fetcher);
  const result=await cloud.signUp('learner@example.test','test-only-password','Learner','https://example.test/?invite=abc');
  assert.equal(result.needsConfirmation,false);assert.equal(cloud.session.user.id,'new-learner');assert.equal(sent.body.data.display_name,'Learner');assert.equal(sent.body.data.role,undefined);assert.match(sent.url,/signup\?redirect_to=/);
});
test('confirmation-required signup never pretends to be logged in',async()=>{
  const cloud=new CloudClient({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},memory(),async()=>new Response(JSON.stringify({id:'new-learner'})));
  assert.equal((await cloud.signUp('learner@example.test','test-only-password','Learner','https://example.test')).needsConfirmation,true);assert.equal(cloud.session,null);
});
test('invitation RPC is authenticated and does not let the caller choose a role or family',async()=>{
  const disk=memory(),calls=[];const fetcher=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({joined:true}));};
  const cloud=new CloudClient({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},disk,fetcher);
  cloud.saveSession({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,user:{id:'new-learner'}});
  await cloud.joinInvite('a'.repeat(32),'Learner');const body=JSON.parse(calls[0].options.body);assert.deepEqual(body,{invite_code:'a'.repeat(32),learner_name:'Learner'});assert.equal(calls[0].options.headers.Authorization,'Bearer test-access');
});
test('an email callback validates the token before preserving a session',async()=>{
  const disk=memory();let requested;
  const cloud=new CloudClient({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},disk,async(url,options)=>{requested={url,options};return new Response(JSON.stringify({id:'verified-user'}));});
  await cloud.acceptCallback(new URLSearchParams({access_token:'callback-test',refresh_token:'refresh-test',expires_in:'3600'}));assert.match(requested.url,/auth\/v1\/user$/);assert.equal(cloud.session.user.id,'verified-user');
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
test('full reconciliation pages through more than 1000 rows and catches a late lower-sequence commit',async()=>{
  const cloud=new CloudClient({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'sb_publishable_test'},memory(),async()=>assert.fail('network not used'));
  const rows=Array.from({length:1201},(_,i)=>({id:'e'+(i+1),seq:i+1}));let late=false,memberReads=0;
  cloud.membership=async()=>{memberReads++};
  cloud.rest=async path=>{const cursor=Number(path.match(/seq=gt\.(\d+)/)[1]);return rows.filter(e=>e.seq>cursor&&(late||e.seq!==3)).slice(0,500)};
  const first=await cloud.pullEvents({full:true});assert.equal(first.length,1200);cloud.commitCursor();assert.equal(cloud.cursor,1201);
  late=true;assert.equal((await cloud.pullEvents()).length,0);assert.equal((await cloud.pullEvents({full:true})).length,1201);assert.ok(memberReads);
});
