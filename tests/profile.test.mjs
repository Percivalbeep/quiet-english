import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudClient} from '../app/cloud.js';
import {profileAvatar,profileCard} from '../app/profile.js';
test('profile changes use a private table and keep image data out of login tokens',async()=>{
 const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};let sent;
 const client=new CloudClient({supabaseUrl:'https://example.supabase.co',supabasePublishableKey:'public'},storage,async(url,options)=>{sent={url,...options};return new Response(null,{status:204})});
 client.saveSession({access_token:'token',refresh_token:'refresh',user:{id:'own'}});const expires=client.session.expires_at;
 await client.updateProfile('  Anna  ','data:image/jpeg;base64,YQ==');
 assert.equal(sent.method,'POST');assert.match(sent.url,/\/rest\/v1\/qe_profiles/);assert.deepEqual(JSON.parse(sent.body),{user_id:'own',display_name:'Anna',avatar_data:'data:image/jpeg;base64,YQ=='});assert.equal(client.session.expires_at,expires);assert.equal(client.profile.display_name,'Anna');assert.equal(client.session.user.user_metadata,undefined);
 await assert.rejects(client.updateProfile('',''),/昵称/);await assert.rejects(client.updateProfile('Anna','https://evil.test/avatar.svg'),/头像/);
});
test('profile rendering escapes names and rejects remote or SVG avatar sources',()=>{
 assert.equal(profileAvatar('data:image/svg+xml;base64,YQ=='),'');assert.equal(profileAvatar('https://example.test/a.jpg'),'');assert.match(profileAvatar('data:image/jpeg;base64,YQ=='),/<img/);
 const html=profileCard({mode:'cloud',name:'<script>',cloud:{session:{user:{email:'a@example.test',user_metadata:{}}}}});assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);
});
