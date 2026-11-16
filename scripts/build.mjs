import {cp,mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await rm(path.join(root,'dist'),{recursive:true,force:true});
await mkdir(path.join(root,'dist'),{recursive:true});
for(const name of ['index.html','config.js','app','assets'])await cp(path.join(root,name),path.join(root,'dist',name),{recursive:true});
const url=process.env.SUPABASE_URL||'',key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
if(Boolean(url)!==Boolean(key))throw new Error('Both public Supabase configuration values are required.');
if(url){
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw new Error('Use the HTTPS project URL from Supabase.');
  if(key.startsWith('sb_secret_'))throw new Error('A secret key must never enter the public site.');
  if(!key.startsWith('sb_publishable_')){
    let data;try{data=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());}catch{}
    if(data?.role!=='anon')throw new Error('Use only a publishable key or legacy anon key.');
  }
  await writeFile(path.join(root,'dist/config.js'),`window.QUIET_ENGLISH_CONFIG = ${JSON.stringify({supabaseUrl:url,supabasePublishableKey:key},null,2)};\n`);
}
const config=await readFile(path.join(root,'dist/config.js'),'utf8');
const sandbox={window:{}};
runInNewContext(config,sandbox,{timeout:100});
const publicConfig=sandbox.window.QUIET_ENGLISH_CONFIG;
if(!publicConfig)throw new Error('Public configuration is missing.');
const configuredKey=publicConfig.supabasePublishableKey||'';
if(configuredKey){
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(publicConfig.supabaseUrl))throw new Error('Invalid public project URL.');
  if(!configuredKey.startsWith('sb_publishable_')){
    let payload;try{payload=JSON.parse(Buffer.from(configuredKey.split('.')[1],'base64url').toString());}catch{}
    if(payload?.role!=='anon')throw new Error('Unexpected privileged or invalid key in public configuration.');
  }
}
// Give changed modules explicit versions so a browser cannot keep using an
// older cached sign-in implementation after a deployment.
const version=async relative=>createHash('sha256').update(await readFile(path.join(root,'dist',relative))).digest('hex').slice(0,12);
const emitted=new Set(),visiting=new Set();
async function emitModule(name){
  if(emitted.has(name))return;
  if(visiting.has(name))throw new Error('Unexpected module dependency cycle: '+name);
  visiting.add(name);
  const destination=path.join(root,'dist/app',name);
  let code=await readFile(destination,'utf8');
  const imports=[...code.matchAll(/from (['"])\.\/([a-zA-Z0-9-]+\.js)\1/g)];
  for(const match of imports){await emitModule(match[2]);code=code.replaceAll(`./${match[2]}${match[1]}`,`./${match[2]}?v=${await version('app/'+match[2])}${match[1]}`);}
  await writeFile(destination,code);visiting.delete(name);emitted.add(name);
}
for(const file of await readdir(path.join(root,'dist/app')))if(file.endsWith('.js'))await emitModule(file);
const htmlPath=path.join(root,'dist/index.html');
let html=await readFile(htmlPath,'utf8');
for(const relative of ['config.js','app/boot.js','app/main.js','app/style.css']){
  html=html.replaceAll(`"${relative}"`,`"${relative}?v=${await version(relative)}"`);
}
await writeFile(htmlPath,html);
await writeFile(path.join(root,'dist/.nojekyll'),'');
console.log('Static site ready in dist/; no private learning records or server secrets included.');
