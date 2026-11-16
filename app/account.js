const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function pendingInvite(){const fragment=new URLSearchParams((location.hash||'').split('?')[1]||'');const inUrl=fragment.get('invite')||new URLSearchParams(location.search).get('invite');if(inUrl&&/^[a-f0-9]{32}$/.test(inUrl))localStorage.setItem('quiet-english-pending-invite',inUrl);return inUrl||localStorage.getItem('quiet-english-pending-invite')||'';}
export async function joinPendingInvite(cloud,name=''){const code=pendingInvite();if(!code)return false;await cloud.joinInvite(code,name);localStorage.removeItem('quiet-english-pending-invite');const url=new URL(location.href);url.searchParams.delete('invite');history.replaceState(null,'',url.pathname+url.search+'#today');return true;}
export class AccountDialog{
  constructor(options){Object.assign(this,options);this.view='login';}
  open(view='login'){
    this.view=view;const {dialog,cloud}=this;
    const signedIn=this.getMode()==='cloud';
    dialog.innerHTML=`<div class="dialog-top"><span class="eyebrow">YOUR LEARNING SPACE</span><button class="icon-button" data-close aria-label="关闭">✕</button></div><h2 id="account-heading">${signedIn?'已连接学习空间':view==='signup'?'从自己的账号开始。':view==='join'?'加入陪练的学习空间':'把小小进步，同步起来'}</h2>${signedIn?`<p class="muted">${esc(this.getName())} · ${this.getRole()==='teacher'?'陪练老师':'学习者'}</p><button class="primary" id="account-logout">退出账号</button>`:!cloud.configured?'<p class="muted">云端连接尚未配置，当前可以本机试用。</p>':this.formView(view)}`;
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();
    dialog.querySelectorAll('[data-auth-view]').forEach(b=>b.onclick=()=>this.open(b.dataset.authView));
    dialog.querySelector('#account-logout')?.addEventListener('click',()=>{dialog.close();this.onLogout();});
    dialog.querySelector('#auth-form')?.addEventListener('submit',e=>this.submit(e));
    if(!dialog.open)dialog.showModal();
  }
  formView(view){
    const invite=pendingInvite(),signup=view==='signup',join=view==='join';
    return `${!join?`<div class="auth-tabs"><button data-auth-view="login" class="${!signup?'active':''}">已有账号登录</button><button data-auth-view="signup" class="${signup?'active':''}">受邀注册</button></div>`:''}<p class="muted">${signup?'使用陪练发来的邀请链接，设置自己的邮箱和密码。邀请仅能使用一次，有效期7天。':join?'账号已登录。粘贴陪练提供的邀请代码即可加入，无需重新注册。':'登录后恢复自己的学习记录；新学习者请使用陪练的邀请链接注册。'}</p><form id="auth-form">${signup?'<label>怎么称呼你<input name="name" autocomplete="nickname" maxlength="60" placeholder="学习页面显示的名字" required></label>':''}${!join?'<label>邮箱<input name="email" type="email" autocomplete="username" required></label><label>密码<input name="password" type="password" autocomplete="'+(signup?'new-password':'current-password')+'" minlength="'+(signup?8:6)+'" placeholder="'+(signup?'至少8个字符':'输入你的密码')+'" required></label>':''}${signup?'<label>再输入一次密码<input name="password2" type="password" autocomplete="new-password" minlength="8" required></label>':''}${signup||join?`<label>邀请代码<input name="invite" autocomplete="off" pattern="[a-f0-9]{32}" value="${esc(invite)}" placeholder="邀请链接会自动填入" required></label>`:''}<p class="error-text" id="login-error" role="alert"></p><button class="primary wide" type="submit">${signup?'注册并加入学习空间':join?'加入学习空间':'登录学习空间'} →</button></form><p class="small-note">注册账号不能自行成为陪练。已有学习记录会继续保留；各学习者只能查看自己的记录。</p>`;
  }
  async submit(e){
    e.preventDefault();const button=e.target.querySelector('[type=submit]'),error=this.dialog.querySelector('#login-error'),data=new FormData(e.target);button.disabled=true;error.textContent='';
    try{
      if(this.view==='signup'){
        if(data.get('password')!==data.get('password2'))throw new Error('两次输入的密码不一致，请再检查一下。');
        const code=String(data.get('invite')).trim();if(!/^[a-f0-9]{32}$/.test(code))throw new Error('请使用陪练提供的完整邀请链接。');
        localStorage.setItem('quiet-english-pending-invite',code);
        const redirect=new URL(location.origin+location.pathname);redirect.searchParams.set('invite',code);
        const result=await this.cloud.signUp(String(data.get('email')).trim(),data.get('password'),String(data.get('name')).trim(),redirect.href);
        if(result.needsConfirmation){error.classList.remove('error-text');error.classList.add('success-text');error.textContent='请打开注册确认邮件中的链接，再登录。邀请代码会继续保留。';return;}
        await joinPendingInvite(this.cloud,String(data.get('name')).trim());
      }else if(this.view==='join'){
        localStorage.setItem('quiet-english-pending-invite',String(data.get('invite')).trim());await joinPendingInvite(this.cloud);
      }else{
        await this.cloud.signIn(String(data.get('email')).trim(),data.get('password'));await joinPendingInvite(this.cloud);
      }
      this.dialog.close();await this.onSignedIn();
    }catch(err){error.textContent=err.code==='email_not_confirmed'?'请先确认注册邮件，再登录。':err.code==='email_address_not_authorized'?'邮件服务暂时无法向这个地址发信，请联系陪练完成注册设置。':err.code==='user_already_exists'?'这个邮箱已有账号，请切换到登录。':err.code==='invalid_credentials'?'邮箱或密码不匹配，请检查是否使用了学习平台的账号。':err.message;}
    finally{button.disabled=false;}
  }
}
