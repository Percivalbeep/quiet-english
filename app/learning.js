import {stageQuestions,interleave} from './practice.js';
import {readingMarkup,savedWords,dictationQuestions,savedReviewQuestions} from './vocabulary.js';
import {reviewQuestions} from './curriculum.js';
import {isCorrect} from './core.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tabs=['1. 生词与记忆','2. 句子与用法','3. 课文与检测'];
export class LearningDialog{
  constructor({dialog,getStats,getRole,getEvents,getUserId,save,hasCompletion,syncText,onOpen,onClose,onComplete,toast}){
    Object.assign(this,{dialog,getStats,getRole,getEvents,getUserId,save,hasCompletion,syncText,onOpen,onClose,onComplete,toast});
    dialog.addEventListener('cancel',e=>{if(this.run?.parent){e.preventDefault();this.back();}});
    dialog.addEventListener('close',()=>{this.stopAudio();if(!this.run?.mistakes){this.paused=this.run;try{localStorage.setItem('quiet-stage:'+this.getUserId()+':'+this.run.lesson.id,String(this.run.tab));}catch{}}this.run=null;this.onClose();});
  }
  open(lesson,review=false,entry=0){
    const saved=this.getStats(lesson),questions=review?reviewQuestions(lesson,{round:saved.reviews.length,weakQuestionIds:[...saved.retrievalLatest.values()].filter(e=>e.payload.wordId&&!e.payload.correct).map(e=>e.payload.questionId)}).concat(savedReviewQuestions(lesson,savedWords(this.getEvents(),this.getUserId(),lesson.id),saved.reviews.length)):lesson.questions;
    const resumeIndex=!review&&!saved.complete?Math.max(0,questions.findIndex(q=>!saved.latest.has(q.id))):0;
    this.run={lesson,ownerUserId:this.getUserId?.(),review,questions,resumeIndex,index:review?0:resumeIndex,phase:review||entry==='quiz'?'quiz':'study',tab:Number.isInteger(entry)?entry:0,chosen:'',order:[],submitted:false,results:[],reviewSaved:false};
    if(!review&&entry===0){try{const tab=Number(localStorage.getItem('quiet-stage:'+this.getUserId()+':'+lesson.id));if(Number.isInteger(tab)&&tab>=0&&tab<=2)this.run.tab=tab;}catch{}if(this.paused?.lesson.id===lesson.id&&this.paused.ownerUserId===this.getUserId?.())this.run=this.paused;}
    this.onOpen(this.run);this.render();this.dialog.showModal();
  }
  back(){this.stopAudio();const r=this.run;if(r.mistakes){this.dialog.close();return;}if(r.parent){this.run=r.parent;this.onOpen(this.run);}else if(r.phase!=='study'){r.phase='study';r.chosen='';r.order=[];r.submitted=false;}else r.tab=Math.max(0,r.tab-1);this.render();}
  startStage(){const r=this.run;this.stopAudio();const questions=stageQuestions(r.lesson,r.tab);const saved=this.getStats(r.lesson);Object.assign(r,{questions,phase:'quiz',stagePractice:true,practice:false,review:false,index:Math.max(0,questions.findIndex(q=>!saved.latest.has(q.id))),chosen:'',order:[],submitted:false,results:[],reviewSaved:false});this.render();}
  openMistakes(lesson,questions){this.open(lesson,false,0);this.run={lesson,questions:interleave(questions),phase:'quiz',index:0,tab:0,review:true,practice:true,mistakes:true,results:[],order:[],chosen:'',submitted:false};this.onOpen(this.run);this.render();}
  startDictation(){
    this.stopAudio();const r=this.run;const words=[...r.lesson.vocabulary,...savedWords(this.getEvents(),this.getUserId(),r.lesson.id)];
    this.run={...r,parent:{...r},questions:dictationQuestions(r.lesson,words),review:true,practice:true,index:0,phase:'quiz',chosen:'',order:[],submitted:false,results:[]};this.onOpen(this.run);this.render();this.dialog.scrollTop=0;
  }
  stopAudio(){
    if(this.utterance){this.utterance.onend=null;this.utterance.onerror=null;globalThis.speechSynthesis?.cancel();}
    if(this.playingButton?.isConnected)this.playingButton.textContent=this.playingLabel;
    this.utterance=null;this.playingButton=null;
  }
  async play(text,button){
    this.stopAudio();
    if(!globalThis.speechSynthesis||!globalThis.SpeechSynthesisUtterance)return this.toast('当前浏览器不支持设备语音，请使用 Safari、Chrome 或 Edge。');
    this.playingButton=button;this.playingLabel=button.textContent;button.textContent='正在播放…';
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';
    const voices=speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang));
    utterance.voice=voices.find(v=>v.localService&&/^en[-_]US$/i.test(v.lang))||voices.find(v=>/^en[-_]US$/i.test(v.lang))||voices[0]||null;
    utterance.rate=this.dialog.querySelector('#slow-audio')?.checked?.7:.85;
    this.utterance=utterance;
    utterance.onend=()=>{if(this.utterance===utterance)this.stopAudio();};
    utterance.onerror=e=>{if(this.utterance!==utterance)return;this.stopAudio();if(!['canceled','interrupted'].includes(e.error))this.toast('设备语音无法播放，请在系统设置中启用英语语音后重试。');};
    try{speechSynthesis.speak(utterance);}catch{this.stopAudio();this.toast('设备语音暂时无法播放，请重试。');}
  }
  render(){
    const r=this.run;if(!r)return;
    this.dialog.innerHTML=`<div class="dialog-top"><span class="eyebrow">${r.mistakes?'错题复习':r.practice?'单词听写':r.review?'间隔复习':'DAY '+String(r.lesson.day).padStart(2,'0')} · ${esc(r.lesson.title)}</span><button class="icon-button" data-close aria-label="${r.parent?'返回学习':'暂停并关闭'}">✕</button></div>${r.phase==='study'?this.studyView():r.phase==='quiz'?this.quizView():this.summaryView()}`;
    this.dialog.querySelector('[data-close]').onclick=()=>{if(r.parent)this.back();else this.dialog.close();};
    this.dialog.querySelector('[data-back]')?.addEventListener('click',()=>this.back());
    this.dialog.querySelector('[data-continue-stage]')?.addEventListener('click',()=>{r.tab=Math.min(2,r.tab+1);r.phase='study';this.render();});
    this.dialog.querySelectorAll('[data-audio]').forEach(b=>b.onclick=()=>this.play(b.dataset.audio,b));
    this.dialog.querySelectorAll('[data-study-tab]').forEach(b=>b.onclick=()=>{this.stopAudio();r.tab=Number(b.dataset.studyTab);this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelectorAll('[data-dictation]').forEach(b=>b.onclick=()=>this.startDictation());
    this.dialog.querySelectorAll('[data-save-reading-word]').forEach(b=>b.onclick=()=>{const field=this.dialog.querySelector('#new-word');field.value=b.dataset.saveReadingWord;field.focus();});
    this.dialog.querySelector('#save-reading-word')?.addEventListener('submit',e=>{e.preventDefault();if(this.getRole()!=='learner')return this.toast('请由学习者保存自己的生词。');const en=this.dialog.querySelector('#new-word').value.trim(),zh=this.dialog.querySelector('#new-meaning').value.trim();if(!/^[a-zA-Z]+(?:[’\x27-][a-zA-Z]+)*(?: [a-zA-Z]+(?:[’\x27-][a-zA-Z]+)*)*$/.test(en)||en.length>80)return this.toast('请输入80字符以内的英文词语或词组。');this.save('review_answer',r.lesson.id,{activity:'saved_word',word:en,meaning:zh,active:true});this.render();this.toast('已加入本课生词，可在下次回看和听写。');});
    this.dialog.querySelectorAll('[data-remove-word]').forEach(b=>b.onclick=()=>{if(this.getRole()!=='learner')return;this.save('review_answer',r.lesson.id,{activity:'saved_word',word:b.dataset.removeWord,active:false});this.render();});
    this.dialog.querySelector('#next-study')?.addEventListener('click',()=>{this.stopAudio();r.tab++;this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelectorAll('[data-start-quiz]').forEach(b=>b.onclick=()=>{this.startStage();this.dialog.scrollTop=0;});
    this.dialog.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(r.submitted)return;r.chosen=b.dataset.choice;this.dialog.querySelectorAll('[data-choice]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});this.dialog.querySelector('#submit-answer').disabled=false;});
    this.dialog.querySelectorAll('[data-token]').forEach(b=>b.onclick=()=>{if(r.submitted)return;r.order.push(Number(b.dataset.token));this.render();});
    this.dialog.querySelectorAll('[data-remove-token]').forEach(b=>b.onclick=()=>{if(r.submitted)return;r.order.splice(Number(b.dataset.removeToken),1);this.render();});
    this.dialog.querySelector('#typed-answer')?.addEventListener('input',e=>{r.chosen=e.target.value;});
    this.dialog.querySelector('#answer-form')?.addEventListener('submit',e=>this.submit(e));
    this.dialog.querySelector('#next-question')?.addEventListener('click',()=>{this.stopAudio();r.index++;r.chosen='';r.order=[];r.submitted=false;if(r.index===r.questions.length)this.finish();else this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelector('#finish-lesson')?.addEventListener('click',()=>{if(r.parent)this.back();else this.dialog.close();});
    this.dialog.querySelector('#retry-lesson')?.addEventListener('click',()=>{r.phase='quiz';r.index=0;r.chosen='';r.order=[];r.submitted=false;r.results=[];r.reviewSaved=false;this.render();});
    this.dialog.querySelector('#save-summary')?.addEventListener('click',()=>this.finish());
  }
  audioButton(text,label='▶ 听一听'){return `<button class="audio-button" data-audio="${esc(text)}" aria-label="播放：${esc(text)}">${label}</button>`;}
  studyView(){
    const r=this.run,l=r.lesson;
    let body='';
    if(r.tab===0)body=`<h2 id="lesson-heading">先把词语学扎实。</h2><p class="muted">今天8个关键词。听发音、认意思、看例句；熟词也会在新场景里复用。接下来会分别练词义、听辨和拼写。</p><div class="vocab-study-grid">${l.vocabulary.map((w,i)=>`<article class="vocab-study-card"><div><small>0${i+1}</small>${this.audioButton(w.en)}</div><strong lang="en">${esc(w.en)}</strong><p>${esc(w.zh)}</p><blockquote lang="en">${esc(w.example)}</blockquote></article>`).join('')}</div>`;
    if(r.tab===1)body=`<h2 id="lesson-heading">把词，放进生活里。</h2><p class="muted">今天5个表达。留意关键词在句子里的位置，先理解再尝试回忆。</p><div class="phrase-list">${l.phrases.map((p,i)=>`<article><span class="phrase-number">0${i+1}</span><div><strong lang="en">${esc(p.en)}</strong><p>${esc(p.zh)}</p></div>${this.audioButton(p.en,'▶ 听一句')}</article>`).join('')}</div><section class="phrase-list"><h3>本课生词，在句子中再见一次</h3>${l.vocabulary.map(w=>`<article><div><strong>${esc(w.en)} · ${esc(w.zh)}</strong><p lang="en">${esc(w.example)}</p></div>${this.audioButton(w.example,'▶ 听例句')}</article>`).join('')}</section><div class="lesson-tip"><strong>一点点语言规律</strong><br>${esc(l.tip)}</div>`;
    if(r.tab===-1)body=`<h2 id="lesson-heading">听出一句话的来回。</h2><p class="muted">先听完整段，抓住正在做什么；再分句看。听不懂时可以重听，不需要在工位开口。</p><div class="dialogue-play">${this.audioButton(l.dialogueText,'▶ 听整段情境对话')}<label class="slow-toggle"><input id="slow-audio" type="checkbox"> 慢一点听</label></div><div class="dialogue-transcript">${l.dialogue.map(([speaker,en,zh])=>`<article class="speaker-${speaker.toLowerCase()}"><span>${speaker}</span><div><p lang="en">${esc(en)}</p><details><summary>看中文意思</summary><small>${esc(zh)}</small></details></div></article>`).join('')}</div>`;
    if(r.tab===2)body=`<h2 id="lesson-heading">读懂一小段生活信息。</h2><p class="muted">带着三个问题阅读：谁、要做什么、有哪些关键信息？不认识的词可返回单词页查看。</p><details class="translation-help"><summary>先听情境对话，看看这些表达怎样使用</summary>${this.audioButton(l.dialogueText,'▶ 听情境对话')}${l.dialogue.map(([speaker,en,zh])=>`<p lang="en">${speaker}: ${esc(en)}</p><small>${esc(zh)}</small>`).join('')}</details><div class="reading-passage" lang="en">${readingMarkup(l.reading)}</div><details class="translation-help"><summary>需要帮助时，看中文参考</summary><p>${esc(l.translation)}</p></details><div class="lesson-tip">接下来通过课文理解和听力问题检查掌握情况。可以随时暂停，提交过的答案会保存。</div>`;
    const personal=savedWords(this.getEvents?.()||[],this.getUserId?.(),l.id);
    const wordTools=`<section class="lesson-tip"><strong>单词听写与本课生词</strong><p>听英语、输入拼写，提交后再看答案。包含本课8个词和自己收藏的生词。</p><button class="secondary" data-dictation>开始本课单词听写（${dictationQuestions(l,[...l.vocabulary,...personal]).length}词）</button>${r.tab===2?`<p>点击短文中的英文词，或手动输入词组；可补充中文意思。</p><form id="save-reading-word"><label>英文词语或词组<input id="new-word" maxlength="80" required autocomplete="off"></label><label>中文意思（选填）<input id="new-meaning" maxlength="100"></label><button class="secondary" type="submit">加入本课生词</button></form>`:''}<div class="personal-words">${personal.map(w=>`<div><strong>${esc(w.en)}</strong> ${esc(w.zh||'待补充释义')} ${this.audioButton(w.en)}<button class="text-button" data-remove-word="${esc(w.en)}">移除</button></div>`).join('')||'<p>还没有收藏生词。可到「读懂生活信息」中添加。</p>'}</div></section>`;
    return `<div class="study-tabs" role="tablist">${tabs.map((t,i)=>`<button role="tab" aria-selected="${i===r.tab}" data-study-tab="${i}">${t}</button>`).join('')}</div>${body}${r.tab===0||r.tab===2?wordTools:''}<div class="study-actions">${r.tab>0?'<button class="secondary wide" data-back>← 返回上一部分</button>':''}${r.tab<2?`<button class="primary wide" id="next-study">下一段：${tabs[r.tab+1]} →</button><button class="text-button wide" data-start-quiz>练一练这一部分</button>`:`<button class="primary wide" data-start-quiz>开始课文理解与听力检测 →</button>`}</div><p class="small-note">建议20—30分钟，包含复听、回忆和复习；可拆成4次短练。${this.getRole()==='teacher'?'陪练预览不会写入学习者成绩。':''}</p>`;
  }
  quizView(){
    const r=this.run,q=r.questions[r.index];let input='';
    if(q.type==='input')input=`<p class="fill-template">${esc(q.template)}</p><label>${q.wordId?'输入英文词语':'填入缺少的单词'}<input id="typed-answer" class="${q.audioText?'handwriting-answer':''}" lang="en-US" inputmode="text" autocorrect="off" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false" required ${r.submitted?'disabled':''} value="${esc(r.chosen)}" placeholder="${q.audioText?'在这里用 Apple Pencil 随手写，或输入英文':'先回忆，再输入'}"></label>${q.audioText?'<p class="small-note">Apple Pencil：开启 iPad 设置 → Apple Pencil → 随手写，在上方输入框书写。识别成英文后可修改，再确认答案；也可用键盘输入。</p>':''}`;
    else if(q.type==='order'){
      const answer=r.order.map(i=>q.tokens[i]).join(' ');
      input=`<div class="order-answer" aria-label="当前组句">${r.order.length?r.order.map((token,i)=>`<button type="button" data-remove-token="${i}" ${r.submitted?'disabled':''}>${esc(q.tokens[token])} ×</button>`).join(''):'点击下方词语，放到这里。'}</div><div class="order-bank">${q.tokens.map((token,i)=>`<button type="button" data-token="${i}" ${r.submitted||r.order.includes(i)?'disabled':''}>${esc(token)}</button>`).join('')}</div><small class="muted">点击上面的词语可撤回，重新调整顺序。</small>`;
      r.chosen=answer;
    }else input=`<div class="answer-options">${[...new Set(q.options)].map((o,i)=>`<button type="button" class="answer-option ${r.submitted?(isCorrect(o,q.answer)?'correct':o===r.chosen?'incorrect':''):o===r.chosen?'selected':''}" data-choice="${esc(o)}" aria-pressed="${o===r.chosen}" ${r.submitted?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}</div>`;
    return `<button class="secondary" data-back>← ${r.parent?'返回刚才的学习':r.mistakes?'返回错题本':'返回本部分学习'}</button><div class="quiz-progress"><span style="width:${r.index/r.questions.length*100}%"></span></div><div class="quiz-label">${esc(q.skill)} · ${esc(q.section||'表达练习')} · ${r.index+1} / ${r.questions.length}${r.mistakes?' · 错题复习':r.practice?' · 单词听写':r.review?' · 间隔回忆':''}</div><h2 id="lesson-heading">${esc(q.prompt)}</h2>${q.passage?`<div class="reading-passage compact" lang="en">${esc(q.passage)}</div><details class="translation-help"><summary>查看中文辅助（用后请再独立试一次）</summary><p>${esc(q.translation)}</p></details>`:''}${q.audioText?`<div class="listen-stage">${this.audioButton(q.audioText,q.section==='情境对话'?'▶ 听完整段对话':'▶ 听这句话或词语')}<label class="slow-toggle"><input id="slow-audio" type="checkbox"> 慢一点听</label></div>`:''}<form id="answer-form">${input}${r.submitted?`<div class="answer-feedback ${r.results.at(-1)?.correct?'good':'try-again'}" role="status"><strong>${r.results.at(-1)?.correct?'这一小步，答对了。':'先记住这次发现，再慢慢巩固。'}</strong><p>${esc(q.explanation)}</p><small>首次结果保留；重试不会覆盖它。</small></div><button type="button" class="primary wide" id="next-question">${r.index===r.questions.length-1?'完成这次练习':'下一小步'} →</button>`:`<button class="primary wide" id="submit-answer" type="submit" ${q.type!=='input'&&!r.chosen?'disabled':''}>确认答案 ✓</button>`}</form>`;
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
        else if(!r.review&&this.getStats(r.lesson).complete&&!this.hasCompletion(r.lesson))this.save('complete',r.lesson.id,{silentPractice:true,curriculumVersion:r.lesson.version,questions:r.lesson.questions.length});
      }
      r.saveError=null;r.phase='summary';this.render();this.onComplete();
    }catch(error){r.saveError=error.message;r.phase='summary';this.render();}
  }
  summaryView(){
    const r=this.run,correct=r.results.filter(x=>x.correct).length;
    return `<div class="summary-art">${r.saveError?'↻':'✓'}</div><h2 id="lesson-heading">${r.saveError?'还差最后一步保存。':'词语和场景，又熟悉了一点。'}</h2><p class="muted">${this.getRole()==='teacher'?'这是陪练预览，不写入学习者成绩。':r.mistakes?'本次错题练习已完成；历史错误继续保留。':r.practice?'本次完成了单词听写；听写结果已单独记录。':r.review?'本次完成了间隔回忆。':r.stagePractice?'本阶段练习已完成，可以返回复习或继续下一部分。':'这次完成了练习。'} 本次${correct} / ${r.results.length}题答对。</p>${r.saveError?`<p class="error-text">${esc(r.saveError)}</p><button class="primary wide" id="save-summary">重新保存</button>`:`<div class="lesson-tip">${r.practice?'可随时回本课继续听写，收藏的生词会保留。':r.review?(correct/r.results.length>=.8?'本次较熟悉，下次复习间隔将延长。':'有些内容还不熟，约1天后再见。'):'新增词语已进入单词本，可以按学过的课程回看。静默练习不等于已经会说，方便时再尝试开口。'}<br><small>${esc(this.syncText())}</small></div><div class="summary-evening"><span>☾ 晚间开口卡 · 选做</span><p>${esc(r.lesson.speaking)}</p></div>${r.parent?'<button class="primary wide" data-back>返回刚才的学习</button>':r.stagePractice&&r.tab<2?'<button class="primary wide" data-continue-stage>继续下一部分 →</button>':''}<button class="secondary wide" data-back>${r.mistakes?'返回错题本':'返回本部分学习'}</button><button class="primary wide" id="finish-lesson">收好今天的进步 ✓</button><button class="text-button wide" id="retry-lesson">再练一遍</button>`}`;
  }
}
