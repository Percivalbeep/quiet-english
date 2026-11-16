export class CloudClient {
  constructor(config, storage=localStorage, fetcher=fetch) {
    this.url=config.supabaseUrl.replace(/\/$/,''); this.key=config.supabasePublishableKey;
    this.storage=storage; this.fetcher=fetcher; this.sessionKey=`quiet-english-session:${this.url}`;
    this.refreshing=null; this.cursor=0; this.pullCount=0;
  }
  get configured(){return Boolean(this.url&&this.key);}
  get session(){try{return JSON.parse(this.storage.getItem(this.sessionKey)||'null');}catch{return null;}}
  saveSession(data){this.storage.setItem(this.sessionKey,JSON.stringify({...data,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)}));}
  async request(path,{method='GET',body,token,headers={}}={}) {
    const response=await this.fetcher(`${this.url}${path}`,{method,headers:{apikey:this.key,...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    if(!response.ok){let data;try{data=await response.json();}catch{data={};}const error=new Error(response.status===401?'登录已过期，请重新登录。':(data.msg||data.message||data.error_description||`连接失败（${response.status}）`));error.status=response.status;throw error;}
    return response.status===204||response.headers.get('content-length')==='0'?null:await response.text().then(s=>s?JSON.parse(s):null);
  }
  async signIn(email,password){const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});this.saveSession(data);this.cursor=0;return data.user;}
  async token(){
    const session=this.session;
    if(!session)throw new Error('请先登录。');
    if(session.expires_at>Date.now()/1000+90)return session.access_token;
    if(!this.refreshing){
      const refresh=async()=>{const current=this.session;if(current?.expires_at>Date.now()/1000+90)return current.access_token;const data=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:current?.refresh_token}});this.saveSession(data);return data.access_token;};
      this.refreshing=(globalThis.navigator?.locks ? navigator.locks.request(`quiet-english-refresh:${this.url}`,refresh) : refresh()).finally(()=>{this.refreshing=null;});
    }
    return this.refreshing;
  }
  async rest(path,options={}) {
    try{return await this.request(`/rest/v1/${path}`,{...options,token:await this.token()});}
    catch(error){if(error.status!==401)throw error;const session=this.session;if(!session)throw error;this.storage.setItem(this.sessionKey,JSON.stringify({...session,expires_at:0}));return this.request(`/rest/v1/${path}`,{...options,token:await this.token()});}
  }
  async membership(){const rows=await this.rest('qe_members?select=*&order=created_at.asc');const userId=this.session?.user.id;const own=rows.find(m=>m.user_id===userId);if(!own)throw new Error('账号尚未加入学习空间，请按部署指南配置成员。');return {own,members:rows};}
  async pushEvents(events){if(events.length)await this.rest('qe_events?on_conflict=id',{method:'POST',body:events.map(({seq,...e})=>e),headers:{Prefer:'resolution=ignore-duplicates,return=minimal'}});}
  async pullEvents(){
    // Periodic full reconciliation also catches transactions that committed
    // out of sequence while another device was polling.
    const result=[];let cursor=this.pullCount++%12===0?0:this.cursor;
    while(true){const page=await this.rest(`qe_events?select=*&seq=gt.${cursor}&order=seq.asc&limit=500`);result.push(...page);if(page.length)cursor=page.at(-1).seq;if(page.length<500)break;}
    this.pendingCursor=Math.max(cursor,this.cursor);return result;
  }
  commitCursor(){this.cursor=this.pendingCursor??this.cursor;}
  async signOut(){try{await this.request('/auth/v1/logout',{method:'POST',token:await this.token()});}finally{this.storage.removeItem(this.sessionKey);this.cursor=0;}}
}
