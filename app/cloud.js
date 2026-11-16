export class CloudClient {
  constructor(config, storage=localStorage, fetcher=fetch) {
    this.url=config.supabaseUrl.replace(/\/$/,''); this.key=config.supabasePublishableKey;
    this.storage=storage; this.fetcher=(...args)=>fetcher.call(globalThis,...args); this.sessionKey=`quiet-english-session:${this.url}`;
    this.refreshing=null; this.cursor=0; this.pullCount=0;
  }
  get configured(){return Boolean(this.url&&this.key);}
  get session(){try{return JSON.parse(this.storage.getItem(this.sessionKey)||'null');}catch{return null;}}
  saveSession(data){this.storage.setItem(this.sessionKey,JSON.stringify({...data,expires_at:Math.floor(Date.now()/1000)+(data.expires_in||3600)}));}
  async request(path,{method='GET',body,token,headers={}}={}) {
    const response=await this.fetcher(`${this.url}${path}`,{method,headers:{apikey:this.key,...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
    if(!response.ok){let data;try{data=await response.json();}catch{data={};}const error=new Error(response.status===401?'登录已过期，请重新登录。':(data.msg||data.message||data.error_description||`连接失败（${response.status}）`));error.status=response.status;error.code=data.error_code||data.code;throw error;}
    return response.status===204||response.headers.get('content-length')==='0'?null:await response.text().then(s=>s?JSON.parse(s):null);
  }
  async signIn(email,password){const data=await this.request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});this.saveSession(data);this.cursor=0;return data.user;}
  async signUp(email,password,displayName,redirectTo){
    const data=await this.request('/auth/v1/signup?redirect_to='+encodeURIComponent(redirectTo),{method:'POST',body:{email,password,data:{display_name:displayName}}});
    if(data.access_token){this.saveSession(data);this.cursor=0;}
    return {user:data.user||data,needsConfirmation:!data.access_token};
  }
  async acceptCallback(params){
    const token=params.get('access_token'),refresh=params.get('refresh_token');
    if(!token||!refresh)return false;
    const user=await this.request('/auth/v1/user',{token});
    this.saveSession({access_token:token,refresh_token:refresh,expires_in:Number(params.get('expires_in'))||3600,user});
    return true;
  }
  async refreshProfile(){const rows=await this.rest('qe_profiles?select=display_name,avatar_data&user_id=eq.'+encodeURIComponent(this.session.user.id));this.profile=rows[0]||null;return this.profile;}
  async updateProfile(displayName,avatar){
    const name=String(displayName).trim();if(!name||name.length>60)throw new Error('昵称需要1—60个字符。');
    if(avatar&&(!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(avatar)||avatar.length>90000))throw new Error('头像格式或大小不合适，请重新选择。');
    await this.rest('qe_profiles?on_conflict=user_id',{method:'POST',body:{user_id:this.session.user.id,display_name:name,avatar_data:avatar||''},headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
    this.profile={display_name:name,avatar_data:avatar||''};return this.profile;
  }
  async createInvite(){return this.rest('rpc/qe_create_invite',{method:'POST',body:{}});}
  async joinInvite(code,displayName=''){return this.rest('rpc/qe_join_invite',{method:'POST',body:{invite_code:code,learner_name:displayName}});}
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
  async membership(){const rows=await this.rest('qe_members?select=*&order=created_at.asc');this.membersSnapshot=rows;const userId=this.session?.user.id;const own=rows.find(m=>m.user_id===userId);if(!own){const error=new Error('账号已登录，但还没有加入学习空间。请使用陪练提供的邀请链接。');error.code='NO_MEMBERSHIP';throw error;}return {own,members:rows};}
  async pushEvents(events){if(events.length)await this.rest('qe_events?on_conflict=id',{method:'POST',body:events.map(({seq,...e})=>e),headers:{Prefer:'resolution=ignore-duplicates,return=minimal'}});}
  async pullEvents(){
    // Periodic full reconciliation also catches transactions that committed
    // out of sequence while another device was polling.
    const cycle=this.pullCount++;
    if(cycle%6===0)await this.membership();
    const result=[];let cursor=cycle%12===0?0:this.cursor;
    while(true){const page=await this.rest(`qe_events?select=*&seq=gt.${cursor}&order=seq.asc&limit=500`);result.push(...page);if(page.length)cursor=page.at(-1).seq;if(page.length<500)break;}
    this.pendingCursor=Math.max(cursor,this.cursor);return result;
  }
  commitCursor(){this.cursor=this.pendingCursor??this.cursor;}
  async signOut(){try{await this.request('/auth/v1/logout',{method:'POST',token:await this.token()});}finally{this.storage.removeItem(this.sessionKey);this.cursor=0;}}
}
