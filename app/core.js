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
  for (const e of answers) { latest.set(e.payload.questionId,e); if (!first.has(e.payload.questionId)) first.set(e.payload.questionId,e); }
  const ids = lesson.questions.map(q=>q.id);
  const answered = ids.filter(id=>latest.has(id)).length;
  const correct = ids.filter(id=>latest.get(id)?.payload.correct).length;
  const firstCorrect = ids.filter(id=>first.get(id)?.payload.correct).length;
  return {answered,correct,firstCorrect,total:ids.length,complete:answered===ids.length,
    speaking:relevant.some(e=>e.kind==='speaking'), reviews:relevant.filter(e=>e.kind==='review'), latest, first};
}
export function reviewState(lesson, events, userId, now = Date.now()) {
  const stats = lessonStats(lesson, events, userId);
  if (!stats.complete) return null;
  const completion = events.find(e=>e.actor_id===userId && e.lesson_id===lesson.id && e.kind==='complete');
  if (!completion) return null;
  let anchor = Date.parse(completion.created_at), level = 0;
  for (const review of stats.reviews) {
    anchor = Date.parse(review.created_at);
    level = review.payload.passed ? Math.min(level+1, INTERVALS.length-1) : 0;
  }
  const due = anchor + INTERVALS[level]*DAY;
  return {due, level, overdue:now>=due};
}
export function createEvent({actorId,familyId,lessonId,kind,payload={},now=new Date(),id=crypto.randomUUID()}) {
  return {id, actor_id:actorId, family_id:familyId, lesson_id:lessonId, kind, payload, created_at:now.toISOString()};
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
    const data=this.read();
    data.events=mergeEvents(data.events,[event]);
    if (pending&&!data.outbox.includes(event.id)) data.outbox.push(event.id);
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
    if (this.running) return this.running;
    if (!force && (!this.isVisible() || Date.now()<this.nextRetry)) return Promise.resolve();
    this.running=this.perform().finally(()=>{this.running=null;});
    return this.running;
  }
  async perform() {
    try {
      this.onState({status:'syncing'});
      const before=this.store.read();
      const pending=before.events.filter(e=>before.outbox.includes(e.id));
      for(let i=0;i<pending.length;i+=100) {
        const batch=pending.slice(i,i+100);
        await this.cloud.pushEvents(batch);
        this.store.reconcile([],batch.map(e=>e.id));
      }
      const remote=await this.cloud.pullEvents();
      const state=this.store.reconcile(remote);
      this.cloud.commitCursor?.();
      this.failures=0; this.nextRetry=0;
      this.onState({status:state.outbox.length?'pending':'synced',at:Date.now(),events:state.events,pending:state.outbox.length});
    } catch(error) {
      this.failures++;
      this.nextRetry=Date.now()+Math.min(60000,5000*2**(this.failures-1));
      this.onState({status:'error',error:error.message,pending:this.store.read().outbox.length});
    }
  }
  start() { this.stop(); this.sync(true); this.timer=setInterval(()=>this.sync(),5000); }
  stop() { clearInterval(this.timer); this.timer=null; }
}
