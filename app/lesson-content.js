// Every reading recycles the lesson's vocabulary in a concrete adult context.
// Alternatives are deliberately close enough to require comprehension.
const data = [
  {
    words:'hello|你好;name|名字;meet|认识；见面;nice|令人愉快的;from|来自;live|居住;China|中国;work|工作',
    extra:[['I’m from China.','我来自中国。'],['I live in Shanghai.','我住在上海。']],
    dialogue:[['A','Hello. My name is Anna.','你好。我叫安娜。'],['B','Hi, Anna. I’m Ben. Nice to meet you.','你好，安娜。我是本。很高兴认识你。'],['A','Nice to meet you, too. Where are you from?','我也很高兴认识你。你来自哪里？'],['B','I’m from Canada. Do you live here?','我来自加拿大。你住在这里吗？'],['A','Yes. I live and work in Shanghai.','是的。我在上海生活和工作。'],['B','I’m here for work, too.','我也是来这里工作的。']],
    reading:'Hello! My name is Anna. I am from China. I live in Shanghai, and I work in a shop. Today I meet Ben at work. He is from Canada. He says, “Nice to meet you.” I say, “Nice to meet you, too.” We talk for a short time.',
    translation:'你好！我叫安娜，来自中国。我住在上海，在一家店里工作。今天我在工作时认识了本。他来自加拿大。他说“很高兴认识你”，我也这样回应。我们简单聊了一会儿。',
    facts:[['Anna住在哪里？','Shanghai',['Canada','Beijing']],['谁来自加拿大？','Ben',['Anna','两个人都是']],['他们在哪里认识？','At work',['At the airport','At a hotel']]],
    tip:'I’m = I am。介绍自己时，可以用 I’m…；名字、来自哪里和住在哪里是不同的信息。'
  },
  {
    words:'say|说;speak|说话;slowly|慢慢地;again|再一次;write|写;understand|理解;repeat|重复;please|请',
    extra:[['I don’t understand.','我没听懂。'],['Could you repeat that, please?','请你重复一下好吗？']],
    dialogue:[['A','Your room is on the third floor.','你的房间在三楼。'],['B','Sorry, I don’t understand. Could you speak more slowly?','不好意思，我没听懂。你能说慢一点吗？'],['A','The third floor. Room three twelve.','三楼，312号房。'],['B','Could you say that again, please?','请你再说一遍好吗？'],['A','Room three twelve. I can write it down.','312号房。我可以写下来。'],['B','Thank you. Please write the room number here.','谢谢。请把房间号写在这里。']],
    reading:'Anna is at a hotel. The man speaks quickly. Anna does not understand the room number. She asks him to speak slowly and repeat it again. Then she says, “Could you write it down, please?” He writes 312 on a card. Now Anna knows her room number.',
    translation:'安娜在酒店。工作人员说得很快，她没听懂房间号。她请他慢一点，再重复一次，然后请他写下来。他在卡片上写了312，安娜这下知道房间号了。',
    facts:[['Anna最初没听懂什么？','房间号',['早餐价格','退房日期']],['卡片上写的数字是？','312',['213','321']],['哪种做法帮助她确认信息？','请对方写下来',['假装听懂','立即离开']]],
    tip:'Could you + 动词原形…? 可以礼貌地提出请求。say / speak / write 放在同一个位置替换。'
  },
  {
    words:'two|二;twelve|十二;twenty|二十;ticket|票;dollar|美元;number|数字；号码;need|需要;total|总计',
    extra:[['Two tickets, please.','请给我两张票。'],['Is that twenty dollars in total?','总共是二十美元吗？']],
    dialogue:[['A','Hello. How many tickets do you need?','你好。你需要几张票？'],['B','I need two tickets, please.','请给我两张票。'],['A','That’s twenty dollars in total.','总共二十美元。'],['B','Sorry, is that twelve or twenty?','不好意思，是十二还是二十？'],['A','Twenty. Two tickets, ten dollars each.','二十。两张票，每张十美元。'],['B','Thank you. Two tickets for twenty dollars.','谢谢。两张票，二十美元。']],
    reading:'Anna and Ben need two tickets. One ticket is ten dollars. The total is twenty dollars. Anna first hears the number twelve, so she checks it again. The seller writes 20 on the screen. Anna says, “Two tickets for twenty dollars. Thank you.”',
    translation:'安娜和本需要两张票。每张十美元，总计二十美元。安娜起初听成十二，所以又确认了一次。售票员在屏幕上写了20，她再次确认了数量和总价。',
    facts:[['他们需要几张票？','Two',['Twelve','Twenty']],['每张票多少钱？','Ten dollars',['Twenty dollars','Twelve dollars']],['总价是多少？','Twenty dollars',['Twelve dollars','Two dollars']]],
    tip:'ticket 是一张票，two tickets 是两张票。区分数量、单价和总价，不只听见一个数字就付款。'
  },
  {
    words:'water|水;help|帮助;bag|袋子;some|一些;have|有；得到;want|想要;need|需要;please|请',
    extra:[['I’d like a bag, please.','请给我一个袋子。'],['Can I have some water?','能给我一些水吗？']],
    dialogue:[['A','Hello. Do you need some help?','你好。你需要帮助吗？'],['B','Yes, please. I’d like some water.','是的，谢谢。我想要一些水。'],['A','Of course. Here you are.','当然。给你。'],['B','Thank you. Can I have a bag, too?','谢谢。能再给我一个袋子吗？'],['A','A small bag or a large bag?','小袋子还是大袋子？'],['B','A small bag, please. That’s all I need.','小袋子，谢谢。我只需要这些。']],
    reading:'Anna is in a small shop. She wants some water. She says, “Can I have some water, please?” The woman gives her a bottle. Anna also needs a bag. She does not want a large bag, so she asks for a small one. The woman is happy to help.',
    translation:'安娜在一家小店，想要一些水。店员给了她一瓶水。她还需要一个袋子，但不想要大袋子，所以要了一个小的。店员很乐意帮忙。',
    facts:[['Anna先要了什么？','Water',['Coffee','Milk']],['她要什么样的袋子？','A small bag',['A large bag','两个袋子']],['她一共表达了哪两种需求？','水和袋子',['水和票','咖啡和袋子']]],
    tip:'some water 表示一些水，不说 a water 来表示水这种物质；a bag 则是一个袋子。'
  },
  {
    words:'time|时间;open|开门；营业;nine|九;exit|出口;entrance|入口;closed|关闭的;today|今天;where|在哪里',
    extra:[['Is it open today?','今天营业吗？'],['The entrance is on the right.','入口在右边。']],
    dialogue:[['A','Excuse me. Is the museum open today?','打扰了。博物馆今天开放吗？'],['B','Yes. It opens at nine.','是的。九点开门。'],['A','Thank you. Where is the entrance?','谢谢。入口在哪里？'],['B','The entrance is on the right.','入口在右边。'],['A','And where is the exit?','那出口在哪里？'],['B','The exit is near the shop. We close at five.','出口在商店旁。我们五点关门。']],
    reading:'Today Anna visits a museum. A sign says “Open: 9:00–17:00.” It is eight thirty now, so the museum is still closed. Anna waits near the entrance. At nine, she goes in. Later she looks for the exit near the museum shop.',
    translation:'安娜今天参观博物馆。标识写着9点到17点开放。现在8点半，所以还没开门。她在入口附近等待，9点进去，后来在博物馆商店旁寻找出口。',
    facts:[['博物馆几点开门？','9:00',['8:30','17:00']],['8:30时能进去吗？','还不能',['可以','标识没有说明']],['出口在哪里？','Near the shop',['At the station','In the hotel']]],
    tip:'at nine 表示在九点。open 既可用于“营业的”，也可用于“开门”；closed 表示关闭状态。'
  },
  {
    words:'hello|你好;help|帮助;ticket|票;two|二;again|再一次;slowly|慢慢地;name|名字;thank|感谢',
    extra:[['My name is Anna.','我叫安娜。'],['Thank you for your help.','谢谢你的帮助。']],
    dialogue:[['A','Hello. Could you help me?','你好。你能帮帮我吗？'],['B','Of course. What do you need?','当然。你需要什么？'],['A','Two tickets, please. My name is Anna.','请给我两张票。我叫安娜。'],['B','Your tickets are for nine thirty.','你的票是九点半的。'],['A','Could you say that again, more slowly?','能再说一遍，慢一点吗？'],['B','Nine thirty. Here are your two tickets.','九点半。这是你的两张票。']],
    reading:'Anna can say hello and give her name. Today she asks for help at a ticket office. She needs two tickets. She does not understand the time at first. She asks the man to say it again slowly. Before she leaves, she says, “Thank you for your help.”',
    translation:'安娜已经能打招呼和说出姓名。今天她在售票处求助，想要两张票。起初她没听懂时间，就请工作人员再慢慢说一次。离开前，她感谢了对方的帮助。',
    facts:[['Anna在哪里？','At a ticket office',['At home','In a restaurant']],['她需要几张票？','Two',['One','Three']],['没听懂时她做了什么？','请求再慢慢说一次',['立即付款离开','改用大声说话']]],
    tip:'这一课以复用为主。把问候、需求、确认和感谢连起来，比单独背四句话更接近真实交流。'
  },
  {
    words:'coffee|咖啡;small|小的;large|大的;hot|热的;iced|加冰的;milk|牛奶;sugar|糖;cup|杯子',
    extra:[['No sugar, please.','请不要加糖。'],['With milk, please.','请加牛奶。']],
    dialogue:[['A','Hi. What would you like?','你好。你想要什么？'],['B','A small coffee, please.','请给我一小杯咖啡。'],['A','Hot or iced?','热的还是冰的？'],['B','Iced, with milk. No sugar, please.','冰的，加牛奶。请不要加糖。'],['A','A small iced coffee with milk, no sugar.','一小杯冰咖啡，加牛奶，不加糖。'],['B','Yes, that’s right. Thank you.','是的，没错。谢谢。']],
    reading:'Anna orders a coffee before work. She does not want a large cup. She wants a small iced coffee with milk. She does not want sugar. The worker checks the order aloud. Anna listens carefully and says, “Yes, that’s right.” Ben orders a large hot coffee.',
    translation:'上班前，安娜点了一小杯加牛奶、不加糖的冰咖啡。店员复述订单时，她认真听并确认正确。本则点了一大杯热咖啡。',
    facts:[['Anna要哪种咖啡？','Small and iced',['Large and hot','Small and hot']],['Anna加什么？','Milk',['Sugar','Milk and sugar']],['谁点了大杯热咖啡？','Ben',['Anna','店员']]],
    tip:'small / large 是大小，hot / iced 是冷热。with milk 表示加牛奶，no sugar 表示不加糖。'
  },
  {
    words:'here|这里;go|去；离开;sandwich|三明治;eat|吃;take|拿；带走;away|离开;food|食物;order|点单；订单',
    extra:[['For here, please.','我在这里吃。'],['Is this my order?','这是我的订单吗？']],
    dialogue:[['A','What would you like to eat?','你想吃什么？'],['B','I’d like a sandwich, please.','请给我一个三明治。'],['A','For here or to go?','在这里吃还是带走？'],['B','To go, please.','请打包。'],['A','Here is your food.','这是你的食物。'],['B','Thank you. I’ll take it away.','谢谢。我把它带走。']],
    reading:'Anna has a short lunch break. She orders a sandwich at a café. The worker asks, “For here or to go?” Anna cannot eat there today, so she says, “To go, please.” She takes the food back to work. Tomorrow she may have time to eat here.',
    translation:'安娜的午休很短。她在咖啡馆点了三明治，今天不能在那里吃，就请店员打包带走。她把食物带回单位，明天也许有时间堂食。',
    facts:[['Anna点了什么？','A sandwich',['A coffee','Two tickets']],['今天她堂食还是打包？','To go',['For here','没有点单']],['为什么打包？','午休时间短',['店里没有食物','订单丢了']]],
    tip:'to go 常用于美式点餐中的“打包”；take away 也表示带走。here 在这里指店里。'
  },
  {
    words:'price|价格;much|多少;pay|付款;card|卡;cash|现金;fifteen|十五;change|零钱；找零;receipt|收据',
    extra:[['Can I have a receipt?','能给我一张收据吗？'],['I’ll pay in cash.','我用现金付款。']],
    dialogue:[['A','How much is it?','这个多少钱？'],['B','Fifteen dollars, please.','十五美元，谢谢。'],['A','Can I pay by card?','我能刷卡吗？'],['B','Sorry, cash only today.','抱歉，今天只收现金。'],['A','Here is twenty dollars. Can I have a receipt?','这是二十美元。能给我收据吗？'],['B','Of course. Here is your change and receipt.','当然。这是找零和收据。']],
    reading:'The price of Anna’s lunch is fifteen dollars. She wants to pay by card, but the shop accepts cash only today. Anna gives the worker twenty dollars. She gets five dollars in change. She also asks for a receipt, so she can check the price later.',
    translation:'安娜的午餐十五美元。她想刷卡，但店里今天只收现金。她付了二十美元，拿回五美元找零，并要了一张收据，以便之后核对价格。',
    facts:[['午餐多少钱？','Fifteen dollars',['Five dollars','Twenty dollars']],['今天能刷卡吗？','不能，只收现金',['可以','只能手机支付']],['应找回多少钱？','Five dollars',['Fifteen dollars','Twenty dollars']]],
    tip:'by card 表示刷卡，in cash 表示用现金。change 在付款场景里常表示找零。'
  },
  {
    words:'table|桌子;menu|菜单;bill|账单;two|二;restaurant|餐厅;seat|座位;ready|准备好的;water|水',
    extra:[['Are you ready to order?','你准备好点餐了吗？'],['We’re not ready yet.','我们还没准备好。']],
    dialogue:[['A','Hello. A table for two, please.','你好。请安排两人桌。'],['B','Of course. Please take a seat.','当然。请坐。'],['A','Could I see the menu?','能看看菜单吗？'],['B','Here you are. Are you ready to order?','给你。你们准备好点餐了吗？'],['A','Not yet. Some water, please.','还没有。请给我们一些水。'],['B','Certainly. Take your time.','当然。慢慢看。']],
    reading:'Anna and Ben go to a restaurant. They need a table for two. A worker shows them their seats and gives them a menu. They are not ready to order yet, so they ask for water first. After the meal, Anna asks for the bill. They check it before paying.',
    translation:'安娜和本去餐厅，需要两人桌。店员带他们入座并给了菜单。他们还没准备好点餐，先要了水。用餐后，安娜要了账单，核对后再付款。',
    facts:[['需要几人桌？','Two',['One','Four']],['他们先要了什么？','Water',['The bill','A taxi']],['付款前他们做了什么？','核对账单',['预订房间','换座位']]],
    tip:'a table for two 是供两个人用的桌子。menu 是点餐前看的菜单，bill 是结账时看的账单。'
  },
  {
    words:'size|尺码;small|小的;smaller|更小的;milk|牛奶;looking|正在寻找;try|试;fit|合身;shop|商店',
    extra:[['Can I try it on?','我能试穿吗？'],['It doesn’t fit.','它不合身。']],
    dialogue:[['A','Hello. Can I help you?','你好。需要帮助吗？'],['B','I’m just looking, thank you.','我只是看看，谢谢。'],['A','Of course. Take your time.','当然。慢慢看。'],['B','Can I try this on?','我可以试穿这件吗？'],['A','Yes. Does it fit?','可以。合身吗？'],['B','It’s too large. Do you have a smaller size?','太大了。有小一点的尺码吗？']],
    reading:'Anna goes to a clothes shop. At first she is just looking. Then she finds a shirt and asks to try it on. It does not fit because it is too large. She asks for a smaller size. After shopping, she visits another shop because she is looking for milk.',
    translation:'安娜去服装店，起初只是看看。后来她找到一件衬衫并试穿，但太大、不合身，所以询问更小的尺码。之后她去另一家店买牛奶。',
    facts:[['衬衫为什么不合适？','太大',['太小','颜色不对']],['Anna接下来询问什么？','A smaller size',['A bigger bag','A table']],['之后她还要买什么？','Milk',['Coffee','Tickets']]],
    tip:'small 是小，smaller 是更小。try it on 表示试穿；fit 表示尺码是否合身。'
  },
  {
    words:'this|这个;one|一个；代替前面的物品;price|价格;card|卡;cash|现金;bag|袋子;receipt|收据;total|总计',
    extra:[['That’s all, thank you.','就这些，谢谢。'],['Could I have a bag and a receipt?','能给我袋子和收据吗？']],
    dialogue:[['A','I’d like this one, please.','我想要这个，谢谢。'],['B','Anything else?','还要别的吗？'],['A','That’s all. What’s the total price?','就这些。总价多少？'],['B','Twenty dollars. Card or cash?','二十美元。刷卡还是现金？'],['A','Card, please. Could I have a bag and a receipt?','刷卡。能给我袋子和收据吗？'],['B','Of course. Here you are.','当然。给你。']],
    reading:'Anna chooses one item in a shop. She points to it and says, “I’d like this one.” The total price is twenty dollars. She can pay by card or in cash. She chooses her card. Before leaving, she asks for a bag and checks the receipt. The price is correct.',
    translation:'安娜在商店选了一件物品，用“这个”表达购买意愿。总价二十美元，可以刷卡或付现金，她选择刷卡。离开前，她要了袋子并核对收据，价格正确。',
    facts:[['总价是多少？','Twenty dollars',['Ten dollars','Two dollars']],['她选择怎样付款？','By card',['In cash','没有付款']],['离开前要了哪两样？','袋子和收据',['水和菜单','票和护照']]],
    tip:'this one 可以在指着物品时替代具体名称；不认识商品英文名称时，也能先表达清楚。'
  },
  {
    words:'station|车站;straight|直行;left|左边;right|右边;turn|转弯;near|附近;street|街道;far|远的',
    extra:[['Is it far from here?','离这里远吗？'],['Turn right at the next street.','在下一条街右转。']],
    dialogue:[['A','Excuse me. Where is the station?','打扰了。车站在哪里？'],['B','Go straight, then turn left.','直走，然后左转。'],['A','Is it far from here?','离这里远吗？'],['B','No. It’s near the next street.','不远。在下一条街附近。'],['A','Straight, then left. Is that right?','直走，然后左转。对吗？'],['B','Yes. The station is on your right.','对。车站在你右边。']],
    reading:'Anna asks for the station. It is not far. She should go straight along this street and then turn left. After that, the station is on her right. A small shop is near the station. Anna repeats the directions before she starts walking, so she can check that she understands.',
    translation:'安娜询问车站位置，车站不远。她应沿着这条街直走，然后左转，之后车站会在右手边。车站附近有一家小店。出发前，她复述了一遍方向来确认。',
    facts:[['先做什么？','Go straight',['Turn right','Get off']],['之后向哪边转？','Left',['Right','不转弯']],['车站最终在她哪边？','Right',['Left','Behind her']]],
    tip:'turn left 是向左转；on your right 是在你的右手边。动作和最终位置是两条不同信息。'
  },
  {
    words:'bus|公交车;stop|车站；停下;next|下一个;off|离开（交通工具等）;station|车站;get|到达；得到;go|去;where|在哪里',
    extra:[['Is this the next stop?','这是下一站吗？'],['Please tell me when to get off.','请告诉我什么时候下车。']],
    dialogue:[['A','Does this bus go to the station?','这辆公交车去车站吗？'],['B','Yes. Get on here.','去。从这里上车。'],['A','Where should I get off?','我应该在哪里下车？'],['B','At the next stop.','下一站。'],['A','Please tell me when to get off.','请告诉我什么时候下车。'],['B','Of course. The next stop is the station.','当然。下一站就是车站。']],
    reading:'Anna gets on a bus. She checks that it goes to the station. The driver says she should get off at the next stop. Anna sits near the front so she can hear the driver. When the bus stops, she asks, “Is this the station?” The driver says yes.',
    translation:'安娜上公交车前确认车辆去车站。司机告诉她下一站下车。她坐在前面以便听见提醒。车辆停下时，她又确认是否到站，司机回答是。',
    facts:[['她的目的地是？','The station',['The hotel','The museum']],['应该哪站下车？','The next stop',['The last stop','Three stops later']],['她为什么坐前面？','方便听到司机提醒',['没有别的座位','需要付款']]],
    tip:'get on 上车，get off 下车。next stop 表示下一站，不是最终站。'
  },
  {
    words:'ticket|票;leave|离开；出发;time|时间;thirty|三十;single|单程的;return|往返的；返回;platform|站台;train|火车',
    extra:[['A single ticket, please.','请给我一张单程票。'],['Which platform does it leave from?','从哪个站台出发？']],
    dialogue:[['A','One ticket to Oxford, please.','请给我一张去牛津的票。'],['B','Single or return?','单程还是往返？'],['A','Single. What time does the train leave?','单程。火车几点出发？'],['B','At ten thirty, from platform two.','十点半，从二号站台出发。'],['A','Platform two, at ten thirty?','二号站台，十点半？'],['B','That’s right. Here is your ticket.','对。这是你的票。']],
    reading:'Anna buys a single ticket to Oxford. She does not need a return ticket today. Her train leaves at ten thirty from platform two. She checks the time on her ticket and then finds the platform. The train is there, but it does not leave until ten thirty.',
    translation:'安娜买了一张去牛津的单程票，今天不需要往返票。火车十点半从二号站台出发。她核对票上的时间，找到站台。火车已经停在那里，但要等到十点半才出发。',
    facts:[['她买了什么票？','Single',['Return','两张票']],['几点出发？','10:30',['10:13','12:30']],['从哪个站台出发？','Platform two',['Platform ten','Platform three']]],
    tip:'ten thirty 是10:30。single / return 是票的类型，platform 是站台，不能把站台号听成时间。'
  },
  {
    words:'reservation|预订;name|姓名;passport|护照;room|房间;night|晚上；住宿晚数;check-in|入住登记;hotel|酒店;key|钥匙',
    extra:[['I’d like to check in.','我想办理入住。'],['Could I have the room key?','能给我房间钥匙吗？']],
    dialogue:[['A','Hello. I’d like to check in.','你好。我想办理入住。'],['B','Do you have a reservation?','你有预订吗？'],['A','Yes. It’s under the name Anna.','有。预订姓名是安娜。'],['B','May I see your passport?','能看看你的护照吗？'],['A','Here is my passport. I booked two nights.','这是我的护照。我预订了两晚。'],['B','Thank you. Here is your room key.','谢谢。这是房间钥匙。']],
    reading:'Anna arrives at a hotel in the evening. She has a reservation for two nights. At check-in, the worker asks for her name and passport. The reservation is under Anna’s name. After checking the information, the worker gives her a key to room 312. Anna checks the room number.',
    translation:'安娜傍晚抵达酒店，已经预订两晚。办理入住时，工作人员询问姓名并查看护照。预订在安娜名下。核对信息后，工作人员给了她312号房间的钥匙，她再次确认了房号。',
    facts:[['预订了几晚？','Two nights',['One night','Three nights']],['办理入住时需要出示什么？','Passport',['Train ticket','Menu']],['房间号是多少？','312',['213','132']]],
    tip:'under the name… 表示预订登记在某人名下。这里的 night 用来计算住宿晚数。'
  },
  {
    words:'breakfast|早餐;password|密码;check-out|退房;Wi-Fi|无线网络;included|包含的;seven|七;eleven|十一;floor|楼层',
    extra:[['Is breakfast included?','包含早餐吗？'],['Breakfast is on the first floor.','早餐在一楼。']],
    dialogue:[['A','What time is breakfast?','早餐几点？'],['B','From seven to ten, on the first floor.','七点到十点，在一楼。'],['A','Is breakfast included?','包含早餐吗？'],['B','Yes. The Wi-Fi password is on this card.','包含。无线网络密码在这张卡上。'],['A','Thank you. What time is check-out?','谢谢。几点退房？'],['B','At eleven in the morning.','上午十一点。']],
    reading:'At Anna’s hotel, breakfast is included. It is served from seven to ten on the first floor. The Wi-Fi password is on a card in her room. Check-out is at eleven in the morning. Anna plans to eat breakfast at eight, then pack her bag and check out before eleven.',
    translation:'安娜住的酒店含早餐，供应时间为七点到十点，地点在一楼。无线网络密码在房内卡片上。上午十一点退房。她计划八点吃早餐，然后收拾行李并在十一点前退房。',
    facts:[['早餐最晚供应到几点？','10:00',['7:00','11:00']],['密码在哪里？','On a card',['On the menu','On the ticket']],['几点退房？','11:00',['8:00','10:00']]],
    tip:'from seven to ten 是从七点到十点的一段时间；at eleven 是十一点这一时间点。'
  },
  {
    words:'taxi|出租车;hotel|酒店;address|地址;take|带去；乘坐;here|这里;there|那里;station|车站;reservation|预订',
    extra:[['Here is the address.','这是地址。'],['How long does it take?','需要多长时间？']],
    dialogue:[['A','Where can I get a taxi?','在哪里可以打车？'],['B','Outside the station, on the left.','车站外面左边。'],['A','Please take me to this hotel. Here is the address.','请带我去这家酒店。这是地址。'],['B','Of course. It takes about twenty minutes.','当然。大概二十分钟。'],['A','Thank you. Please stop here.','谢谢。请在这里停车。'],['B','Here we are. The hotel is right there.','到了。酒店就在那里。']],
    reading:'Anna arrives at a new station. She finds a taxi outside on the left. She shows the driver her hotel address because she is not sure how to say the hotel name. The journey takes twenty minutes. At the hotel, she says she has a reservation and gives her name.',
    translation:'安娜到达陌生车站，在站外左边找到出租车。因为不确定酒店名称怎么说，她直接给司机看地址。车程二十分钟。到酒店后，她说明有预订并报上姓名。',
    facts:[['出租车在哪里？','Outside on the left',['Inside on the right','Near the museum']],['她怎样说明目的地？','给司机看地址',['只说车站','没有说明']],['车程多久？','Twenty minutes',['Two minutes','Twelve hours']]],
    tip:'take me to… 是带我去某地；How long does it take? 是问需要多久。这里的 take 含义不同。'
  },
  {
    words:'peanut|花生;allergic|过敏的;contain|含有;sugar|糖;milk|牛奶;without|没有；不加;safe|安全的;check|检查；确认',
    extra:[['Could you check the ingredients?','你能确认一下配料吗？'],['Without milk, please.','请不要加牛奶。']],
    dialogue:[['A','Does this contain peanuts?','这里面有花生吗？'],['B','I’m not sure. I can check.','我不确定。我可以确认一下。'],['A','Thank you. I’m allergic to peanuts.','谢谢。我对花生过敏。'],['B','This cake has peanuts. Please choose something else.','这个蛋糕有花生。请选别的。'],['A','I’ll have tea without milk or sugar, please.','那请给我不加牛奶和糖的茶。'],['B','Of course. I’ll check that for you, too.','当然。我也会替你确认。']],
    reading:'Anna is allergic to peanuts. She asks whether a cake contains peanuts. The worker is not sure, so Anna asks him to check. The cake is not safe for her. She chooses tea without milk or sugar instead. For a serious allergy, she also carries a clear written allergy card.',
    translation:'安娜对花生过敏。她询问蛋糕是否含花生，店员不确定，她就请他检查。蛋糕不适合她，她改选不加奶和糖的茶。有严重过敏时，她也随身携带明确的书面过敏说明卡。',
    facts:[['Anna对什么过敏？','Peanuts',['Sugar','Tea']],['店员最初不确定时该怎么做？','确认配料',['猜测没有花生','让她先吃一点']],['最后选择了什么？','Tea',['Cake','Milk']]],
    tip:'allergic to… 表示对……过敏。without milk 是不加牛奶；过敏需求需要明确确认，不能靠猜。'
  },
  {
    words:'gate|登机口;twelve|十二;baggage|行李;claim|领取;line|队伍;airport|机场;flight|航班;right|正确的；右边的',
    extra:[['Which gate is my flight leaving from?','我的航班从哪个登机口出发？'],['Is this the line for security?','这是安检队伍吗？']],
    dialogue:[['A','Excuse me. Is this the right line for security?','打扰了。这是安检队伍吗？'],['B','Yes. Which gate do you need?','是的。你要去哪个登机口？'],['A','Gate twelve. Where is it?','十二号登机口。它在哪里？'],['B','Go straight after security. It is on the right.','过安检后直走，它在右边。'],['A','Thank you. And where is baggage claim after arrival?','谢谢。抵达后在哪里取行李？'],['B','Follow the baggage claim signs when you arrive.','抵达后跟着行李提取标识走。']],
    reading:'Anna is at the airport. Her flight leaves from gate twelve. First she checks that she is in the right line for security. After security, she goes straight and finds the gate on her right. At her destination, she follows the baggage claim signs to collect her bag.',
    translation:'安娜在机场，航班从十二号登机口出发。她先确认安检队伍，过安检后直走，在右边找到登机口。到达目的地后，她跟着行李提取标识去拿行李。',
    facts:[['登机口是几号？','Twelve',['Twenty','Two']],['登机口在安检后的哪边？','Right',['Left','机场外面']],['什么时候去行李提取处？','抵达目的地后',['安检前','登机后立即去']]],
    tip:'right 可以表示右边，也可以表示正确的。right line 是正确的队伍，不一定是右边那条队。'
  },
  {
    words:'book|预订;room|房间;night|晚;included|包含的;booking|预订信息;date|日期;guest|住客;confirm|确认',
    extra:[['Could you confirm the dates?','你能确认一下日期吗？'],['The booking is for two guests.','预订是两位住客。']],
    dialogue:[['A','Could you check my booking?','你能查一下我的预订吗？'],['B','Of course. What is your name?','当然。你叫什么名字？'],['A','Anna. I booked a room for two nights.','安娜。我预订了住两晚的房间。'],['B','Yes. Two guests, Friday to Sunday.','是的。两位住客，周五到周日。'],['A','Is breakfast included?','包含早餐吗？'],['B','Yes. Your booking is confirmed.','包含。你的预订已确认。']],
    reading:'Booking confirmation: Guest name: Anna. Room: one double room. Guests: two. Check-in date: Friday. Check-out date: Sunday. Total stay: two nights. Breakfast: included. Anna reads the confirmation before travelling. She checks the guest name, dates, and number of nights, then saves a copy of the booking on her phone.',
    translation:'预订确认：住客安娜，一间双人房，两位住客，周五入住、周日退房，共两晚，含早餐。出发前，安娜核对姓名、日期和晚数，并在手机里保存了一份预订信息。',
    facts:[['住几晚？','Two nights',['Three nights','One night']],['几位住客？','Two',['One','Three']],['早餐是否包含？','Included',['Not included','没有说明']]],
    tip:'book 作动词是预订；booking 是预订信息。Friday 到 Sunday 通常住宿两晚，不能按三个日期算三晚。'
  },
  {
    words:'working|运转的;air conditioning|空调;room|房间;ordered|点过的;problem|问题;wrong|错误的;help|帮助;change|更换；改变',
    extra:[['There is a problem with my room.','我的房间有个问题。'],['Could I change rooms?','我可以换房间吗？']],
    dialogue:[['A','There is a problem with my room.','我的房间有个问题。'],['B','I’m sorry. What is wrong?','很抱歉。哪里有问题？'],['A','The air conditioning isn’t working.','空调不工作了。'],['B','I can ask someone to check it.','我可以请人检查。'],['A','Thank you. If it cannot be fixed, could I change rooms?','谢谢。如果修不好，我可以换房吗？'],['B','Yes. We can help you with that.','可以。我们可以帮你处理。']],
    reading:'Anna’s room is too hot. The air conditioning is not working. She calls the front desk and explains the problem. A worker comes to check it. If it cannot be fixed, Anna can change rooms. At dinner, she notices another problem: the food is not what she ordered. She asks for help politely.',
    translation:'安娜的房间太热，空调坏了。她打电话到前台说明问题，工作人员来检查。如果修不好，她可以换房。晚餐时，送来的食物也不是她点的，她礼貌地请求处理。',
    facts:[['房间有什么问题？','空调不工作',['钥匙丢了','没有预订']],['如果修不好，可以怎么做？','Change rooms',['加订三晚','重新买票']],['晚餐出现了什么问题？','送来的不是她点的',['没有座位','菜单丢了']]],
    tip:'isn’t working 表示不运转；ordered 是 order 的过去式。先说明问题，再提出具体请求。air conditioning 作为词组一起记。'
  },
  {
    words:'tomorrow|明天;yesterday|昨天;museum|博物馆;park|公园;went|去过（go的过去式）;lovely|美好的;plan|计划;visit|参观；拜访',
    extra:[['What are your plans for tomorrow?','你明天有什么计划？'],['I’d like to visit the museum.','我想参观博物馆。']],
    dialogue:[['A','What did you do yesterday?','你昨天做了什么？'],['B','I went to the park. It was lovely.','我去了公园。那里很美好。'],['A','What are your plans for tomorrow?','你明天有什么计划？'],['B','I’m going to visit the museum.','我打算去参观博物馆。'],['A','That sounds nice. What time?','听起来不错。几点？'],['B','At nine, when it opens.','九点，开门的时候。']],
    reading:'Yesterday Anna went to the park with Ben. The weather was good, and the park was lovely. Today she is resting at the hotel. Her plan for tomorrow is to visit the museum. It opens at nine, so she will leave after breakfast. She checks the address before she goes.',
    translation:'昨天安娜和本去了公园，天气很好，公园很美。今天她在酒店休息，明天计划参观博物馆。博物馆九点开门，所以她准备早餐后出发，并提前确认地址。',
    facts:[['昨天去了哪里？','The park',['The museum','The airport']],['今天在做什么？','在酒店休息',['在机场排队','参观博物馆']],['明天计划去哪里？','The museum',['The park','The station']]],
    tip:'yesterday 搭配过去发生的事，如 went；tomorrow 搭配计划，如 I’m going to…。先抓时间，再理解动作。'
  },
  {
    words:'change|修改;booking|预订;stay|停留；住宿;more|更多的;night|晚;available|可用的；有空房的;cost|花费;confirm|确认',
    extra:[['Is a room available for tomorrow?','明天有空房吗？'],['Could you confirm the new total?','你能确认新的总价吗？']],
    dialogue:[['A','Could you help me change my booking?','你能帮我修改预订吗？'],['B','Of course. What would you like to change?','当然。你想修改什么？'],['A','I’d like to stay one more night. Is a room available?','我想多住一晚。有空房吗？'],['B','Yes. It costs eighty dollars for the extra night.','有。多住一晚八十美元。'],['A','Does that include breakfast?','这个价格包含早餐吗？'],['B','Yes. I’ll confirm your new booking now.','包含。我现在确认新的预订。']],
    reading:'Anna wants to stay one more night. She asks the hotel to change her booking. A room is available, and the extra night costs eighty dollars. Breakfast is included. Anna asks the worker to confirm the new check-out date and total cost. She saves the updated booking before making other plans.',
    translation:'安娜想多住一晚，请酒店修改预订。酒店有空房，加住一晚八十美元，含早餐。她让工作人员确认新的退房日期和总费用，并保存更新后的预订，再安排其他计划。',
    facts:[['想多住多久？','One night',['Two nights','One week']],['额外一晚多少钱？','Eighty dollars',['Eighteen dollars','Eight dollars']],['修改后应确认什么？','新退房日期和总价',['只确认房号','只确认早餐时间']]],
    tip:'one more night 是再住一晚。修改预订后，确认新的日期、总价与包含项目。'
  }
];
export const lessonContent=data.map((item,index)=>({...item,vocabulary:item.words.split(';').map(pair=>{const [en,zh]=pair.split('|');const pool=[item.reading,...item.dialogue.map(d=>d[1]),...item.extra.map(p=>p[0])];const text=pool.find(t=>t.toLowerCase().includes(en.toLowerCase()))||item.reading;const sentences=text.match(/[^.!?]+[.!?]?[”"]?/g)||[text];return {id:`word-${en.toLowerCase().replace(/[^a-z0-9]/g,'-')}`,en,zh,example:sentences.find(s=>s.toLowerCase().includes(en.toLowerCase()))?.trim()||text};})}));
