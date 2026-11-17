export const DAY = 86400000;
export const INTERVALS = [1, 3, 7, 14, 30];
export function localDay(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function normalize(value) {
  return String(value).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[.,!?。！？，]/g,'').replace(/\s+/g,' ').trim();
}
export function isCorrect(answer, expected) {
  return (Array.isArray(expected) ? expected : [expected]).some(x => normalize(x) === normalize(answer));
}
export function mergeEvents(...groups) {
  const map = new Map();
  for (const group of groups) for (const e of group) if (e?.id) map.set(e.id, e);
  return [...map.values()].sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
export function lessonStats(lesson, events, userId) {
  const relevant = events.filter(e => e.actor_id === userId && e.lesson_id === lesson.id);
  const answers = relevant.filter(e=>e.kind==='answer');
  const latest = new Map(), first = new Map();
  const retrievalLatest=new Map();
  for(const e of relevant.filter(e=>['answer','review_answer'].includes(e.kind)&&e.payload.questionId))retrievalLatest.set(e.payload.questionId,e);
  for (const e of answers) { latest.set(e.payload.questionId,e); if (!first.has(e.payload.questionId)) first.set(e.payload.questionId,e); }
  const ids = lesson.questions.map(q=>q.id);
  const answered = ids.filter(id=>latest.has(id)).length;
  const correct = ids.filter(id=>latest.get(id)?.payload.correct).length;
  const firstCorrect = ids.filter(id=>first.get(id)?.payload.correct).length;
  const completions=relevant.filter(e=>e.kind==='complete');
  const historicalAnswered=first.size,historicalFirstCorrect=[...first.values()].filter(e=>e.payload.correct).length;
  return {answered,correct,firstCorrect,historicalAnswered,historicalFirstCorrect,additionalQuestions:ids.length-answered,currentContentComplete:answered===ids.length,total:ids.length,complete:completions.length>0||answered===ids.length,legacyComplete:relevant.some(e=>e.kind==='complete'&&(e.payload.curriculumVersion||1)<(lesson.version||1)),
    speaking:relevant.some(e=>e.kind==='speaking'), reviews:relevant.filter(e=>e.kind==='review'), latest, first,retrievalLatest};
}
export function reviewState(lesson, events, userId, now = Date.now()) {
  const stats = lessonStats(lesson, events, userId);
  if (!stats.complete) return null;
  const completions=events.filter(e=>e.actor_id===userId && e.lesson_id===lesson.id && e.kind==='complete');
  // Curriculum edits cannot revoke completion or restart an existing review schedule.
  const completion=completions[0];
  if (!completion) return null;
  let anchor = Date.parse(completion.created_at), level = 0;
  for (const review of stats.reviews.filter(e=>Date.parse(e.created_at)>=anchor)) {
    anchor = Date.parse(review.created_at);
    level = review.payload.passed ? Math.min(level+1, INTERVALS.length-1) : 0;
  }
  const due = anchor + INTERVALS[level]*DAY;
  return {due, level, overdue:now>=due};
}
export function createEvent({actorId,familyId,lessonId,kind,payload={},now=new Date(),id=crypto.randomUUID()}) {
  return {id, actor_id:actorId, family_id:familyId, lesson_id:lessonId, kind, payload, created_at:now.toISOString()};
}
export function unfinishedLessons(lessons,events,userId) {
  return lessons.filter(l=>{const s=lessonStats(l,events,userId);return s.currentContentComplete&&!events.some(e=>e.actor_id===userId&&e.lesson_id===l.id&&e.kind==='complete');});
}
export function completionEvents(lessons,events,actorId,familyId) {
  return unfinishedLessons(lessons,events,actorId).map(l=>{
    const last=events.filter(e=>e.actor_id===actorId&&e.lesson_id===l.id&&e.kind==='answer').at(-1);
    return createEvent({actorId,familyId,lessonId:l.id,kind:'complete',now:new Date(last.created_at),payload:{silentPractice:true,curriculumVersion:l.version,questions:l.questions.length,recoveredFromAnswers:true}});
  });
}
export function recommendedLesson(lessons,events,userId,assignment) {
  const assigned=lessons.find(l=>l.id===assignment?.lesson_id);
  return assigned&&!lessonStats(assigned,events,userId).complete?assigned:lessons.find(l=>!lessonStats(l,events,userId).complete)||lessons.at(-1);
}
export class LocalStore {
  constructor(storage, key) { this.storage=storage; this.key=key; }
  read() {
    const raw=this.storage.getItem(this.key);
    if (!raw) return {events:[],outbox:[]};
    const data=JSON.parse(raw);
    if (!Array.isArray(data.events)||!Array.isArray(data.outbox)) throw new Error('本机记录格式异常，请先导出备份并联系维护者。');
    return data;
  }
  write(data) {
    try { this.storage.setItem(this.key,JSON.stringify(data)); }
    catch { throw new Error('本机空间不足或浏览器禁止保存。本次操作尚未保存，请导出备份后重试。'); }
  }
  append(event, pending=true) {
    this.appendMany([event],pending);
  }
  appendMany(added, pending=true) {
    const data=this.read();
    data.events=mergeEvents(data.events,added);
    if(pending)data.outbox=[...new Set([...data.outbox,...added.map(e=>e.id)])];
    this.write(data);
  }
  reconcile(remote, acknowledged=[]) {
    const data=this.read();
    const ids=new Set(acknowledged);
    data.events=mergeEvents(data.events,remote);
    data.outbox=data.outbox.filter(id=>!ids.has(id));
    this.write(data);
    return data;
  }
}
// One owner performs each sync. Retrying uses immutable UUIDs, so duplicate
// requests can be ignored by the database without overwriting another device.
export class SyncEngine {
  constructor({store,cloud,onState=()=>{},isVisible=()=>true}) {
    Object.assign(this,{store,cloud,onState,isVisible});
    this.running=null; this.timer=null; this.failures=0; this.nextRetry=0;
  }
  sync(force=false) {
    if(this.stopped)return Promise.resolve();
    if (this.running) {this.requested=true;this.fullRequested||=force;return this.running;}
    if (!force && (!this.isVisible() || Date.now()<this.nextRetry)) return Promise.resolve();
    this.fullRequested=force;
    this.running=Promise.resolve().then(async()=>{
      do{
        this.requested=false;const full=this.fullRequested;this.fullRequested=false;
        if(!await this.perform(full))break;
      }while(!this.stopped&&(this.requested||this.store.read().outbox.length));
    }).finally(()=>{this.running=null;});
    return this.running;
  }
  async perform(full=false) {
    try {
      this.onState({status:'syncing'});
      const before=this.store.read();
      const pending=before.events.filter(e=>before.outbox.includes(e.id));
      for(let i=0;i<pending.length;i+=100) {
        const batch=pending.slice(i,i+100);
        await this.cloud.pushEvents(batch);
        if(this.stopped)return false;
        this.store.reconcile([],batch.map(e=>e.id));
      }
      const remote=await this.cloud.pullEvents({full});
      if(this.stopped)return false;
      const state=this.store.reconcile(remote);
      this.cloud.commitCursor?.();
      this.failures=0; this.nextRetry=0;
      this.onState({status:state.outbox.length?'pending':'synced',at:Date.now(),events:state.events,pending:state.outbox.length});
      return true;
    } catch(error) {
      if(this.stopped)return false;
      this.failures++;
      this.nextRetry=Date.now()+Math.min(60000,5000*2**(this.failures-1));
      this.onState({status:'error',error:error.message,pending:this.store.read().outbox.length});
      return false;
    }
  }
  start() { clearInterval(this.timer);this.stopped=false; this.sync(true); this.timer=setInterval(()=>this.sync(),5000); }
  stop() { clearInterval(this.timer); this.timer=null;this.stopped=true; }
}
