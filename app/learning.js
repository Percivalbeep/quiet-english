import {dictionaryEntry,wordLemma} from './dictionary.js';
import {fishAudio} from './fish-audio.js';
import {stageQuestions,interleave,stageProgress,firstUnanswered} from './practice.js';
import {readingMarkup,savedWords,dictationQuestions,savedReviewQuestions} from './vocabulary.js';
import {reviewQuestions} from './curriculum.js';
import {isCorrect} from './core.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tabs=['1. 生词与记忆','2. 句子与用法','3. 课文与检测'];
export class LearningDialog{
  constructor({dialog,getStats,getRole,getEvents,getUserId,save,hasCompletion,syncText,onOpen,onClose,onComplete,toast}){
    Object.assign(this,{dialog,getStats,getRole,getEvents,getUserId,save,hasCompletion,syncText,onOpen,onClose,onComplete,toast});
    dialog.addEventListener('click',e=>{const popup=dialog.querySelector('.word-popup');if(popup&&!popup.contains(e.target)&&!e.target.closest('.reading-word'))popup.remove();});
    dialog.addEventListener('cancel',e=>{const popup=dialog.querySelector('.word-popup');if(popup){e.preventDefault();popup.remove();return;}if(this.run?.parent){e.preventDefault();this.back();}});
    dialog.addEventListener('close',()=>{this.stopAudio();if(this.run&&!this.run.mistakes&&!this.run.standalone){this.rememberDictation();this.paused=this.run;try{localStorage.setItem('quiet-stage:'+this.getUserId()+':'+this.run.lesson.id,String(this.run.tab));}catch{}}this.run=null;this.onClose();});
  }
  open(lesson,review=false,entry=0){
    const saved=this.getStats(lesson),questions=review?reviewQuestions(lesson,{round:saved.reviews.length,weakQuestionIds:[...saved.retrievalLatest.values()].filter(e=>e.payload.wordId&&!e.payload.correct).map(e=>e.payload.questionId)}).concat(savedReviewQuestions(lesson,savedWords(this.getEvents(),this.getUserId(),lesson.id),saved.reviews.length)):lesson.questions;
    const resumeIndex=!review?firstUnanswered(questions,saved):0;
    this.run={lesson,ownerUserId:this.getUserId?.(),review,questions,resumeIndex,index:review?0:resumeIndex,phase:review||entry==='quiz'?'quiz':'study',tab:Number.isInteger(entry)?entry:0,chosen:'',order:[],submitted:false,results:[],reviewSaved:false};
    if(!review&&entry===0){
      const missing=stageProgress(lesson,saved).find(s=>!s.complete);
      if(saved.answered&&!saved.complete&&missing)this.run.tab=saved.assessmentAnswered?2:missing.stage;
      const paused=this.paused;
      if(!saved.complete&&paused?.lesson.id===lesson.id&&paused.ownerUserId===this.getUserId?.()&&paused.phase==='quiz'&&!paused.practice){
        this.run.tab=paused.tab;this.startStage(false);
        if(this.run.questions[this.run.index]?.id===paused.questions[paused.index]?.id&&!paused.submitted){this.run.chosen=paused.chosen;this.run.order=paused.order;}
      }
    }
    if(!review&&entry==='quiz'&&resumeIndex===questions.length)this.run.phase='summary';
    this.onOpen(this.run);this.render();this.dialog.showModal();
  }
  back(){this.rememberDictation();this.stopAudio();const r=this.run;if(r.mistakes||r.standalone){this.dialog.close();return;}if(r.parent){this.run=r.parent;this.onOpen(this.run);}else if(r.phase!=='study'){r.phase='study';r.chosen='';r.order=[];r.submitted=false;}else r.tab=Math.max(0,r.tab-1);this.render();}
  startStage(render=true){const r=this.run;this.stopAudio();const questions=stageQuestions(r.lesson,r.tab);const index=firstUnanswered(questions,this.getStats(r.lesson));Object.assign(r,{questions,phase:index===questions.length?'summary':'quiz',stagePractice:true,practice:false,review:false,replaying:false,index,chosen:'',order:[],submitted:false,results:[],reviewSaved:false});if(render)this.render();}
  openMistakes(lesson,questions){this.open(lesson,false,0);this.run={lesson,questions:interleave(questions),phase:'quiz',index:0,tab:0,review:true,practice:true,mistakes:true,results:[],order:[],chosen:'',submitted:false};this.onOpen(this.run);this.render();}
  openWords(lesson,words,{fromSaved=true}={}){if(!words.length)return;this.open(lesson);this.run={lesson,ownerUserId:this.getUserId(),questions:dictationQuestions(lesson,words),phase:'quiz',index:0,tab:0,review:true,practice:true,standalone:true,fromSaved,results:[],order:[],chosen:'',submitted:false};this.onOpen(this.run);this.render();}
  rememberDictation(){const r=this.run;if(!r?.parent||!r.practice||r.mistakes)return;try{localStorage.setItem('quiet-dictation:'+this.getUserId()+':'+r.lesson.id,JSON.stringify({index:r.index,chosen:r.chosen,order:r.order,submitted:r.submitted,results:r.results,phase:r.phase,ids:r.questions.map(q=>q.id)}));}catch{}}
  wordSources(word){const ids=new Set([this.run.lesson.id,...this.getEvents().map(e=>e.lesson_id)]);return [...ids].filter(id=>savedWords(this.getEvents(),this.getUserId(),id).some(w=>w.en.toLowerCase()===wordLemma(word)));}
  starButton(word){const active=this.wordSources(word).length>0;return `<button type="button" class="word-star ${active?'is-saved':''}" data-star-word="${esc(word)}" aria-pressed="${active}" aria-label="${active?'取消收藏':'收藏到生词本'}：${esc(word)}">${active?'★':'☆'}</button>`;}
  updateStars(){this.dialog.querySelectorAll('[data-star-word]').forEach(b=>{const active=this.wordSources(b.dataset.starWord).length>0;b.textContent=active?'★':'☆';b.classList.toggle('is-saved',active);b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-label',(active?'取消收藏':'收藏到生词本')+'：'+b.dataset.starWord);});}
  toggleWord(word){if(this.getRole()!=='learner')return this.toast('请由学习者收藏生词。');try{const sources=this.wordSources(word),entry=dictionaryEntry(word,this.run.lesson);for(const lessonId of sources.length?sources:[this.run.lesson.id])this.save('review_answer',lessonId,{activity:'saved_word',word:entry.lemma,surface:word,example:entry.example,meaning:entry.meaning,active:!sources.length});this.updateStars();this.toast(sources.length?'已移出生词本。':'已收藏到生词本。');}catch(error){this.updateStars();this.toast(error.message);}}
  bindStars(){this.dialog.querySelectorAll('[data-star-word]').forEach(b=>b.onclick=()=>this.toggleWord(b.dataset.starWord));}
  showWord(button){
    this.dialog.querySelector('.word-popup')?.remove();const word=button.dataset.saveReadingWord,entry=dictionaryEntry(word,this.run.lesson),panel=document.createElement('aside');panel.className='word-popup';panel.setAttribute('role','dialog');panel.setAttribute('aria-label',word+' 词条');
    panel.innerHTML=`<div class="section-top"><strong>${esc(entry.lemma)}</strong>${this.starButton(word)}<button type="button" class="text-button" aria-label="关闭词条">✕</button></div><p>${esc(entry.pos)} ${esc(entry.meaning)}</p>${entry.lemma!==word.toLowerCase()?`<small>课文词形：${esc(word)} → 原形 ${esc(entry.lemma)}</small>`:''}<p class="word-example" lang="en">${esc(entry.example)}</p>${entry.forms.length>1?`<small>常见词形：${esc(entry.forms.join(' · '))}</small><br>`:''}<small>点☆收藏，点★取消收藏</small><div class="word-popup-actions">${this.audioButton(word,'▶ 发音')}</div>`;
    button.parentElement.appendChild(panel);const bounds=this.dialog.getBoundingClientRect(),rect=button.getBoundingClientRect();panel.style.left=Math.max(bounds.left+16-rect.left,Math.min(0,bounds.right-16-rect.left-300))+'px';
    panel.querySelector('[aria-label="关闭词条"]').onclick=()=>{panel.remove();button.focus();};panel.querySelector('[data-audio]').onclick=e=>this.play(word,e.currentTarget);this.bindStars();
  }
  wordResultView(){
    const r=this.run,q=r.questions[r.index],correct=r.results.at(-1)?.correct,canRemove=r.fromSaved&&correct&&this.wordSources(q.answer).length>0;
    return `<div class="dictation-result"><span class="eyebrow">单词听写 · ${r.index+1}/${r.questions.length}</span><h2 id="lesson-heading">${correct?'拼写正确':'这次拼写有误'}</h2><p class="dictation-target" lang="en">${esc(q.answer)}</p><p>你的拼写：<span lang="en">${esc(r.chosen)}</span></p><p class="muted">${esc(q.explanation)}</p>${this.audioButton(q.answer,'▶ 再听一次')}<p class="small-note" data-summary-sync>${esc(this.syncText())}</p>${canRemove?'<p>已经记住这个词了吗？</p><div class="compact-actions"><button class="primary" data-remove-mastered>移出生词本</button><button class="secondary" data-word-next>继续保留</button></div>':`<p class="small-note">${r.removed?'已移出生词本。':r.fromSaved&&!correct?'这个词继续留在生词本，方便下次练习。':'听写结果已保存。'}</p><button class="primary" data-word-next>${r.index+1<r.questions.length?'下一个词':'完成听写'}</button>`}${!correct?'<button class="text-button" data-word-retry>再写一次</button>':''}<button class="text-button" data-back>返回${r.fromSaved?'生词本':'单词本'}</button></div>`;
  }
  startDictation(){
    this.stopAudio();const r=this.run;const words=[...r.lesson.vocabulary,...savedWords(this.getEvents(),this.getUserId(),r.lesson.id)];
    this.run={...r,parent:{...r},questions:dictationQuestions(r.lesson,words),review:true,practice:true,index:0,phase:'quiz',chosen:'',order:[],submitted:false,results:[]};try{const draft=JSON.parse(localStorage.getItem('quiet-dictation:'+this.getUserId()+':'+r.lesson.id)||'null');if(draft&&JSON.stringify(draft.ids)===JSON.stringify(this.run.questions.map(q=>q.id))&&Number.isInteger(draft.index)&&draft.index>=0&&draft.index<=this.run.questions.length)Object.assign(this.run,{index:draft.index,chosen:draft.chosen||'',order:draft.order||[],submitted:!!draft.submitted,results:draft.results||[],phase:draft.phase==='summary'?'summary':'quiz'});}catch{}this.onOpen(this.run);this.render();this.dialog.scrollTop=0;
  }
  stopAudio(){
    clearTimeout(this.audioTimer);
    if(this.audio){this.audio.onended=null;this.audio.onerror=null;this.audio.onplaying=null;this.audio.pause();this.audio.remove?.();this.audio=null;}
    if(this.utterance){this.utterance.onend=null;this.utterance.onerror=null;globalThis.speechSynthesis?.cancel();}
    if(this.playingButton?.isConnected)this.playingButton.textContent=this.playingLabel;
    this.utterance=null;this.playingButton=null;
  }
  async play(text,button){
    this.stopAudio();
    const path=fishAudio[text]?.path;
    if(!path)return this.playSpeech(text,button);
    this.playingButton=button;this.playingLabel=button.textContent;button.textContent='正在加载音频…';
    const audio=new Audio(path);audio.hidden=true;globalThis.document?.body?.appendChild(audio);this.audio=audio;audio.preload='auto';audio.playbackRate=this.dialog.querySelector('#slow-audio')?.checked?.8:1;
    const failed=()=>{if(this.audio!==audio)return;this.stopAudio();this.toast('音频加载或播放失败，请确认网络后再点一次。');};
    let started=false;audio.onplaying=()=>{started=true;clearTimeout(this.audioTimer);if(this.audio===audio)button.textContent='正在播放…';};
    audio.onended=()=>{if(this.audio===audio)this.stopAudio();};audio.onerror=failed;
    this.audioTimer=setTimeout(()=>{if(this.audio===audio&&!started)failed();},12000);
    try{await audio.play();if(this.audio===audio){started=true;clearTimeout(this.audioTimer);button.textContent='正在播放…';}}catch{failed();}
  }
  async playSpeech(text,button){

    if(!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance)return this.toast('当前浏览器不支持设备语音，请使用 Safari、Chrome 或 Edge。');
    this.playingButton=button;this.playingLabel=button.textContent;button.textContent='正在播放…';
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';
    const voices=speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang));
    utterance.voice=voices.find(v=>v.localService&&/^en[-_]US$/i.test(v.lang))||voices.find(v=>/^en[-_]US$/i.test(v.lang))||voices[0]||null;
    utterance.rate=this.dialog.querySelector('#slow-audio')?.checked?.64:.8;
    this.utterance=utterance;
    utterance.onend=()=>{if(this.utterance===utterance)this.stopAudio();};
    this.audioTimer=setTimeout(()=>{if(this.utterance===utterance){this.stopAudio();this.toast('设备语音没有响应，请重新点击播放；自选生词需要设备启用英语语音。');}},Math.max(15000,text.length*150));
    utterance.onstart=()=>clearTimeout(this.audioTimer);
    utterance.onerror=e=>{if(this.utterance!==utterance)return;this.stopAudio();if(!['canceled','interrupted'].includes(e.error))this.toast('设备语音无法播放，请在系统设置中启用英语语音后重试。');};
    try{speechSynthesis.speak(utterance);}catch{this.stopAudio();this.toast('设备语音暂时无法播放，请重试。');}
  }
  render(){
    const r=this.run;if(!r)return;this.rememberDictation();
    this.dialog.innerHTML=`<div class="dialog-top"><span class="eyebrow">${r.mistakes?'错题复习':r.practice?'单词听写':r.review?'间隔复习':'DAY '+String(r.lesson.day).padStart(2,'0')} · ${esc(r.lesson.title)}</span><button class="icon-button" data-close aria-label="${r.parent?'返回学习':'暂停并关闭'}">✕</button></div>${r.standalone&&r.submitted?this.wordResultView():r.phase==='study'?this.studyView():r.phase==='quiz'?this.quizView():this.summaryView()}`;
    this.bindStars();
    this.dialog.querySelector('[data-word-next]')?.addEventListener('click',()=>{this.stopAudio();if(r.index+1>=r.questions.length)return this.dialog.close();r.index++;r.chosen='';r.submitted=false;r.removed=false;this.render();});
    this.dialog.querySelector('[data-word-retry]')?.addEventListener('click',()=>{this.stopAudio();r.chosen='';r.submitted=false;this.render();});
    this.dialog.querySelector('[data-remove-mastered]')?.addEventListener('click',()=>{const word=r.questions[r.index].answer;if(this.getRole()!=='learner')return this.toast('请由学习者管理生词。');try{for(const id of this.wordSources(word))this.save('review_answer',id,{activity:'saved_word',word,active:false});r.removed=true;this.render();}catch(error){this.toast(error.message);}});
    this.dialog.querySelector('[data-close]').onclick=()=>{if(r.parent)this.back();else this.dialog.close();};
    this.dialog.querySelector('[data-back]')?.addEventListener('click',()=>this.back());
    this.dialog.querySelector('[data-continue-stage]')?.addEventListener('click',()=>{r.tab=Math.min(2,r.tab+1);r.phase='study';this.render();});
    this.dialog.querySelector('[data-next-missing]')?.addEventListener('click',()=>{if(!this.getStats(r.lesson).complete){r.tab=2;r.phase='study';this.render();this.dialog.scrollTop=0;}});
    this.dialog.querySelectorAll('[data-audio]').forEach(b=>b.onclick=()=>this.play(b.dataset.audio,b));
    this.dialog.querySelectorAll('[data-study-tab]').forEach(b=>b.onclick=()=>{this.stopAudio();r.tab=Number(b.dataset.studyTab);this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelectorAll('[data-dictation]').forEach(b=>b.onclick=()=>this.startDictation());
    this.dialog.querySelectorAll('[data-save-reading-word]').forEach(b=>b.onclick=()=>this.showWord(b));
    this.dialog.querySelector('#next-study')?.addEventListener('click',()=>{this.stopAudio();r.tab++;this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelectorAll('[data-start-quiz]').forEach(b=>b.onclick=()=>{this.startStage();this.dialog.scrollTop=0;});
    this.dialog.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(r.submitted)return;r.chosen=b.dataset.choice;this.dialog.querySelectorAll('[data-choice]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});this.dialog.querySelector('#submit-answer').disabled=false;});
    this.dialog.querySelectorAll('[data-token]').forEach(b=>b.onclick=()=>{if(r.submitted)return;r.order.push(Number(b.dataset.token));this.render();});
    this.dialog.querySelectorAll('[data-remove-token]').forEach(b=>b.onclick=()=>{if(r.submitted)return;r.order.splice(Number(b.dataset.removeToken),1);this.render();});
    this.dialog.querySelector('#typed-answer')?.addEventListener('input',e=>{r.chosen=e.target.value;this.rememberDictation();});
    this.dialog.querySelector('#answer-form')?.addEventListener('submit',e=>this.submit(e));
    this.dialog.querySelector('#next-question')?.addEventListener('click',()=>{this.stopAudio();r.index=r.review||r.replaying?r.index+1:firstUnanswered(r.questions,this.getStats(r.lesson));r.chosen='';r.order=[];r.submitted=false;if(r.index>=r.questions.length)this.finish();else this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelector('#finish-lesson')?.addEventListener('click',()=>{if(r.parent)this.back();else this.dialog.close();});
    this.dialog.querySelector('#retry-lesson')?.addEventListener('click',()=>{r.phase='quiz';r.replaying=true;r.index=0;r.chosen='';r.order=[];r.submitted=false;r.results=[];r.reviewSaved=false;this.render();});
    this.dialog.querySelector('#save-summary')?.addEventListener('click',()=>this.finish());
  }
  audioButton(text,label='▶ 听一听'){return `<button class="audio-button" data-audio="${esc(text)}" aria-label="播放：${esc(text)}">${label}</button>`;}
  studyView(){
    const r=this.run,l=r.lesson;
    const stages=stageProgress(l,this.getStats(l)),stageDone=stages[r.tab]?.complete;
    let body='';
    if(r.tab===0)body=`<h2 id="lesson-heading">先把词语学扎实。</h2><p class="muted">今天8个关键词。听发音、认意思、看例句；熟词也会在新场景里复用。接下来会分别练词义、听辨和拼写。</p><div class="vocab-study-grid">${l.vocabulary.map((w,i)=>`<article class="vocab-study-card"><div><small>0${i+1}</small>${this.audioButton(w.en)}</div><div class="vocab-word-row"><span class="reading-token"><button type="button" class="reading-word vocab-word" data-save-reading-word="${esc(w.en)}" aria-haspopup="dialog">${esc(w.en)}</button></span>${this.starButton(w.en)}</div><p>${esc(w.zh)}</p><blockquote lang="en">${esc(w.example)}</blockquote></article>`).join('')}</div>`;
    if(r.tab===1)body=`<h2 id="lesson-heading">把词，放进生活里。</h2><p class="muted">今天5个表达。留意关键词在句子里的位置，先理解再尝试回忆。</p><div class="phrase-list">${l.phrases.map((p,i)=>`<article><span class="phrase-number">0${i+1}</span><div><strong lang="en">${esc(p.en)}</strong><p>${esc(p.zh)}</p></div>${this.audioButton(p.en,'▶ 听一句')}</article>`).join('')}</div><section class="phrase-list"><h3>本课生词，在句子中再见一次</h3>${l.vocabulary.map(w=>`<article><div><strong>${esc(w.en)} · ${esc(w.zh)}</strong><p lang="en">${esc(w.example)}</p></div>${this.audioButton(w.example,'▶ 听例句')}</article>`).join('')}</section><div class="lesson-tip"><strong>一点点语言规律</strong><br>${esc(l.tip)}</div>`;
    if(r.tab===-1)body=`<h2 id="lesson-heading">听出一句话的来回。</h2><p class="muted">先听完整段，抓住正在做什么；再分句看。听不懂时可以重听，不需要在工位开口。</p><div class="dialogue-play">${this.audioButton(l.dialogueText,'▶ 听整段情境对话')}<label class="slow-toggle"><input id="slow-audio" type="checkbox"> 再慢一点听</label></div><div class="dialogue-transcript">${l.dialogue.map(([speaker,en,zh])=>`<article class="speaker-${speaker.toLowerCase()}"><span>${speaker}</span><div><p lang="en">${esc(en)}</p><details><summary>看中文意思</summary><small>${esc(zh)}</small></details></div></article>`).join('')}</div>`;
    if(r.tab===2)body=`<h2 id="lesson-heading">读懂一小段生活信息。</h2><p class="muted">带着三个问题阅读：谁、要做什么、有哪些关键信息？点击不熟悉的词查看词条，再点☆收藏到生词本。</p><details class="translation-help"><summary>先听情境对话，看看这些表达怎样使用</summary><p class="small-note">A、B使用不同音色，换人时有停顿。</p>${this.audioButton(l.dialogueText,'▶ 听情境对话（0.8语速）')}${l.dialogue.map(([speaker,en,zh])=>`<p lang="en">${speaker}：${esc(en)}</p><small>${esc(zh)}</small>`).join('')}</details><div class="reading-audio">${this.audioButton(l.reading,'▶ 听课文（0.8语速）')}</div><div class="reading-passage" lang="en">${readingMarkup(l.reading)}</div><details class="translation-help"><summary>需要帮助时，看中文参考</summary><p>${esc(l.translation)}</p></details><div class="lesson-tip">接下来通过课文理解和听力问题检查掌握情况。可以随时暂停，提交过的答案会保存。</div>`;
    const personal=savedWords(this.getEvents?.()||[],this.getUserId?.(),l.id);
    return `<div class="study-tabs" role="tablist">${tabs.map((t,i)=>`<button role="tab" aria-selected="${i===r.tab}" data-study-tab="${i}">${t}<small>${stages[i].answered}/${stages[i].total}题${stages[i].complete?' ✓':''}</small></button>`).join('')}</div>${body}${r.tab===0?`<div class="dictation-entry"><p>听写和生词练习均为选做，记录会保留。</p><button class="secondary" data-dictation>听写本课单词（${dictationQuestions(l,[...l.vocabulary,...personal]).length}词）</button></div>`:''}<div class="study-actions">${r.tab>0?'<button class="secondary wide" data-back>← 返回上一部分</button>':''}${r.tab<2?`<button class="primary wide" id="next-study">下一段：${tabs[r.tab+1]} →</button>`:''}<button class="${r.tab<2||stageDone?'secondary':'primary'} wide" data-start-quiz>${stageDone?'查看本部分完成情况':['开始生词练习','开始句子用法练习','开始课文理解与听力检测'][r.tab]} →</button></div><p class="small-note">课文检测题全部提交即完成本课，不要求全对；生词、句子练习及听写均为选做。建议25—35分钟。${this.getRole()==='teacher'?'陪练预览不会写入学习者成绩。':''}</p>`;
  }
  quizView(){
    const r=this.run,q=r.questions[r.index];let input='';
    if(q.type==='input')input=`<p class="fill-template">${esc(q.template)}</p><label>${q.wordId?'输入英文词语':'填入缺少的单词'}<input id="typed-answer" class="${q.audioText?'handwriting-answer':''}" lang="en-US" inputmode="text" autocorrect="off" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false" required ${r.submitted?'disabled':''} value="${esc(r.chosen)}" placeholder="${q.audioText?'在这里用 Apple Pencil 随手写，或输入英文':'先回忆，再输入'}"></label>${q.audioText?'<p class="small-note">Apple Pencil：开启 iPad 设置 → Apple Pencil → 随手写，在上方输入框书写。识别成英文后可修改，再确认答案；也可用键盘输入。</p>':''}`;
    else if(q.type==='order'){
      const answer=r.order.map(i=>q.tokens[i]).join(' ');
      input=`<div class="order-answer" aria-label="当前组句">${r.order.length?r.order.map((token,i)=>`<button type="button" data-remove-token="${i}" ${r.submitted?'disabled':''}>${esc(q.tokens[token])} ×</button>`).join(''):'点击下方词语，放到这里。'}</div><div class="order-bank">${q.tokens.map((token,i)=>`<button type="button" data-token="${i}" ${r.submitted||r.order.includes(i)?'disabled':''}>${esc(token)}</button>`).join('')}</div><small class="muted">点击上面的词语可撤回，重新调整顺序。</small>`;
      r.chosen=answer;
    }else input=`<div class="answer-options">${[...new Set(q.options)].map((o,i)=>`<button type="button" class="answer-option ${r.submitted?(isCorrect(o,q.answer)?'correct':o===r.chosen?'incorrect':''):o===r.chosen?'selected':''}" data-choice="${esc(o)}" aria-pressed="${o===r.chosen}" ${r.submitted?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}</div>`;
    return `<button class="secondary" data-back>← ${r.parent?'返回刚才的学习':r.mistakes?'返回错题本':r.standalone?(r.fromSaved?'返回生词本':'返回单词本'):'返回本部分学习'}</button><div class="quiz-progress"><span style="width:${r.index/r.questions.length*100}%"></span></div><div class="quiz-label">${esc(q.skill)} · ${esc(q.section||'表达练习')} · ${r.index+1} / ${r.questions.length}${r.mistakes?' · 错题复习':r.practice?' · 单词听写':r.review?' · 间隔回忆':''}</div><h2 id="lesson-heading">${esc(q.prompt)}</h2>${q.passage?`<div class="reading-passage compact" lang="en">${esc(q.passage)}</div><details class="translation-help"><summary>查看中文辅助（用后请再独立试一次）</summary><p>${esc(q.translation)}</p></details>`:''}${q.audioText?`<div class="listen-stage">${this.audioButton(q.audioText,q.section==='情境对话'?'▶ 听完整段对话':'▶ 听这句话或词语')}<label class="slow-toggle"><input id="slow-audio" type="checkbox"> 再慢一点听</label></div>`:''}<form id="answer-form">${input}${r.submitted?`<div class="answer-feedback ${r.results.at(-1)?.correct?'good':'try-again'}" role="status"><strong>${r.results.at(-1)?.correct?'这一小步，答对了。':'先记住这次发现，再慢慢巩固。'}</strong><p>${esc(q.explanation)}</p><small>首次结果保留；重试不会覆盖它。</small></div><button type="button" class="primary wide" id="next-question">${r.index===r.questions.length-1?'完成这次练习':'下一小步'} →</button>`:`<button class="primary wide" id="submit-answer" type="submit" ${q.type!=='input'&&!r.chosen?'disabled':''}>确认答案 ✓</button>`}</form>`;
  }
  submit(e){
    e.preventDefault();const r=this.run;if(!r||r.submitted)return;const q=r.questions[r.index];const answer=q.type==='input'?this.dialog.querySelector('#typed-answer').value.trim():r.chosen;if(!answer)return;
    const correct=isCorrect(answer,q.answer);
    try{if(this.getRole()==='learner')this.save(r.review?'review_answer':'answer',r.lesson.id,{questionId:q.id,answer,correct,skill:q.skill,wordId:q.wordId||null,questionType:q.type,questionSnapshot:q,curriculumVersion:r.lesson.version});r.chosen=answer;r.results.push({questionId:q.id,correct});r.submitted=true;this.render();}catch(error){this.toast(error.message);}
  }
  finish(){
    const r=this.run;try{
      if(this.getRole()==='learner'){
        if(r.practice){}else if(r.review&&!r.reviewSaved){const correct=r.results.filter(x=>x.correct).length;this.save('review',r.lesson.id,{passed:correct/r.results.length>=.8,correct,total:r.results.length,curriculumVersion:r.lesson.version});r.reviewSaved=true;}
        else if(!r.review&&this.getStats(r.lesson).complete&&!this.hasCompletion(r.lesson))this.save('complete',r.lesson.id,{silentPractice:true,curriculumVersion:r.lesson.version,questions:this.getStats(r.lesson).assessmentTotal,completionRule:'reading-assessment-v1'});
      }
      r.saveError=null;r.phase='summary';this.render();this.onComplete();
    }catch(error){r.saveError=error.message;r.phase='summary';this.render();}
  }
  summaryView(){
    const r=this.run,correct=r.results.filter(x=>x.correct).length;
    const stats=this.getStats(r.lesson),stages=stageProgress(r.lesson,stats),missing=stages.filter(s=>!s.complete);
    const normal=!r.review&&!r.practice;
    const title=r.saveError?'还差最后一步保存。':normal?(stats.complete?'本课已完成，进步已保存。':'本部分已保存，课文检测尚未完成。'):'这次练习已保存。';
    const detail=this.getRole()==='teacher'?'这是陪练预览，不写入学习者成绩。':normal?`课文检测已作答 ${stats.assessmentAnswered} / ${stats.assessmentTotal} 题。${stats.complete?'本课已完成，可以返回首页继续下一课。生词和句子练习可随时回来补练。':'完成课文检测即可完成本课；已做的题目无需重做。'}`:r.mistakes?'本次错题练习已完成；历史错误继续保留。':r.practice?'单词听写单独记录，不代替整课练习。':'本次完成了间隔回忆。';
    return `<div class="summary-art">${r.saveError?'↻':normal&&!stats.complete?'…':'✓'}</div><h2 id="lesson-heading">${title}</h2><p class="muted">${esc(detail)}</p>${r.results.length?`<p>本次 ${correct} / ${r.results.length} 题答对。</p>`:''}${normal?`<div class="lesson-tip">${stages.map(s=>`${tabs[s.stage]}：${s.answered}/${s.total}题${s.complete?' ✓':''}`).join('<br>')}</div>`:''}${r.saveError?`<p class="error-text">${esc(r.saveError)}</p><button class="primary wide" id="save-summary">重新保存</button>`:`<div class="lesson-tip">${r.practice?'可随时回本课继续听写，收藏的生词会保留。':r.review?(correct/r.results.length>=.8?'本次较熟悉，下次复习间隔将延长。':'有些内容还不熟，约1天后再见。'):'已提交的答案会保留。做错的内容进入错题本，后续可以单独巩固。'}<br><small data-summary-sync>${esc(this.syncText())}</small></div><div class="summary-evening"><span>☾ 晚间开口卡 · 选做</span><p>${esc(r.lesson.speaking)}</p></div>${r.parent?'<button class="primary wide" data-back>返回刚才的学习</button>':normal&&!stats.complete?`<button class="primary wide" data-next-missing>继续课文检测 →</button>`:''}<button class="secondary wide" data-back>${r.mistakes?'返回错题本':r.standalone?(r.fromSaved?'返回生词本':'返回单词本'):'返回本部分学习'}</button><button class="${normal&&!stats.complete?'secondary':'primary'} wide" id="finish-lesson">${r.parent?'返回刚才的学习':'保存并返回首页'}</button><button class="text-button wide" id="retry-lesson">主动重练本部分</button>`}`;
  }
}
