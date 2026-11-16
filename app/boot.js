// A classic script can explain the file:// limitation even when ES modules
// are blocked, instead of leaving the initial loading message on screen.
if(location.protocol==='file:'){
  document.getElementById('app').innerHTML='<main class="startup-error"><h1>请通过网页地址打开</h1><p>直接双击HTML文件无法启动这个学习平台。你的学习记录没有被删除。</p><p>本机预览正在运行时，请打开下面的地址；正式发布后使用网站地址即可。</p><a class="primary" href="http://127.0.0.1:4173">打开本机学习平台 →</a></main>';
}else{
  setTimeout(()=>{
    if(document.querySelector('#app .boot')){
      document.getElementById('app').innerHTML='<main class="startup-error"><h1>页面暂时没有加载完成</h1><p>请检查网络后刷新。学习记录仍保存在本机，不需要删除浏览器数据。</p><a class="primary" href="">重新打开页面</a></main>';
    }
  },20000);
}
