import {lessonContent} from './lesson-content.js';
import {audioManifest} from './audio-manifest.js';
// Vocabulary, retrieval, conversation and reading form one daily learning unit.
const units = [
  ['认识彼此','Hello, a little at a time.','先从自己的名字开始。','打招呼并介绍自己','Hi, I’m Anna.','你好，我是安娜。','Nice to meet you.','很高兴认识你。','What’s your name?','你叫什么名字？','在晚间说出自己的名字，并问对方的名字。'],
  ['没听清，也有办法','Could you say that again?','听不懂时，也能让交流继续。','请求重复与放慢语速','Could you say that again?','你能再说一遍吗？','Could you speak more slowly?','你能说慢一点吗？','Could you write it down?','你能写下来吗？','让对方说一句话，再主动请求重复。'],
  ['数字，慢慢听清','Two, twelve, twenty.','留意发音，不靠字幕猜答案。','听懂数量并确认','I need two tickets.','我需要两张票。','Is that twelve?','是十二吗？','That’s twenty dollars.','那是二十美元。','用自己的话确认一次数量和价格。'],
  ['说出一个小需求','I’d like some water.','先学会说出自己需要什么。','表达基本需求','I’d like some water, please.','我想要一些水，谢谢。','I need some help.','我需要一些帮助。','Can I have a bag, please?','能给我一个袋子吗？','向对方要一杯水，再换成一个袋子。'],
  ['读懂时间和标识','What time does it open?','让短短的标识变得熟悉。','识别地点与营业信息','What time does it open?','几点开门？','It opens at nine.','九点开门。','Where is the exit?','出口在哪里？','询问一个地点几点开门。'],
  ['第一周，小小实战','Hello. Could you help me?','换一个顺序，看看还记得多少。','组合问候、需求和求助','Hello. Could you help me?','你好，你能帮帮我吗？','I’d like two tickets, please.','我想要两张票，谢谢。','Could you say that again?','你能再说一遍吗？','不看文字，完成问候、买票、请求重复三步。'],
  ['点一杯喜欢的咖啡','A small coffee, please.','把一句话用到生活里。','选择饮品与大小','I’d like a small coffee, please.','我想要一小杯咖啡，谢谢。','Hot or iced?','热的还是冰的？','Iced, please.','冰的，谢谢。','点一杯饮品，并回答大小和冷热。'],
  ['吃什么，你来决定','For here or to go?','听懂店员常见的追问。','堂食、打包和简单点餐','For here or to go?','在这里吃还是带走？','To go, please.','请打包带走。','I’d like a sandwich.','我想要一个三明治。','点一份食物，回答堂食还是带走。'],
  ['价格与付款','Can I pay by card?','听清价格，再选择付款方式。','询价与刷卡付款','How much is it?','这个多少钱？','It’s fifteen dollars.','十五美元。','Can I pay by card?','我能刷卡吗？','询问价格，并确认能否刷卡。'],
  ['在餐厅坐下来','A table for two, please.','从进门到结账，一步一步来。','人数、菜单与结账','A table for two, please.','请给我们安排两人桌。','Could I see the menu?','我能看看菜单吗？','Could we have the bill, please?','请帮我们结账。','完成报人数、要菜单、结账。'],
  ['买到需要的东西','Do you have a smaller size?','从认出商品，到提出要求。','询问商品与尺码','Do you have a smaller size?','有小一点的尺码吗？','I’m looking for milk.','我在找牛奶。','Just looking, thank you.','我只是看看，谢谢。','提出一个商品或尺码需求。'],
  ['第二周，生活小串联','I’d like this one, please.','把点餐、询价和付款连起来。','综合购物与点餐','I’d like this one, please.','我想要这个，谢谢。','How much is it?','这个多少钱？','Can I pay by card?','我能刷卡吗？','换一家店，不看台词完成购买。'],
  ['问路的第一句话','Where is the station?','先听懂方向里的关键词。','询问地点与理解方向','Where is the station?','车站在哪里？','Go straight.','一直往前走。','Turn left.','向左转。','问一个地点，并确认向左还是向右。'],
  ['坐上正确的车','Does this bus go to the station?','上车前，多确认一句。','确认目的地与车站','Does this bus go to the station?','这辆公交车去车站吗？','Where should I get off?','我应该在哪里下车？','Get off at the next stop.','在下一站下车。','确认车辆是否到目的地，询问下车站。'],
  ['买票与出发时间','One ticket to Oxford, please.','把地点、数量、时间放进同一件事。','买票与确认发车时间','One ticket to Oxford, please.','请给我一张去牛津的票。','What time does it leave?','几点出发？','It leaves at ten thirty.','十点半出发。','换一个目的地，询问出发时间。'],
  ['到酒店了','I have a reservation.','入住时先把关键信息说清楚。','出示预订与办理入住','I have a reservation.','我有预订。','It’s under the name Anna.','预订姓名是安娜。','Here is my passport.','这是我的护照。','用自己的姓名模拟一次入住。'],
  ['问清酒店信息','What time is breakfast?','住下来以后，也能问清楚。','早餐、网络与退房','What time is breakfast?','早餐是几点？','What’s the Wi-Fi password?','无线网络密码是什么？','What time is check-out?','几点退房？','询问早餐时间和退房时间。'],
  ['第三周，抵达新城市','Where can I get a taxi?','从车站走到酒店，连起来试一次。','综合交通与入住','Where can I get a taxi?','在哪里可以打车？','Please take me to this hotel.','请带我去这家酒店。','I have a reservation.','我有预订。','模拟从车站打车到酒店并入住。'],
  ['把饮食需求说清楚','Does this contain peanuts?','把重要需求表达得直接、明确。','询问配料与说明过敏','Does this contain peanuts?','这里面有花生吗？','I’m allergic to peanuts.','我对花生过敏。','No sugar, please.','请不要加糖。','按真实需求练习；严重过敏另备准确的书面说明。'],
  ['在机场找到方向','Where is gate twelve?','抓住航站楼、登机口和行李信息。','询问登机口与行李地点','Where is gate twelve?','十二号登机口在哪里？','Where is baggage claim?','行李提取处在哪里？','Is this the right line?','这是正确的队伍吗？','询问登机口，再确认是否排对队。'],
  ['确认预订信息','I booked a room for two nights.','用短句确认日期和数量。','阅读并确认预订','I booked a room for two nights.','我预订了住两晚的房间。','Is breakfast included?','包含早餐吗？','Could you check my booking?','你能查一下我的预订吗？','阅读一份预订信息，再确认住宿晚数。'],
  ['遇到问题，说明白','The air conditioning isn’t working.','先说明问题，再提出一个请求。','报告问题与请求处理','The air conditioning isn’t working.','空调坏了。','This isn’t what I ordered.','这不是我点的。','Could you help me, please?','请帮帮我好吗？','说明一个房间或订单问题，请求帮助。'],
  ['聊聊今天和明天','I’m going to the museum tomorrow.','从办事，慢慢走向分享生活。','表达简单计划与经历','I’m going to the museum tomorrow.','我明天打算去博物馆。','I went to the park yesterday.','我昨天去了公园。','It was lovely.','那很美好。','用一句话说昨天做了什么，再说一个明天的计划。'],
  ['第四周，一次小旅行','Could you help me change my booking?','看看哪些能独立完成，哪些值得再练。','综合旅行与问题处理','Could you help me change my booking?','你能帮我修改预订吗？','I’d like to stay one more night.','我想多住一晚。','How much is it?','多少钱？','用三到五轮对话完成一个预订变更。']
];
export const weeks = [
  {title:'从一句话开始',subtitle:'问候 · 数字 · 求助',color:'sage'},
  {title:'把英语放进生活',subtitle:'点餐 · 购物 · 付款',color:'peach'},
  {title:'走进一座新城市',subtitle:'问路 · 交通 · 入住',color:'blue'},
  {title:'多一点独立',subtitle:'需求 · 问题 · 小旅行',color:'lilac'}
];
// Choose a teaching target explicitly rather than hiding the final token.
const gapTargets=[['I’m','from','live'],['say','understand','repeat'],['need','tickets','total'],['like','bag','have'],['open','open','right'],['help','name','help'],['small','sugar','milk'],['go','here','order'],['much','receipt','cash'],['table','order','ready'],['smaller','try','fit'],['like','all','receipt'],['Where','far','right'],['go','stop','off'],['ticket','single','platform'],['reservation','check','key'],['breakfast','included','floor'],['taxi','address','long'],['contain','ingredients','Without'],['gate','flight','security'],['booked','confirm','guests'],['working','problem','change'],['going','plans','visit'],['change','available','confirm']];
export function focusedGap(text,target){if(!text.includes(target))throw new Error('Missing teaching target: '+target);return {template:text.replace(target,'____'),answer:target};}
export const lessons = units.map((u,index)=>{
  const [title,headline,description,goal,a,az,b,bz,c,cz,speaking]=u;
  const id=`day-${String(index+1).padStart(2,'0')}`;
  const content=lessonContent[index];
  const phrases=[{en:a,zh:az},{en:b,zh:bz},{en:c,zh:cz},...content.extra.map(([en,zh])=>({en,zh}))];
  const others=[units[(index+7)%units.length][5],units[(index+13)%units.length][5]];
  const options=[az,...others];
  // Rotate options so the correct answer is not always in the same position.
  const rotated=(values,n)=>values.slice(n%values.length).concat(values.slice(0,n%values.length));
  const questions=[
    {id:`${id}-listen`,type:'listen',skill:'听',prompt:'戴上耳机听一句话，选择它的意思。',audioText:a,options:rotated(options,index),answer:az,explanation:`${a} 表示「${az}」。`},
    {id:`${id}-read`,type:'choice',skill:'读',prompt:`看到「${b}」，它表达什么？`,options:rotated([bz,units[(index+8)%units.length][7],units[(index+15)%units.length][7]],index+1),answer:bz,explanation:`这里的意思是「${bz}」。`},
    {id:`${id}-respond`,type:'choice',skill:'表达准备',prompt:`如果你想表达「${cz}」，应该选哪一句？`,options:rotated([c,units[(index+6)%units.length][8],units[(index+12)%units.length][8]],index+2),answer:c,explanation:`可以说：${c}。选对句子属于表达准备，还不能说明已经会开口。`},
    {id:`${id}-write-focus`,type:'input',skill:'写',prompt:`表达「${az}」，试着补上缺少的词。`,...focusedGap(a,gapTargets[index][0]),explanation:`完整表达是：${a}`},
    {id:`${id}-listen2`,type:'listen',skill:'听',prompt:'再听一句，不看英文，找出正确意思。',audioText:c,options:rotated([cz,units[(index+5)%units.length][9],units[(index+16)%units.length][9]],index),answer:cz,explanation:`你听到的是：${c}`}
  ];
  const vocabularyQuestions=content.vocabulary.flatMap((word,i)=>[
    {id:`${id}-vocab-meaning-${i}`,type:'choice',skill:'词汇',section:'词义辨认',wordId:word.id,prompt:`词语「${word.en}」在本课中表示什么？`,options:rotated([word.zh,content.vocabulary[(i+2)%8].zh,content.vocabulary[(i+5)%8].zh],i+index),answer:word.zh,explanation:`${word.en}：${word.zh}。例句：${word.example}`},
    ...(i%2===(index%2)?[{id:`${id}-vocab-write-${i}`,type:'input',skill:'词汇',section:'拼写回忆',wordId:word.id,prompt:`回忆词汇：写出「${word.zh}」的英文。`,template:'先回忆，再输入；不用追求一次记住。',answer:word.en,explanation:`${word.en}：${word.zh}。${word.example}`}]:[{id:`${id}-vocab-listen-${i}`,type:'listen',skill:'词汇',section:'听音辨词',wordId:word.id,prompt:'听一个词语，选择它在本课中的意思。',audioText:word.en,options:rotated([word.zh,content.vocabulary[(i+1)%8].zh,content.vocabulary[(i+4)%8].zh],i),answer:word.zh,explanation:`你听到的是 ${word.en}，意思是「${word.zh}」。`}])
  ]);
  const extraQuestions=content.extra.flatMap(([en,zh],i)=>{
    const gap=focusedGap(en,gapTargets[index][i+1]);
    return [{id:`${id}-extra-gap-focus-${i}`,type:'input',skill:'写',section:'表达填空',prompt:`表达「${zh}」，补上缺少的词。`,...gap,explanation:`完整表达：${en}`},
      {id:`${id}-order-${i}`,type:'order',skill:'表达准备',section:'组句练习',prompt:`把词语排成一句话，表达「${zh}」。`,tokens:rotated(en.split(' ').slice().reverse(),i+1),answer:en,explanation:`可以这样说：${en}`}];
  });
  for(const q of questions)q.knowledgeId=id+'-phrase-'+(q.id.endsWith('-read')?1:q.id.endsWith('-respond')||q.id.endsWith('-listen2')?2:0);
  for(const q of extraQuestions)q.knowledgeId=id+'-extra-'+q.id.at(-1);
  const dialogueText=content.dialogue.map(d=>d[1]).join('\n');
  const dialogueQuestions=[1,5].map((turn,i)=>({id:`${id}-dialogue-${i}`,type:'listen',skill:'听',section:'情境对话',prompt:i?'听完整段对话，最后一句表达什么意思？':'听完整段对话，第二位说话者第一次回应表达什么意思？',audioText:dialogueText,options:rotated([content.dialogue[turn][2],content.dialogue[(turn+2)%6][2],content.dialogue[(turn+4)%6][2]],index+i),answer:content.dialogue[turn][2],explanation:`对应原句是：${content.dialogue[turn][1]}` }));
  const readingQuestions=content.facts.map(([prompt,answer,distractors],i)=>({id:`${id}-reading-${i}`,type:'reading',skill:'读',section:'短文任务',prompt,passage:content.reading,translation:content.translation,options:rotated([answer,...distractors],index+i),answer,explanation:`根据短文，应选「${answer}」。${content.translation}`}));
  return {id,version:3,day:index+1,week:Math.floor(index/6)+1,title,headline,description,goal,phrases,vocabulary:content.vocabulary,dialogue:content.dialogue,dialogueText,reading:content.reading,translation:content.translation,tip:content.tip,questions:[...vocabularyQuestions,...questions.map(q=>({...q,section:'基础表达'})),...extraQuestions,...dialogueQuestions,...readingQuestions],speaking,minutes:25};
});
export function audioPath(text) {
  return audioManifest[text]?.path||null;
}
export function reviewQuestions(lesson,{round=0,weakQuestionIds=[]}={}){
  const selected=[],seenWords=new Set();
  const add=q=>{if(q?.wordId&&!seenWords.has(q.wordId)){selected.push(q);seenWords.add(q.wordId);}};
  for(const id of weakQuestionIds){add(lesson.questions.find(q=>q.id===id));if(selected.length>=2)break;}
  for(let i=0;selected.length<4&&i<8;i++){
    const word=lesson.vocabulary[(round*4+i)%8];const candidates=lesson.questions.filter(q=>q.wordId===word.id);
    add(candidates[(i+Math.floor(round/2))%candidates.length]);
  }
  const expressions=lesson.questions.filter(q=>q.section==='基础表达');
  const dialogues=lesson.questions.filter(q=>q.section==='情境对话');
  const reading=lesson.questions.filter(q=>q.section==='短文任务');
  return [...selected,expressions[round%expressions.length],expressions[(round+2)%expressions.length],dialogues[round%dialogues.length],reading[round%reading.length]];
}
