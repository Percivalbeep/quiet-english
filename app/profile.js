const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function profileAvatar(value){return typeof value==='string'&&value.length<=90000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value)?`<img src="${value}" alt="我的头像">`:'';}
export function profileCard({cloud,mode,name}){
  if(mode!=='cloud')return '<section class="card profile-editor"><h3>我的账号</h3><p class="muted">登录后可修改昵称、上传头像，并在其他设备恢复个人资料。</p><button class="primary" data-action="account">登录管理账号</button></section>';
  return `<section class="card profile-editor"><h3>我的账号</h3><p class="muted">登录邮箱：${esc(cloud.session?.user?.email)}。昵称和头像会随账号保存，登录其他设备后恢复。</p><form id="profile-form"><div class="profile-preview" id="profile-preview">${profileAvatar(cloud.profile?.avatar_data)||esc(name.slice(0,1))}</div><label>昵称（用户名）<input name="display_name" value="${esc(name)}" maxlength="60" required autocomplete="nickname"></label><label>上传头像<input id="profile-file" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="small-note">支持 JPG、PNG、WebP，原图不超过10MB。保存前会裁成正方形并压缩；仅保存处理后的头像。</p><button type="button" class="secondary" id="remove-avatar">移除头像</button><p id="profile-error" class="error-text" role="status"></p><button class="primary" type="submit">保存个人资料</button></form></section>`;
}
export async function compressAvatar(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('请选择10MB以内的 JPG、PNG 或 WebP 图片。');
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('图片读取失败。'));reader.readAsDataURL(file);});
  const img=new Image();img.src=data;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;const context=canvas.getContext('2d');
  const side=Math.min(img.naturalWidth,img.naturalHeight);context.fillStyle='#fff';context.fillRect(0,0,192,192);context.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,192,192);
  const result=canvas.toDataURL('image/jpeg',.78);if(result.length>90000)throw new Error('图片压缩后仍然太大，请换一张图片。');return result;
}
export function bindProfile({cloud,mode,name,render,toast}){
  const form=document.querySelector('#profile-form');if(mode!=='cloud'||!form)return;
  let avatar=cloud.profile?.avatar_data||'',reading=false;
  const preview=document.querySelector('#profile-preview'),error=document.querySelector('#profile-error'),save=form.querySelector('[type=submit]');
  document.querySelector('#profile-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;reading=true;save.disabled=true;error.textContent='正在处理头像…';try{avatar=await compressAvatar(file);preview.innerHTML=profileAvatar(avatar);error.textContent='头像预览已更新，点击保存后同步。';}catch(err){error.textContent=err.message;}finally{reading=false;save.disabled=false;}};
  document.querySelector('#remove-avatar').onclick=()=>{avatar='';preview.textContent=name.slice(0,1);document.querySelector('#profile-file').value='';error.textContent='点击保存后移除头像。';};
  form.onsubmit=async e=>{e.preventDefault();if(reading)return;save.disabled=true;error.textContent='正在保存…';try{await cloud.updateProfile(new FormData(form).get('display_name'),avatar);render();toast('昵称和头像已保存到账号。');}catch(err){error.textContent=err.message;}finally{save.disabled=false;}};
}
