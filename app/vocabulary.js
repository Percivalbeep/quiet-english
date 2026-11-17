const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Saved words are preparation records in the existing private review event stream.
// They carry an activity tag and no questionId, score or completion flag.
export function savedWords(events,userId,lessonId){
 const words=new Map();for(const e of events){if(e.actor_id!==userId||e.lesson_id!==lessonId||e.kind!=='review_answer'||e.payload.activity!=='saved_word')continue;const p=e.payload,key=String(p.word||'').toLowerCase();if(p.active)words.set(key,{id:'personal-'+key,en:p.word,zh:p.meaning||'',example:''});else words.delete(key);}return [...words.values()];
}
export function readingMarkup(text){return text.split(/([A-Za-zÀ-ÖØ-öø-ÿ]+(?:[’'-][A-Za-zÀ-ÖØ-öø-ÿ]+)*)/g).map((part,i)=>i%2?`<span class="reading-token"><button type="button" class="reading-word" data-save-reading-word="${esc(part)}" title="查看词条" aria-haspopup="dialog">${esc(part)}</button></span>`:esc(part)).join('');}
export function dictationQuestions(lesson,words){const seen=new Set();return words.filter(w=>{const key=w.en.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).map(w=>({id:lesson.id+'-dictation-'+w.en.toLowerCase(),type:'input',skill:'词汇',section:'单词听写',wordId:w.id,prompt:'听音频，写出听到的英文词语。',template:'可重复播放；提交后再查看拼写和意思。',audioText:w.en,answer:w.en,explanation:w.en+(w.zh?'：'+w.zh:'')+(w.example?'。例句：'+w.example:'')}));}

export function savedReviewQuestions(lesson,words,round=0){const questions=dictationQuestions(lesson,words);if(!questions.length)return [];const start=(round*4)%questions.length;return [...questions.slice(start),...questions.slice(0,start)].slice(0,4);}
