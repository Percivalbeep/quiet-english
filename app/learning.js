import {audioPath,reviewQuestions} from './curriculum.js';
import {isCorrect} from './core.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tabs=['单词先打底','把词放进句子','听一段对话','读懂生活信息'];
export class LearningDialog{
  constructor({dialog,getStats,getRole,save,hasCompletion,syncText,onOpen,onClose,onComplete,toast}){
    Object.assign(this,{dialog,getStats,getRole,save,hasCompletion,syncText,onOpen,onClose,onComplete,toast});
    dialog.addEventListener('close',()=>{this.stopAudio();this.run=null;this.onClose();});
  }
  open(lesson,review=false,entry=0){
    const saved=this.getStats(lesson),questions=review?reviewQuestions(lesson,{round:saved.reviews.length,weakQuestionIds:[...saved.retrievalLatest.values()].filter(e=>e.payload.wordId&&!e.payload.correct).map(e=>e.payload.questionId)}):lesson.questions;
    const resumeIndex=!review&&!saved.complete?Math.max(0,questions.findIndex(q=>!saved.latest.has(q.id))):0;
    this.run={lesson,review,questions,resumeIndex,index:review?0:resumeIndex,phase:review||entry==='quiz'?'quiz':'study',tab:Number.isInteger(entry)?entry:0,chosen:'',order:[],submitted:false,results:[],reviewSaved:false};
    this.onOpen(this.run);this.render();this.dialog.showModal();
  }
  stopAudio(){this.audio?.pause();if(this.playingButton?.isConnected)this.playingButton.textContent=this.playingLabel;this.audio=null;this.playingButton=null;}
  async play(text,button){
    this.stopAudio();const path=audioPath(text);if(!path)return this.toast('这段音频尚未准备好，请稍后重试。');
    this.playingButton=button;this.playingLabel=button.textContent;button.textContent='正在播放…';
    const audio=new Audio(path);audio.playbackRate=this.dialog.querySelector('#slow-audio')?.checked?.85:1;this.audio=audio;
    audio.onended=()=>this.stopAudio();audio.onerror=()=>{this.stopAudio();this.toast('音频暂时无法播放，请检查连接后重试。');};
    try{await audio.play();}catch{this.stopAudio();this.toast('音频暂时无法播放，请重试。');}
  }
  render(){
    const r=this.run;if(!r)return;
    this.dialog.innerHTML=`<div class="dialog-top"><span class="eyebrow">${r.review?'间隔复习':'DAY '+String(r.lesson.day).padStart(2,'0')} · ${esc(r.lesson.title)}</span><button class="icon-button" data-close aria-label="暂停并关闭">✕</button></div>${r.phase==='study'?this.studyView():r.phase==='quiz'?this.quizView():this.summaryView()}`;
    this.dialog.querySelector('[data-close]').onclick=()=>this.dialog.close();
    this.dialog.querySelectorAll('[data-audio]').forEach(b=>b.onclick=()=>this.play(b.dataset.audio,b));
    this.dialog.querySelectorAll('[data-study-tab]').forEach(b=>b.onclick=()=>{this.stopAudio();r.tab=Number(b.dataset.studyTab);this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelector('#next-study')?.addEventListener('click',()=>{this.stopAudio();r.tab++;this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelectorAll('[data-start-quiz]').forEach(b=>b.onclick=()=>{this.stopAudio();r.phase='quiz';r.index=r.resumeIndex;this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{if(r.submitted)return;r.chosen=b.dataset.choice;this.dialog.querySelectorAll('[data-choice]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});this.dialog.querySelector('#submit-answer').disabled=false;});
    this.dialog.querySelectorAll('[data-token]').forEach(b=>b.onclick=()=>{if(r.submitted)return;r.order.push(Number(b.dataset.token));this.render();});
    this.dialog.querySelectorAll('[data-remove-token]').forEach(b=>b.onclick=()=>{if(r.submitted)return;r.order.splice(Number(b.dataset.removeToken),1);this.render();});
    this.dialog.querySelector('#answer-form')?.addEventListener('submit',e=>this.submit(e));
    this.dialog.querySelector('#next-question')?.addEventListener('click',()=>{this.stopAudio();r.index++;r.chosen='';r.order=[];r.submitted=false;if(r.index===r.questions.length)this.finish();else this.render();this.dialog.scrollTop=0;});
    this.dialog.querySelector('#finish-lesson')?.addEventListener('click',()=>this.dialog.close());
    this.dialog.querySelector('#retry-lesson')?.addEventListener('click',()=>{r.phase='quiz';r.index=0;r.chosen='';r.order=[];r.submitted=false;r.results=[];r.reviewSaved=false;this.render();});
    this.dialog.querySelector('#save-summary')?.addEventListener('click',()=>this.finish());
  }
  audioButton(text,label='▶ 听一听'){return `<button class="audio-button" data-audio="${esc(text)}" aria-label="播放：${esc(text)}">${label}</button>`;}
  studyView(){
    const r=this.run,l=r.lesson;
    let body='';
    if(r.tab===0)body=`<h2 id="lesson-heading">先把词语学扎实。</h2><p class="muted">今天8个关键词。听发音、认意思、看例句；熟词也会在新场景里复用。接下来会分别练词义、听辨和拼写。</p><div class="vocab-study-grid">${l.vocabulary.map((w,i)=>`<article class="vocab-study-card"><div><small>0${i+1}</small>${this.audioButton(w.en)}</div><strong lang="en">${esc(w.en)}</strong><p>${esc(w.zh)}</p><blockquote lang="en">${esc(w.example)}</blockquote></article>`).join('')}</div>`;
    if(r.tab===1)body=`<h2 id="lesson-heading">把词，放进生活里。</h2><p class="muted">今天5个表达。留意关键词在句子里的位置，先理解再尝试回忆。</p><div class="phrase-list">${l.phrases.map((p,i)=>`<article><span class="phrase-number">0${i+1}</span><div><strong lang="en">${esc(p.en)}</strong><p>${esc(p.zh)}</p></div>${this.audioButton(p.en,'▶ 听一句')}</article>`).join('')}</div><div class="lesson-tip"><strong>一点点语言规律</strong><br>${esc(l.tip)}</div>`;
    if(r.tab===2)body=`<h2 id="lesson-heading">听出一句话的来回。</h2><p class="muted">先听完整段，抓住正在做什么；再分句看。听不懂时可以重听，不需要在工位开口。</p><div class="dialogue-play">${this.audioButton(l.dialogueText,'▶ 听整段情境对话')}<label class="slow-toggle"><input id="slow-audio" type="checkbox"> 慢一点听</label></div><div class="dialogue-transcript">${l.dialogue.map(([speaker,en,zh])=>`<article class="speaker-${speaker.toLowerCase()}"><span>${speaker}</span><div><p lang="en">${esc(en)}</p><details><summary>看中文意思</summary><small>${esc(zh)}</small></details></div></article>`).join('')}</div>`;
    if(r.tab===3)body=`<h2 id="lesson-heading">读懂一小段生活信息。</h2><p class="muted">带着三个问题阅读：谁、要做什么、有哪些关键信息？不认识的词可返回单词页查看。</p><div class="reading-passage" lang="en">${esc(l.reading)}</div><details class="translation-help"><summary>需要帮助时，看中文参考</summary><p>${esc(l.translation)}</p></details><div class="lesson-tip">下一轮有${l.questions.length}道练习，分成词汇、表达、对话和短文几段。可以随时暂停，提交过的答案会保存。</div>`;
    return `<div class="study-tabs" role="tablist">${tabs.map((t,i)=>`<button role="tab" aria-selected="${i===r.tab}" data-study-tab="${i}">${i+1}. ${t}</button>`).join('')}</div>${body}<div class="study-actions">${r.tab<3?`<button class="primary wide" id="next-study">下一段：${tabs[r.tab+1]} →</button><button class="text-button wide" data-start-quiz>已经熟悉了，进入练习</button>`:`<button class="primary wide" data-start-quiz>开始${l.questions.length}道分段练习 →</button>`}</div><p class="small-note">建议20—30分钟，包含复听、回忆和复习；可拆成4次短练。${this.getRole()==='teacher'?'陪练预览不会写入学习者成绩。':''}</p>`;
  }
  quizView(){
    const r=this.run,q=r.questions[r.index];let input='';
    if(q.type==='input')input=`<p class="fill-template">${esc(q.template)}</p><label>${q.wordId?'输入英文词语':'填入缺少的单词'}<input id="typed-answer" name="answer" autocomplete="off" autocapitalize="off" spellcheck="false" required ${r.submitted?'disabled':''} value="${esc(r.chosen)}" placeholder="先回忆，再输入"></label>`;
    else if(q.type==='order'){
      const answer=r.order.map(i=>q.tokens[i]).join(' ');
      input=`<div class="order-answer" aria-label="当前组句">${r.order.length?r.order.map((token,i)=>`<button type="button" data-remove-token="${i}" ${r.submitted?'disabled':''}>${esc(q.tokens[token])} ×</button>`).join(''):'点击下方词语，放到这里。'}</div><div class="order-bank">${q.tokens.map((token,i)=>`<button type="button" data-token="${i}" ${r.submitted||r.order.includes(i)?'disabled':''}>${esc(token)}</button>`).join('')}</div><small class="muted">点击上面的词语可撤回，重新调整顺序。</small>`;
      r.chosen=answer;
    }else input=`<div class="answer-options">${[...new Set(q.options)].map((o,i)=>`<button type="button" class="answer-option ${r.submitted?(isCorrect(o,q.answer)?'correct':o===r.chosen?'incorrect':''):o===r.chosen?'selected':''}" data-choice="${esc(o)}" aria-pressed="${o===r.chosen}" ${r.submitted?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}</div>`;
    return `<div class="quiz-progress"><span style="width:${r.index/r.questions.length*100}%"></span></div><div class="quiz-label">${esc(q.skill)} · ${esc(q.section||'表达练习')} · ${r.index+1} / ${r.questions.length}${r.review?' · 间隔回忆':''}</div><h2 id="lesson-heading">${esc(q.prompt)}</h2>${q.passage?`<div class="reading-passage compact" lang="en">${esc(q.passage)}</div><details class="translation-help"><summary>查看中文辅助（用后请再独立试一次）</summary><p>${esc(q.translation)}</p></details>`:''}${q.type==='listen'?`<div class="listen-stage">${this.audioButton(q.audioText,q.section==='情境对话'?'▶ 听完整段对话':'▶ 听这句话或词语')}<label class="slow-toggle"><input id="slow-audio" type="checkbox"> 慢一点听</label></div>`:''}<form id="answer-form">${input}${r.submitted?`<div class="answer-feedback ${r.results.at(-1)?.correct?'good':'try-again'}" role="status"><strong>${r.results.at(-1)?.correct?'这一小步，答对了。':'先记住这次发现，再慢慢巩固。'}</strong><p>${esc(q.explanation)}</p><small>首次结果保留；重试不会覆盖它。</small></div><button type="button" class="primary wide" id="next-question">${r.index===r.questions.length-1?'完成这次练习':'下一小步'} →</button>`:`<button class="primary wide" id="submit-answer" type="submit" ${q.type!=='input'&&!r.chosen?'disabled':''}>确认答案 ✓</button>`}</form>`;
  }
  submit(e){
    e.preventDefault();const r=this.run;if(!r||r.submitted)return;const q=r.questions[r.index];const answer=q.type==='input'?this.dialog.querySelector('#typed-answer').value.trim():r.chosen;if(!answer)return;
    const correct=isCorrect(answer,q.answer);
    try{if(this.getRole()==='learner')this.save(r.review?'review_answer':'answer',r.lesson.id,{questionId:q.id,answer,correct,skill:q.skill,wordId:q.wordId||null,questionType:q.type,curriculumVersion:2});r.chosen=answer;r.results.push({questionId:q.id,correct});r.submitted=true;this.render();}catch(error){this.toast(error.message);}
  }
  finish(){
    const r=this.run;try{
      if(this.getRole()==='learner'){
        if(r.review&&!r.reviewSaved){const correct=r.results.filter(x=>x.correct).length;this.save('review',r.lesson.id,{passed:correct/r.results.length>=.8,correct,total:r.results.length,curriculumVersion:2});r.reviewSaved=true;}
        else if(!r.review&&!this.hasCompletion(r.lesson))this.save('complete',r.lesson.id,{silentPractice:true,curriculumVersion:2,questions:r.lesson.questions.length});
      }
      r.saveError=null;r.phase='summary';this.render();this.onComplete();
    }catch(error){r.saveError=error.message;r.phase='summary';this.render();}
  }
  summaryView(){
    const r=this.run,correct=r.results.filter(x=>x.correct).length;
    return `<div class="summary-art">${r.saveError?'↻':'✓'}</div><h2 id="lesson-heading">${r.saveError?'还差最后一步保存。':'词语和场景，又熟悉了一点。'}</h2><p class="muted">${this.getRole()==='teacher'?'这是陪练预览，不写入学习者成绩。':r.review?'本次完成了间隔回忆。':'这次完成了词汇、听辨、组句与阅读练习。'} 本次${correct} / ${r.results.length}题答对。</p>${r.saveError?`<p class="error-text">${esc(r.saveError)}</p><button class="primary wide" id="save-summary">重新保存</button>`:`<div class="lesson-tip">${r.review?(correct/r.results.length>=.8?'本次较熟悉，下次复习间隔将延长。':'有些内容还不熟，约1天后再见。'):'新增词语已进入单词本，可以按学过的课程回看。静默练习不等于已经会说，方便时再尝试开口。'}<br><small>${esc(this.syncText())}</small></div><div class="summary-evening"><span>☾ 晚间开口卡 · 选做</span><p>${esc(r.lesson.speaking)}</p></div><button class="primary wide" id="finish-lesson">收好今天的进步 ✓</button><button class="text-button wide" id="retry-lesson">再练一遍</button>`}`;
  }
}
