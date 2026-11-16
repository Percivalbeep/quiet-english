import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingInvite,joinPendingInvite} from '../app/account.js';

test('fragment invitations survive login and are removed only after a successful join',async()=>{
  const previous={location:globalThis.location,localStorage:globalThis.localStorage,history:globalThis.history};
  const code='1234567890abcdef1234567890abcdef',values=new Map();let replaced;
  globalThis.location={hash:'#register?invite='+code,search:'',href:'https://example.test/quiet-english/#register?invite='+code};
  globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  globalThis.history={replaceState:(_a,_b,url)=>{replaced=url}};
  try{
    assert.equal(pendingInvite(),code);
    globalThis.location.hash='#today';
    assert.equal(pendingInvite(),code);
    await assert.rejects(joinPendingInvite({joinInvite:async()=>{throw new Error('offline')}}),/offline/);
    assert.equal(pendingInvite(),code);
    await joinPendingInvite({joinInvite:async received=>assert.equal(received,code)});
    assert.equal(pendingInvite(),'');assert.equal(replaced,'/quiet-english/#today');
  }finally{Object.assign(globalThis,previous)}
});
