'use strict';
const ASSETS=__ASSETS__;
const SCREENS={WELCOME:0,WORDS:1,ERRORS:2,REVIEW:3,GUIDANCE:4,MODULE_SUMMARY:5,DAILY_SUMMARY:6,GOODBYE:7,TOPICS:8,MODULES:9};
const FRAME_MAP=[0,1,2,3,4,5,6,7,1,1];
const TITLES=['欢迎','爱干净 · 单词','单词学习回顾','针对性补练','爱干净 · 生活问答','单词模块总结','今日学习总结','学习提醒与道别','选择学习主题','爱干净 · 学习地图'];
const WORDS={room:{en:'room',cn:'房间',scene:'clean',example:'This is my room.',tip:'room 是“房间”，小男孩正在介绍自己的房间。'},dirty:{en:'dirty',cn:'脏的',scene:'dirty',example:'My room is dirty.',tip:'玩具散落的房间不整洁，dirty 是“脏的”。'},clean:{en:'clean',cn:'干净的',scene:'clean',example:'My room is clean.',tip:'房间收拾好了，clean 是“干净的”，和 dirty 相反。'},tidy:{en:'tidy',cn:'整理',scene:'tidy',example:'Let’s tidy up.',tip:'把玩具放回篮子，就是 tidy，整理。'},wash:{en:'wash hands',cn:'洗手',scene:'hands'}};
const WORD_KEYS=['room','dirty','clean','tidy'];
const LINES=WORD_KEYS.map(k=>WORDS[k].example);
const LINE_CN=WORD_KEYS.map(k=>WORDS[k].tip);
const MODULES=[{id:'book',name:'绘本',icon:'📖',description:'跟着故事听英语'},{id:'words',name:'单词',icon:'Aa',description:'认识爱干净的小词语'},{id:'video',name:'视频',icon:'▶',description:'看动画学好习惯'},{id:'exercises',name:'习题',icon:'✓',description:'用小挑战巩固知识'}];
const TOPICS=[{id:'cleanliness',name:'爱干净',description:'整理房间 · 养成好习惯',icon:'✨'},{id:'food',name:'美味食物',description:'认识食物 · 发现美味',icon:'🍎'},{id:'sports',name:'快乐运动',description:'动一动 · 更有活力',icon:'🏀'},{id:'animals',name:'动物朋友',description:'走进有趣的动物世界',icon:'🐻'}];
const QUESTIONS=[
 {id:'room-meaning',key:'room',type:'choice',line:0,scene:'clean',prompt:'room 是什么意思？',target:'room',choices:['房间','玩具','手'],correct:0,hint:WORDS.room.tip},
 {id:'room-speaking',key:'room',type:'speech',line:0,scene:'clean',prompt:'轮到你说 room 啦！',target:'room',sampleWrong:'rom',hint:'先听 room，再把整个词说出来。'},
 {id:'dirty-picture',key:'dirty',type:'picture',line:1,scene:'dirty',prompt:'听 dirty，选对应的房间。',target:'dirty',choices:['收拾好的房间','玩具散落的房间'],scenes:['clean','dirty'],correct:1,hint:WORDS.dirty.tip},
 {id:'dirty-speaking',key:'dirty',type:'speech',line:1,scene:'dirty',prompt:'试着说 dirty。',target:'dirty',sampleWrong:'clean',hint:'dirty 是脏的，先听 dirty，再试着说一次。'},
 {id:'clean-picture',key:'clean',type:'picture',line:2,scene:'clean',prompt:'听 clean，选对应的房间。',target:'clean',choices:['收拾好的房间','玩具散落的房间'],scenes:['clean','dirty'],correct:0,hint:WORDS.clean.tip},
 {id:'clean-speaking',key:'clean',type:'speech',line:2,scene:'clean',prompt:'把 clean 完整说出来。',target:'clean',sampleWrong:'clen',hint:'先听 clean，再试着把整个词说出来。'},
 {id:'tidy-meaning',key:'tidy',type:'choice',line:3,scene:'tidy',prompt:'把玩具放回篮子，tidy 是什么？',target:'tidy',choices:['睡觉','吃饭','整理'],correct:2,hint:WORDS.tidy.tip},
 {id:'tidy-speaking',key:'tidy',type:'speech',line:3,scene:'tidy',prompt:'整理玩具时，可以说 tidy。试试吧！',target:'tidy',sampleWrong:'tie',hint:'先听 tidy，再把整个词说出来。'}
];
const WELCOME='你好呀，我是雪梨老师，今天我会陪你一起学英语，让我们开始今天的学习吧。';
const STORE='xueli-app-demo-v6';const DRAFT=STORE+'-draft';let reports=[];try{reports=JSON.parse(localStorage.getItem(STORE)||'[]');if(!Array.isArray(reports))reports=[]}catch{reports=[]}
let settings=readSettings(),state,timers=[],speechTimer=null,speechId=0,pendingSpeechCallback=null,modalMode='',currentVoice='',toastTimer=null;
const stage=document.querySelector('#stage'),fields=document.querySelector('#fields'),buttons=document.querySelector('#buttons'),modal=document.querySelector('#modal');
function escapeText(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(t){return String(t).toLowerCase().replace(/[’']/g,'').replace(/[^a-z\u4e00-\u9fff]/g,'')}
function createState(){return {schema:6,day:clientDay(),id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),page:0,selectedTopic:null,selectedModule:null,resumePage:1,moduleStarted:false,moduleCompleted:false,reviewFinished:false,wordIndex:0,wordsSeen:[],coachOverride:'',journey:[],welcomePlayed:false,line:0,lineHeard:[],lessonPhase:'learn',quizIndex:0,quizFeedback:'',exerciseRecords:[],reviewRecords:[],practiceReads:[],aiTurns:0,aiChat:[],queue:[],reviewIndex:0,reviewAttempts:0,reviewDone:false,reviewGuided:false,reviewPending:false,reviewFeedback:'',reviewLog:[],deepStarted:false,deepFinished:false,deepPhase:'intro',deepTurns:0,deepPrompt:false,deepChild:false,deepReply:false,deepCard:false,deepAnswer:'',deepResponse:'',deepLogs:[],deepPendingReply:null,deepReplyCount:0,newPart:'',oral:[],events:[],results:{},moduleReport:null,sessionReport:null,byePlayed:false,ended:false};}


function readSettings(){try{const v=JSON.parse(localStorage.getItem(STORE+'-settings')||'null');return {voice:typeof v?.voice==='boolean'?v.voice:true,autoDownload:typeof v?.autoDownload==='boolean'?v.autoDownload:true}}catch{return {voice:true,autoDownload:true}}}
function setSetting(name,value){if(!['voice','autoDownload'].includes(name))return;settings[name]=value;try{localStorage.setItem(STORE+'-settings',JSON.stringify(settings))}catch{}}
function resumeLabel(){return state.resumePage===4?'继续生活小问答 ›':state.resumePage===3?'继续单词补练 ›':state.resumePage===2?'看看单词学得怎么样 ›':'继续单词学习 ›'}
function clientDay(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function restoreDraft(){try{const d=JSON.parse(localStorage.getItem(DRAFT)||'null');if(d?.schema===6&&d.day===clientDay()&&Array.isArray(d.exerciseRecords)&&d.exerciseRecords.every(r=>question(r.questionId))){const savedPage=d.page;const n={...createState(),...d,page:0,coachOverride:''};if([1,2,3,4].includes(savedPage))n.resumePage=savedPage;return n}}catch{}return createState()}
function persistState(){try{localStorage.setItem(DRAFT,JSON.stringify(state))}catch{}}

state=restoreDraft();

function later(fn,delay){const id=state.id,page=state.page;const t=setTimeout(()=>{if(state.id===id&&state.page===page)fn()},delay);timers.push(t);return t}
function clearTimers(){timers.forEach(clearTimeout);timers=[]}
function stopSpeech(){pendingSpeechCallback=null;speechId++;clearTimeout(speechTimer);if(window.speechSynthesis)speechSynthesis.cancel();stage.classList.remove('speaking');}
function audioStatus(text){document.querySelector('#audio-status').textContent=text;}
function speak(text,lang='zh-CN',done){const follow=done||(state.page===4&&['asking','reply-speaking'].includes(state.deepPhase)?pendingSpeechCallback:null);stopSpeech();pendingSpeechCallback=follow;currentVoice=text;const id=speechId;let finished=false;function complete(ok){if(finished||id!==speechId)return;finished=true;clearTimeout(speechTimer);stage.classList.remove('speaking');audioStatus(ok?'语音播放结束':'点击老师或主按钮启用语音');pendingSpeechCallback=null;if(follow)follow(ok)}if(!settings.voice){audioStatus('语音已关闭');speechTimer=setTimeout(()=>complete(true),100);return}if(!window.speechSynthesis){complete(false);return}const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=.92;const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>lang==='zh-CN'?v.lang.startsWith('zh'):v.lang.startsWith('en'))||null;u.onstart=()=>{if(id===speechId){clearTimeout(speechTimer);speechTimer=setTimeout(()=>complete(false),Math.min(60000,Math.max(12000,text.length*500)));stage.classList.add('speaking');audioStatus('雪梨老师正在说话…')}};u.onend=()=>complete(true);u.onerror=()=>complete(false);audioStatus('正在准备语音…');speechTimer=setTimeout(()=>complete(false),6000);speechSynthesis.speak(u)}
function toast(t){clearTimeout(toastTimer);const n=document.querySelector('#toast');n.textContent=t;n.classList.remove('hidden');toastTimer=setTimeout(()=>n.classList.add('hidden'),2900)}
function resize(){const h=innerHeight-(document.fullscreenElement?0:56),s=Math.min(innerWidth/1280,h/590);stage.style.transform=`scale(${Math.max(.16,s)})`;}
addEventListener('resize',resize);document.addEventListener('fullscreenchange',resize);
function paint(x,y,w,h,content,classes='',style=''){fields.insertAdjacentHTML('beforeend',`<div class="paint ${classes}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${style}"><div style="width:100%">${content}</div></div>`)}
function hit(x,y,w,h,label,action,disabled=false,classes=''){const b=document.createElement('button');b.className='hit '+classes+(disabled?' blocked':'');b.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`;b.setAttribute('aria-label',label);b.title=label;b.disabled=disabled;b.onclick=action;buttons.append(b)}
function render(){const frame=FRAME_MAP[state.page];document.querySelector('#background').src=ASSETS.frames[frame];document.querySelector('#background').alt=TITLES[state.page];fields.innerHTML='';buttons.innerHTML='';document.querySelector('#scene-label').textContent=TITLES[state.page];stage.dataset.screen=state.page;setupCommon();[renderWelcome,renderLearning,renderErrors,renderReview,renderDeep,renderModule,renderSession,renderBye,renderTopics,renderModules][state.page]();if([1,8,9].includes(state.page))floatingMic();resize();persistState()}

function setupCommon(){
 const xs=state.page===0?[811,901,992,1085,1170]:[810,902,994,1088,1180];['商城','积分兑换','学习记录','活动中心','家长中心'].forEach((n,i)=>hit(xs[i],12,82,90,n,()=>n==='家长中心'||n==='学习记录'?openParent():openInfo(n)));hit(40,10,250,90,'个人主页',()=>openInfo('个人主页'));
 const mic=state.page===0?[1102,416,145,139]:state.page===3?[1116,439,133,122]:state.page===4?[1110,423,136,137]:state.page===7?[1117,435,136,129]:[1141,443,133,124];hit(...mic,'麦克风：孩子说话',openMic,state.ended||(state.page===4&&!['awaiting','expression'].includes(state.deepPhase)));
 const rect=state.page===0?[131,96,266,446]:state.page===7?[135,105,350,485]:state.page===3?[83,130,224,417]:[22,158,246,398];hit(...rect,[0,4,7].includes(state.page)?'雪梨老师：播放当前引导':'雪梨老师：提问或寻求帮助',[0,4,7].includes(state.page)?teacherSpeak:openTeacherChat);document.querySelector('#speech-wave').style.cssText=`left:${rect[0]+35}px;top:${rect[1]+30}px;width:145px;height:145px`;
 if(![0,7].includes(state.page)){
  choiceButton(319,39,151,29,state.page===8?'‹ 返回欢迎页':state.page===9?'‹ 选择其他主题':'‹ 返回学习地图',()=>state.page===8?goWelcome():state.page===9?goTopics():goModules(),'app-back');
  paint(480,39,300,29,state.page===8?'今日学习':`爱干净${state.page===9?' · 学习地图':' / 单词'}`,'app-breadcrumb');
 }
}

function enter(page){
 if(state.ended&&![0,5,6,8,9].includes(page))return;
 if([1,2,3,4,5,6,7,9].includes(page)&&state.selectedTopic!=='cleanliness'){goTopics();return}
 if([1,2,3,4,5,6,7].includes(page)&&state.selectedModule!=='words'){goModules();return}
 if([2,3,4,5,6,7].includes(page)&&state.exerciseRecords.length!==QUESTIONS.length){toast('先完成单词小检查，老师才有你的学习记录。');return}
 if(page===4&&state.queue.length&&!state.reviewFinished){toast('先完成这一轮补练，再把英语用到生活里。');return}
 if([5,6,7].includes(page)&&(!state.deepFinished||state.deepPhase!=='done')){toast('先完成这次生活问答，再看看今天的收获。');return}
 if(page===6&&!state.moduleCompleted){toast('先看看单词模块的学习回顾。');return}
 clearTimers();stopSpeech();dismiss();state.page=page;state.coachOverride='';state.aiTurns=0;state.aiChat=[];render();
 if(page===4){if(!state.deepStarted)startDeep();else resumeDeep()}
 if(page===5){const fresh=!state.moduleReport;saveModule();persistState();if(fresh)later(()=>speak(moduleSpeech()),200)}
 if(page===6){const fresh=!state.sessionReport;saveSession();persistState();if(fresh)later(()=>speak(sessionSpeech()),200)}
 if(page===7)later(()=>playBye(),250);
}

function teacherText(){if(state.page===0)return state.ended?'今天已经学完啦！可以看看学习记录，明天再继续。':WELCOME;if(state.page===8)return state.ended?'今天的单词任务已经完成啦，学习记录里可以看今天的收获。':'今天想学什么呢？爱干净已经开放，点它选一选吧。';if(state.page===9)return state.moduleCompleted?'单词学完啦！今天安排的一个模块已经完成，我们来看看今天的收获吧。':state.moduleStarted?'刚才的进度都保存着，点击单词，我们接着学。':'爱干净有绘本、单词、视频和习题。今天先学单词，认识 room、dirty、clean 和 tidy。';if(state.page===1)return state.lessonPhase==='quiz'?currentQuestion().prompt:WORDS[WORD_KEYS[state.wordIndex]].tip;if(state.page===2)return wrongRecords().length?`四个单词都学过啦！${wrongRecords().length} 次小检查还需要练一练，我们先练最需要帮助的几个词。`:'四个单词的小检查全部通过啦！我们把英语用到生活里吧。';if(state.page===3)return state.reviewFeedback||reviewPrompt();if(state.page===4)return state.deepReply?state.deepResponse:'除了整理房间，你还知道哪些爱干净的事情呀？';if(state.page===5)return moduleSpeech();if(state.page===6)return sessionSpeech();return byeSpeech()}

function teacherSpeak(){if(state.page===0)welcome(true,true);else if(state.page===7)playBye();else speak(teacherText())}
function renderWelcome(){paint(376,87,267,112,escapeText(welcomeText()),'welcome-copy');if(state.ended){paint(538,456,338,38,'查看今天的学习记录 ›','button-copy');hit(470,424,461,109,'查看今天的学习记录',()=>enter(8))}else hit(470,424,461,109,'开始今天的学习',()=>state.welcomePlayed?enter(8):welcome(true,true));}

function welcome(advance,initiated=false){clearTimers();speak(welcomeText(),'zh-CN',ok=>{state.welcomePlayed=ok;if(ok&&advance)enter(8);else if(!ok&&initiated&&advance){enter(8);toast('当前设备未能播报，先用文字继续；点击老师可以重试声音。')}else if(!ok)toast('点一下雪梨老师或“开始今天的学习”，就能启用声音。')})}


function coach(text){paint(129,153,146,62,escapeText(state.coachOverride||text),'coach-copy')}
function floatingMic(){const n=document.createElement('div');n.className='floating-mic';n.style.backgroundImage=`url("${ASSETS.frames[1]}")`;fields.append(n)}
function welcomeText(){return state.ended?'今天的学习已经完成啦！先休息，明天继续加油。':state.moduleStarted&&!state.moduleCompleted?'欢迎回来呀！刚才的学习进度都保存着，我们接着认识爱干净的小词吧。':WELCOME}
function catalogPanel(title,subtitle,badge){paint(283,114,916,417,'','catalog-surface');paint(306,127,613,48,escapeText(title),'catalog-heading');paint(308,178,650,26,escapeText(subtitle),'catalog-subheading');paint(1001,137,168,34,escapeText(badge),'catalog-badge')}
function catalogButton(x,y,w,h,html,label,action,classes=''){const b=document.createElement('button');b.className='catalog-card '+classes;b.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`;b.innerHTML=html;b.setAttribute('aria-label',label);b.onclick=action;buttons.append(b);return b}
function renderTopics(){
 catalogPanel('今天想学什么？',state.ended?'今天已经完成，来看看自己的学习收获吧。':'选一个喜欢的主题，雪梨老师陪你一起学。',state.ended?'今日已完成':'今日推荐');coach(state.ended?'今天学完啦！':'先选喜欢的主题吧～');
 TOPICS.forEach((t,i)=>{
  const open=t.id==='cleanliness',status=open?(state.ended?'今日已完成':state.moduleStarted?'继续学习':'可以学习'):'待解锁';
  const b=catalogButton(307+i*216,220,202,206,`<span class="card-badge ${open?'':'is-locked'}">${open?'★':'🔒'} ${status}</span><div class="catalog-art ${open?'':'emoji-art'}">${open?'':t.icon}</div><strong>${t.name}</strong><small>${t.description}</small>`,open?'爱干净，'+status:t.name+'，未解锁，查看说明',()=>open?selectTopic(t.id):explainLock('topic',t.name),open?'available':'locked');
  if(open){const n=b.querySelector('.catalog-art');n.style.backgroundImage=`url("${ASSETS.art}")`;n.style.backgroundSize='200% 200%';n.style.backgroundPosition='100% 0%'}
 });
 choiceButton(637,461,327,59,state.ended?'查看今天的收获 ›':state.moduleStarted?'继续爱干净 ›':'去看看爱干净 ›',()=>selectTopic('cleanliness'),'catalog-primary');
}
function renderModules(){
 const completed=completedWords();catalogPanel('爱干净 · 学习地图',state.moduleCompleted?'单词任务完成啦！其他模块会陆续开放。':'今天先学单词：看图认识，再开口试试。',`今日任务 ${state.moduleCompleted?'1':'0'}/1`);coach(state.moduleCompleted?'单词学完啦！<br>看看收获吧～'.replace('<br>',' '):state.moduleStarted?'进度已保存，接着学吧～':'今天先学单词吧！');
 MODULES.forEach((m,i)=>{
  const open=m.id==='words',status=open?(state.moduleCompleted?'已完成':state.moduleStarted?(state.resumePage===4?'生活问答中':state.resumePage===3?'正在补练':state.resumePage===2?'等待回顾':`进行中 ${completed}/4`):'今日推荐'):'待解锁';
  catalogButton(307+i*216,220,202,206,`<span class="card-badge ${open?'':'is-locked'}">${open?(state.moduleCompleted?'✓':'★'):'🔒'} ${status}</span><div class="module-icon ${m.id}">${m.icon}</div><strong>${m.name}</strong><small>${m.description}</small>${open?'<span class="module-detail">room · dirty · clean · tidy</span>':''}`,open?(state.moduleCompleted?'单词，已完成，查看回顾':state.moduleStarted?'单词，进行中，继续学习':'单词，今日推荐，开始学习'):m.name+'，未解锁，查看说明',()=>open?(state.moduleCompleted?enter(5):startModule()):explainLock('module',m.name),open?'available '+(state.moduleCompleted?'completed':''):'locked');
 });
 choiceButton(637,461,327,59,state.moduleCompleted?'查看今天的收获 ›':state.moduleStarted?resumeLabel():'开始学单词 ›',()=>state.moduleCompleted?enter(6):startModule(),'catalog-primary');
}
function explainLock(kind,name){state.coachOverride=kind==='topic'?'先学「爱干净」吧～':'今天先学单词哦～';const text=kind==='topic'?`${name}还没开放，今天先选爱干净，老师陪你学。`:`${name}会陆续开放，今天先完成单词任务。`;render();toast(text);speak(text)}
function selectTopic(id){if(id!=='cleanliness')return;state.selectedTopic=id;state.journey.push({action:'选择主题',topic:id,time:Date.now()});enter(9);speak(teacherText())}
function completedWords(){return WORD_KEYS.filter(k=>state.exerciseRecords.filter(r=>r.key===k).length===2).length}
function startModule(){
 if(state.moduleCompleted){enter(5);return}state.selectedModule='words';const resume=state.moduleStarted;state.moduleStarted=true;
 if(!resume){state.wordIndex=0;state.line=0;state.lessonPhase='learn';state.resumePage=1}
 state.journey.push({action:resume?'继续单词模块':'开始单词模块',module:'words',resumePage:state.resumePage,time:Date.now()});
 enter(state.resumePage||1);if(state.page!==4)speak(resume?'刚才的进度都保存着。'+teacherText():'我们先认识四个小词。'+teacherText());
}
function rememberTask(){if([1,2,3,4].includes(state.page))state.resumePage=state.page}
function goModules(){rememberTask();enter(9);speak(teacherText())}
function goTopics(){rememberTask();enter(8);speak(teacherText())}
function goWelcome(){rememberTask();enter(0)}
function taskSteps(){paint(771,190,393,29,`<span class="${state.lessonPhase==='learn'?'active':''}">① 认识词卡</span><span class="${state.lessonPhase==='quiz'&&currentQuestion().type!=='speech'?'active':''}">② 看图理解</span><span class="${state.lessonPhase==='quiz'&&currentQuestion().type==='speech'?'active':''}">③ 开口说词</span>`,'word-steps')}

function question(id){return QUESTIONS.find(q=>q.id===id)}
function currentQuestion(){return QUESTIONS[state.quizIndex]}
function currentReview(){return question(state.queue[state.reviewIndex])}
function answerText(q,response){return q.type==='speech'?String(response):(q.choices[Number(response)]??String(response))}
function targetText(q){return q.type==='speech'?q.target:q.choices[q.correct]}
function wrongReason(q,response,unclear=false){if(unclear)return '这次识别结果不清楚，还不能确认这个词说完整。';if(q.type==='speech')return `识别为“${response}”，目标是 ${q.target}，这个词还要再说一说。`;return `选了“${answerText(q,response)}”。${q.hint}`}

function grade(q,response,unclear=false){return !unclear&&(q.type==='speech'?norm(response)===norm(q.target):Number(response)===q.correct)}
function syncResults(){
 const keys=[...new Set(QUESTIONS.map(q=>q.key))];
 for(const k of keys){
  const expected=QUESTIONS.filter(q=>q.key===k), answered=state.exerciseRecords.filter(r=>r.key===k);
  if(!answered.length){delete state.results[k];continue}
  const unresolved=answered.some(r=>!r.pass&&!state.reviewRecords.some(v=>v.questionId===r.questionId&&v.pass&&!v.guided));
  state.results[k]=unresolved?'review':answered.length===expected.length?'mastered':'learning';
 }
}
function wrongRecords(){return state.exerciseRecords.filter(r=>!r.pass)}
function unresolvedRecords(){return wrongRecords().filter(r=>!state.reviewRecords.some(v=>v.questionId===r.questionId&&v.pass&&!v.guided))}
function choiceButton(x,y,w,h,label,action,classes='',disabled=false){
 const b=document.createElement('button');b.className='exercise-choice '+classes;b.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`;b.textContent=label;b.disabled=disabled;b.onclick=action;buttons.append(b);return b;
}
function sceneArt(x,y,w,h,scene,classes=''){
 const n=document.createElement('div');n.className='scene-art '+classes;n.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px;background-position:${{clean:'100% 0%',dirty:'0% 0%',tidy:'0% 100%',hands:'100% 100%'}[scene]||'100% 0%'}`;n.style.backgroundImage=`url("${ASSETS.art}")`;fields.append(n);
}
function courseFrame(){fields.insertAdjacentHTML('beforeend',`<img class="course-content" src="${ASSETS.course}" style="clip-path:inset(20.5% 34% 70.5% 27.5%)" alt="A Clean Room"><img class="course-content" src="${ASSETS.course}" style="clip-path:polygon(23.45% 31.2%,91.3% 31.2%,91.3% 76.2%,57.3% 76.2%,57.3% 88%,23.45% 88%)" alt="爱干净课程插图与句子">`)}
function courseProgress(fraction){paint(1013,144,157,14,`<div class="progress-fill" style="width:${Math.round(fraction*100)}%"></div>`,'course-progress');}
function startQuiz(){if(state.lessonPhase!=='learn')return;stopSpeech();dismiss();state.lessonPhase='quiz';const first=state.wordIndex*2;state.quizIndex=state.exerciseRecords.some(r=>r.questionId===QUESTIONS[first].id)&&!state.exerciseRecords.some(r=>r.questionId===QUESTIONS[first+1].id)?first+1:first;state.aiTurns=0;state.aiChat=[];render();speak(currentQuestion().prompt)}

function renderQuiz(){
 const q=currentQuestion(),r=state.exerciseRecords.find(r=>r.questionId===q.id);paint(772,225,395,46,escapeText(q.prompt),'quiz-prompt','font-size:19px');
 if(q.type==='picture'){
  q.scenes.forEach((scene,i)=>{sceneArt(780+i*196,278,175,97,scene,'quiz-option-art');choiceButton(780+i*196,379,175,29,q.choices[i],()=>submitQuiz(i),r?(r.response===i?(r.pass?'correct':'incorrect'):''):'',!!r)});
  hit(1135,232,28,31,'听题目单词 '+q.target,()=>speak(q.target,'en-US'));paint(1135,232,26,29,'♪','quiz-target','color:#1c79ff');
 }else if(q.type==='choice')q.choices.forEach((label,i)=>choiceButton(773,278+i*44,390,36,label,()=>submitQuiz(i),r?(r.response===i?(r.pass?'correct':'incorrect'):''):'',!!r));
 else{paint(775,279,390,75,escapeText(q.target),'quiz-reading','font-size:46px');choiceButton(784,363,157,40,'先听一遍',()=>speak(q.target,'en-US'));choiceButton(960,363,197,40,r?'已提交回答':'点击麦克风说词',openMic,'',!!r)}
 paint(774,413,391,32,r?escapeText(quizFeedback(r)):(q.type==='speech'?'点击右下角麦克风，试着说这个词。':'选一个答案，看看你理解了吗。'),'quiz-feedback '+(r?(r.pass?'pass':'fail'):''),'font-size:13px');
 const label=r?(q.type==='speech'?(state.wordIndex===3?'看看学得怎么样':'学下一个单词'):'开口说 '+q.target):(q.type==='speech'?'先开口说词':'先选一个答案');
 paint(843,477,226,37,label+(r?' ›':''),'button-copy','font-size:23px');hit(813,460,288,70,label,nextQuiz,!r);
 choiceButton(331,479,151,28,'再看看词卡',()=>{state.lessonPhase='learn';render()},'peek-card');
}


function quizFeedback(r){const q=question(r.questionId);return r.pass?(q.type==='speech'?`${q.target} 说出来啦！`:`对啦！${q.target} 的意思分清啦。`):q.type==='speech'?`这次识别为 ${r.answer}，老师记下了，稍后再练。`:'这题还没分清，老师稍后会陪你再看一看。'}
function buildReviewQueue(){const priority=['room','clean','dirty','tidy'],failed=wrongRecords();state.reviewFocus=priority.filter(k=>failed.some(r=>r.key===k)).slice(0,3);return failed.filter(r=>state.reviewFocus.includes(r.key)).map(r=>r.questionId)}

function submitQuiz(response,unclear=false){
 const q=currentQuestion();if(state.page!==1||state.lessonPhase!=='quiz'||state.exerciseRecords.some(r=>r.questionId===q.id))return;
 const pass=grade(q,response,unclear),text=unclear?'识别不清楚':answerText(q,response);if(q.type==='speech')recordChild(text,'单词开口检查');
 const r={questionId:q.id,key:q.key,type:q.type,prompt:q.prompt,target:q.target,teachingLine:WORDS[q.key].tip+' '+WORDS[q.key].example,response,answer:text,expected:targetText(q),pass,reason:pass?'本次检查通过':wrongReason(q,response,unclear),time:Date.now()};
 state.exerciseRecords.push(r);state.events.push({key:q.key,questionId:q.id,pass,guided:false,source:'单词小检查',answer:text,time:r.time});syncResults();state.quizFeedback=quizFeedback(r);dismiss();render();speak(state.quizFeedback);
}

function nextQuiz(){
 if(!state.exerciseRecords.some(r=>r.questionId===currentQuestion().id))return;
 stopSpeech();if(currentQuestion().type!=='speech'){state.quizIndex++;state.aiTurns=0;state.aiChat=[];render();speak(currentQuestion().prompt);return}
 if(state.wordIndex<3){state.wordIndex++;state.line=state.wordIndex;state.quizIndex=state.wordIndex*2;state.lessonPhase='learn';state.aiTurns=0;state.aiChat=[];render();speak(teacherText());return}
 state.queue=buildReviewQueue();state.reviewFinished=!state.queue.length;state.resumePage=2;enter(2);speak(teacherText());
}

function renderLearning(){
 courseFrame();paint(367,126,455,45,'爱干净 · 学单词','word-course-title');paint(962,136,48,29,`${state.wordIndex+1}/4`,'progress-copy');courseProgress((Math.max(state.wordsSeen.length,state.wordIndex+1)+state.exerciseRecords.length)/(WORD_KEYS.length+QUESTIONS.length));
 const k=WORD_KEYS[state.wordIndex],w=WORDS[k];if(!state.wordsSeen.includes(k))state.wordsSeen.push(k);sceneArt(300,184,434,334,w.scene,'course-art');paint(750,182,435,267,'','exercise-board');taskSteps();
 if(state.lessonPhase==='quiz'){renderQuiz();coach(currentQuestion().type==='speech'?`轮到你说 ${w.en} 啦！`:'看图，选一选～');return}
 if(!state.wordsSeen.includes(k))state.wordsSeen.push(k);
 paint(774,232,390,82,escapeText(w.en),'word-big');paint(777,313,385,41,escapeText(w.cn),'word-translation');paint(783,355,376,31,escapeText(w.example),'word-example');
 choiceButton(817,399,146,42,'听一听 '+w.en,()=>speak(w.en,'en-US'),'word-audio');choiceButton(981,399,171,42,'问问雪梨老师',openTeacherChat,'word-help');
 paint(843,477,226,37,`试试 ${w.en} ›`,'button-copy');hit(813,460,288,70,'试试 '+w.en,startQuiz);coach(`来认识 ${w.en} 吧！`);
}

function listen(i){state.line=i;if(!state.lineHeard.includes(i))state.lineHeard.push(i);render();speak(LINES[i],'en-US')}
function renderErrors(){
 const wrong=wrongRecords(),n=state.exerciseRecords.length,weak=[...new Set(wrong.map(r=>r.key))];
 paint(369,117,270,48,'单词学习回顾','cream','font-size:30px;text-align:left');paint(290,210,182,48,'Aa  单词理解','cream','font-size:23px;text-align:left');paint(290,300,182,48,'◖))  开口说词','cream','font-size:23px;text-align:left');paint(290,399,182,48,'✓  小检查','cream','font-size:23px;text-align:left');
 paint(925,126,150,43,wrong.length?`${weak.length} 个词再练练`:'本轮全对！','cream','font-size:17px');if(!wrong.length)paint(680,125,145,40,'全部通过','cream','font-size:29px');
 const display=weak.slice();for(const k of WORD_KEYS)if(display.length<3&&!display.includes(k))display.push(k);
 display.slice(0,3).forEach((k,i)=>{const x=[500,660,811][i];paint(x,199,134,60,`<strong>${WORDS[k].en}</strong><br><small>${WORDS[k].cn} · ${weak.includes(k)?'再练练':'已通过'}</small>`,'cream word-copy '+(weak.includes(k)?'needs-review':'passed-word'));hit(x,192,143,78,'查看 '+k+' 的学习记录',()=>showQuestionRecords(k));paint(x+112,205,19,27,'♪','cream','font-size:22px;color:#ffb01b');hit(x+109,199,25,38,'朗读复习词：'+k,()=>speak(k,'en-US'))});
 const speech=state.exerciseRecords.filter(r=>r.type==='speech'),displayed=[...speech.filter(r=>!r.pass),...speech.filter(r=>r.pass)].slice(0,2);
 displayed.forEach((r,i)=>{const x=i===0?494:818;paint(x,292,i===0?314:256,70,`<span class="answer-state ${r.pass?'yes':'no'}">${r.pass?'✓':'×'}</span><div><b>${r.target}</b><small>${r.pass?'这个词说出来啦':'还需再说一说'}<br>识别为：${escapeText(r.answer)}</small></div>`,r.pass?'green error-sentence':'rose error-sentence');hit(x,289,i===0?313:257,75,'查看 '+r.target+' 的开口记录',()=>showQuestionRecords(r.key))});
 paint(579,421,29,34,n,'white number','color:#ff7a03');paint(776,421,32,34,n-wrong.length,'white number','color:#ff7a03');paint(957,421,34,34,wrong.length,'white number','color:#ff7a03');
 hit(494,471,347,67,wrong.length?'陪我再练一练':'把英语用到生活里',()=>wrong.length?beginReview():enter(4));paint(548,489,240,32,wrong.length?'陪我再练一练 ›':'把英语用到生活里 ›','button-copy','font-size:24px');hit(952,195,124,77,'查看更多学习记录',showWeak);
}

function showQuestionRecords(key){
 const rows=state.exerciseRecords.filter(r=>!key||r.key===key);
 show('单词小检查 · 原始记录',rows.map(r=>`<div class="record-row"><b>第 ${QUESTIONS.findIndex(q=>q.id===r.questionId)+1} 题：${escapeText(r.prompt)}</b><p>孩子的答案：${escapeText(r.answer)}<br>正确答案：${escapeText(r.expected)}<br>${escapeText(r.reason)}</p><small>对应教学：${escapeText(r.teachingLine)}</small></div>`).join(''));
}

function reviewPrompt(){const q=currentReview(),r=state.exerciseRecords.find(r=>r.questionId===q.id);return q.type==='speech'?`刚才识别为 ${r.answer}，我们再把 ${q.target} 说一次吧～`:`刚才 ${q.target} 的意思还没分清，我们一起再看看吧～`}

function beginReview(){state.queue=buildReviewQueue();if(!state.queue.length){state.reviewFinished=true;enter(4);return}state.reviewIndex=0;prepareReview();state.resumePage=3;enter(3);speak(reviewPrompt())}

function prepareReview(){state.reviewAttempts=0;state.reviewDone=false;state.reviewGuided=false;state.reviewPending=false;state.reviewFeedback='';state.reviewLog=[{role:'teacher',text:reviewPrompt()}]}
function renderReview(){
 const q=currentReview();if(!q)return;const word=WORDS[q.key],original=state.exerciseRecords.find(r=>r.questionId===q.id);
 sceneArt(368,188,231,197,q.scene,'review-art');
 paint(411,400,183,42,escapeText(q.target),'review-target','font-size:'+(q.target.length>12?16:30)+'px;line-height:1.25');
 paint(326,75,394,73,escapeText(reviewPrompt()),'review-prompt','font-size:21px;line-height:1.45');
 if(q.type!=='speech'&&!state.reviewDone&&!state.reviewPending){
  paint(746,202,262,141,`<strong>再试同一道题</strong><p>${escapeText(q.prompt)}</p>`,'review-feedback review-task');
  q.choices.forEach((label,i)=>choiceButton(753,253+i*29,248,25,label,()=>submitReview(i),'review-choice'));
 }else paint(745,207,262,132,`<strong>${state.reviewDone?(state.reviewGuided?'一起完成啦！':'Well done!'):state.reviewPending?'跟着老师试试':state.reviewAttempts?'再试一次吧':'说出这个词'}</strong><p>${escapeText(state.reviewFeedback||'刚才识别为 '+original.answer+'。先听一遍，再说 '+q.target+'。')}</p><span class="stars">${state.reviewDone&&!state.reviewGuided?'★★★':state.reviewDone?'★☆☆':'☆☆☆'}</span>`,'review-feedback');
 hit(348,392,67,63,'目标标准发音',()=>speak(q.target,'en-US'));hit(710,365,78,89,'再听一遍',()=>speak(q.target,'en-US'));
 hit(853,365,86,91,'提示一下',()=>{state.reviewFeedback=q.hint;render();toast(q.hint);speak(q.hint)});
 hit(474,472,378,78,state.reviewPending?'跟老师完成并继续':state.reviewIndex===state.queue.length-1?'进入生活引导':'下一个错题',nextReview,!state.reviewDone&&!state.reviewPending);
 paint(533,495,270,34,state.reviewPending?'跟老师完成并继续 ›':state.reviewDone?(state.reviewIndex===state.queue.length-1?'进入生活引导 ›':'下一个错题 ›'):`补练 ${state.reviewIndex+1}/${state.queue.length}`,'button-copy','font-size:23px');
}
function recordChild(text,source){state.oral.push({text,source,time:Date.now(),scope:state.page===4?'theme':'module'})}

function setResult(key,pass,source,guided=false){state.results[key]=pass&&!guided?'mastered':'review';state.events.push({key,pass,guided,source,time:Date.now()})}
function submitReview(response,unclear=false,oralInput=false){
 if(state.page!==3||state.reviewDone||state.reviewPending)return;const q=currentReview(),text=unclear?'识别不清楚':answerText(q,response);state.reviewAttempts++;
 if(q.type==='speech'||oralInput)recordChild(unclear?'识别不清楚':text,'错题补练');
 const pass=grade(q,response,unclear),r={questionId:q.id,key:q.key,type:q.type,response,answer:text,pass,guided:false,attempt:state.reviewAttempts,reason:pass?'同一难点补练通过':wrongReason(q,response,unclear),time:Date.now()};
 state.reviewRecords.push(r);state.events.push({key:q.key,questionId:q.id,pass,guided:false,source:'错题补练',answer:text,time:r.time});syncResults();state.reviewLog.push({role:'child',text});
 if(pass){state.reviewDone=true;state.reviewFeedback=q.type==='speech'?q.target+' 这次说出来啦！这个开口难点已解决。':'这次意思分清啦！这道错题已解决。'}
 else if(state.reviewAttempts>=2){state.reviewPending=true;state.reviewFeedback='我们跟老师完成一遍，再继续。这个难点保留在明天的复习计划里。'}
 else state.reviewFeedback=q.hint;
 state.reviewLog.push({role:'teacher',text:state.reviewFeedback});dismiss();render();toast(state.reviewFeedback);speak(state.reviewFeedback);
}
function nextReview(){
 const q=currentReview();
 if(state.reviewPending){
  const finishGuided=()=>{if(state.page!==3)return;state.reviewRecords.push({questionId:q.id,key:q.key,type:q.type,answer:targetText(q),pass:false,guided:true,attempt:state.reviewAttempts,time:Date.now()});state.events.push({key:q.key,questionId:q.id,pass:false,guided:true,source:'老师带练',time:Date.now()});syncResults();state.reviewPending=false;state.reviewGuided=true;state.reviewDone=true;advanceReview()};
  // Teacher demonstration is not a child's utterance and does not erase the error.
  speak(q.type==='speech'?q.target:q.hint,q.type==='speech'?'en-US':'zh-CN',finishGuided);return;
 }
 if(state.reviewDone)advanceReview();
}
function advanceReview(){if(state.reviewIndex<state.queue.length-1){state.reviewIndex++;prepareReview();render();speak(reviewPrompt())}else{state.reviewFinished=true;state.resumePage=4;enter(4)}}

function fragment(part){fields.insertAdjacentHTML('beforeend',`<div class="deep-fragment ${part} ${state.newPart===part?'fresh':''}"></div>`);fields.lastElementChild.style.backgroundImage=`url("${ASSETS.frames[FRAME_MAP[state.page]]}")`}
function blankStrip(x,y,w,h){const n=document.createElement('div');n.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden`;const strip=document.createElement('div');strip.style.cssText=`width:6px;height:${h}px;transform:scaleX(${w/6});transform-origin:left top;background-size:1280px 590px;background-position:-300px -${y}px`;strip.style.backgroundImage=`url("${ASSETS.frames[FRAME_MAP[state.page]]}")`;n.append(strip);fields.append(n)}
function renderDeep(){blankStrip(307,88,477,14);blankStrip(307,102,661,390);if(state.deepPrompt)fragment('prompt');if(state.deepChild){fragment('child');paint(724,195,128,39,escapeText(state.deepAnswer),'deep-child-copy','font-size:'+(state.deepAnswer.length>6?16:23)+'px')};if(state.deepReply){fragment('reply');paint(429,258,440,98,escapeText(state.deepResponse).replaceAll('wash hands','<span style="color:#ff6410">wash hands</span>'),'deep-reply-copy','font-size:'+(state.deepResponse.length>65?18:21)+'px');nativeSprite(849,289,62,59)};if(state.deepCard){fragment('expression');hit(846,395,83,82,'朗读 wash hands',()=>speak('wash hands','en-US'))}if(state.deepPrompt)hit(777,107,49,61,'重听老师的问题',()=>speak('除了整理房间，你还知道哪些爱干净的事情呀？'));if(state.deepReply)hit(848,285,62,63,'重听老师反馈',()=>speak(state.deepResponse));hit(485,492,310,72,state.deepPhase==='guided'?'跟读并继续':'继续，查看模块学习总结',deepContinue,!['done','guided'].includes(state.deepPhase));if(state.deepPhase==='guided')paint(552,508,171,35,'跟读并继续','button-copy');state.newPart='';}
function startDeep(){if(state.deepStarted)return;state.deepStarted=true;state.deepPhase='intro';later(()=>{state.deepPrompt=true;state.newPart='prompt';state.deepPhase='asking';render();const text='除了整理房间，你还知道哪些爱干净的事情呀？';state.deepLogs.push({role:'teacher',text});speak(text,'zh-CN',()=>{if(state.page===4){state.deepPhase='awaiting';render()}})},400)}
function submitDeep(text){
 if(!['awaiting','expression'].includes(state.deepPhase)||state.deepFinished)return;const expression=state.deepPhase==='expression';state.deepTurns++;recordChild(text,'主题生活问答');state.deepLogs.push({role:'child',text});
 if(!expression){state.deepAnswer=text;state.deepChild=true;state.newPart='child';state.deepReply=false}
 let response='',next='awaiting',pass=false;
 if(expression){if(norm(text)===norm('wash hands')){response='你会说 wash hands 啦！饭前和玩耍后要洗手，也可以提醒爸爸妈妈。';next='done';pass=true}else if(state.deepTurns>=3){response='我们一起跟读 wash hands，今天先认识它，下次再自己说一说。';next='guided'}else{response='试着把英语表达说完整：wash hands。我们再试一次就好。';next='expression'}}
 else{const related=/洗手|洗脸|洗澡|刷牙|洗衣|收拾|整理|收.*玩具|扫地|拖地|吸尘|擦|打扫|垃圾|卫生|干净|wash|hand|brush|bath|clean|tidy/i.test(text);if(related){response=/不(?:想|要|用|爱|愿意)?洗手|不刷牙|dontwash|don't wash|don’t wash/i.test(text)?'洗手很重要哦！饭前和玩耍后，我们要 wash hands，保护自己，也提醒爸爸妈妈。':/洗手|wash|hand/i.test(text)?'对啦！如果手脏了我们要 wash hands，爸爸妈妈手脏了也要提醒他们 wash hands 哦。':/扫地|拖地|吸尘|打扫|擦/i.test(text)?'扫地、打扫也能让房间更干净！打扫后我们还要 wash hands，把小手洗干净。':'这也是爱干净的好习惯！今天我们再认识 wash hands，饭前要洗手，也可以提醒爸爸妈妈。';next=state.deepTurns>=3?'guided':'expression'}else if(state.deepTurns>=3){response='我们先看一个例子：饭前要洗手，wash hands。跟着老师读一遍，完成今天的小挑战。';next='guided'}else response='这个很有趣，不过我们先把刚才的问题完成吧。除了整理房间，还有哪些爱干净的事情？'}
 state.deepPendingReply={text:response,next,pass,shown:false};state.deepPhase='child-shown';dismiss();render();if(expression)toast('孩子说：“'+text+'”');later(showDeepReply,800);
}


function showDeepReply(){const pending=state.deepPendingReply;if(!pending||state.page!==4)return;state.deepResponse=pending.text;state.deepReply=true;state.newPart='reply';state.deepPhase='reply-speaking';if(!pending.shown){state.deepReplyCount++;state.deepLogs.push({role:'teacher',text:pending.text});pending.shown=true}render();speak(pending.text,'zh-CN',()=>{if(state.page!==4)return;later(()=>finishDeepReply(pending),260)})}
function finishDeepReply(pending){if(state.page!==4||pending!==state.deepPendingReply)return;if(['expression','guided','done'].includes(pending.next)&&!state.deepCard){state.deepCard=true;state.newPart='expression'}state.deepPhase=pending.next;if(pending.pass){state.deepFinished=true;setResult('wash',true,'生活表达验证')}state.deepPendingReply=null;render();if(pending.next==='expression')toast('点击麦克风，试着说一次 wash hands。')}
function resumeDeep(){if(['intro','asking'].includes(state.deepPhase)){state.deepPrompt=true;state.deepPhase='asking';if(!state.deepLogs.some(x=>x.role==='teacher'&&x.text==='除了整理房间，你还知道哪些爱干净的事情呀？'))state.deepLogs.push({role:'teacher',text:'除了整理房间，你还知道哪些爱干净的事情呀？'});render();speak('除了整理房间，你还知道哪些爱干净的事情呀？','zh-CN',()=>{if(state.page===4){state.deepPhase='awaiting';render()}})}else if(state.deepPhase==='child-shown')later(showDeepReply,500);else if(state.deepPhase==='reply-speaking')showDeepReply();else speak(teacherText())}

function deepContinue(){if(state.deepPhase==='guided'){setResult('wash',false,'老师引导示范',true);state.deepFinished=true;state.deepPhase='done';speak('wash hands','en-US',()=>enter(5));return}if(state.deepPhase==='done'&&state.deepFinished)enter(5)}

function stats(scope='session'){const keys=Object.keys(state.results).filter(k=>scope!=='module'||WORD_KEYS.includes(k)),good=keys.filter(k=>state.results[k]==='mastered'),weak=keys.filter(k=>state.results[k]==='review'),resolved=wrongRecords().filter(r=>!unresolvedRecords().some(v=>v.questionId===r.questionId)).map(r=>r.questionId);return {keys,good,weak,resolved,oral:state.oral.filter(o=>scope!=='module'||o.scope==='module').length,exercises:state.exerciseRecords.length,initialCorrect:state.exerciseRecords.filter(r=>r.pass).length,initialWrong:wrongRecords().length,remainingWrong:unresolvedRecords().length,plannedModules:1,completedModules:state.moduleCompleted?1:0,totalTopicModules:4}}

function moduleSpeech(){const s=stats('module');return `单词模块完成啦！今天认识了 room、dirty、clean 和 tidy，已经掌握 ${s.good.length} 个单词，开口 ${s.oral} 次。${s.weak.length?'下次再练 '+s.weak.slice(0,2).map(k=>WORDS[k].en).join(' 和 ')+'。':'今天的小检查都通过啦！'} 回到学习地图，看看今天的收获吧。`}

function renderModule(){
 const s=stats('module');paint(411,113,280,40,'单词模块 · 学习总结','cream','font-size:25px;text-align:left');paint(475,171,108,41,'个单词','cream','font-size:22px');paint(441,172,40,39,s.keys.length,'cream number','color:#ff7e03');paint(445,207,102,30,`已掌握 ${s.good.length} 个`,'cream','font-size:15px;font-weight:500;white-space:nowrap');paint(703,172,36,39,s.oral,'cream number','color:#ff7e03');paint(942,172,40,39,s.resolved.length,'cream number','color:#ff7e03');
 if(!s.good.length){paint(416,268,201,43,'这些还要再练啦','module-good','font-size:23px');paint(355,258,54,59,'↻','module-good','font-size:38px;color:#f9a417')}if(!s.resolved.length)paint(946,209,115,24,s.initialWrong?'老师陪你继续练':'本轮全部答对','cream','font-size:15px;color:#92714c');
 paint(359,316,280,108,s.good.length?s.good.slice(0,4).map(k=>`<div class="mastered-row"><span class="summary-check">✓</span>${escapeText(masteryDescription(k))}</div>`).join(''):'今天完成了练习<br>先练会一个难点，再逐步进步','module-good summary-field');
 paint(800,316,213,98,s.weak.length?s.weak.slice(0,2).map(k=>escapeText(weakDescription(k))).join('<br>'):'本轮练习全部通过<br>下次简短回顾今天的表达','module-weak summary-field');
 paint(564,454,405,29,s.initialWrong?(s.resolved.length?`你解决了 ${s.resolved.length} 道错题，老师陪你继续练！`:'你愿意认真试一试，老师会陪你继续练！'):'四个单词的小检查都通过啦，继续加油！','teacher-feedback');paint(621,505,201,33,'返回学习地图 ›','button-copy');hit(570,489,291,67,'返回学习地图，看看完成状态',()=>enter(9));
}
function sessionSpeech(){const s=stats();return `今天安排的单词任务已经完成啦！你掌握 ${stats('module').good.length} 个单词，开口 ${s.oral} 次，也把英语用到了生活里。${s.weak.length?'下次重点练 '+s.weak.slice(0,2).map(k=>WORDS[k].en).join(' 和 ')+'。':'今天的小难点都通过啦。'} 今天可以好好休息了！`}

function renderSession(){
 const s=stats();paint(392,234,60,35,'1/1','white number','color:#00bd72');paint(598,234,42,35,s.good.length,'white number','color:#ff7614');paint(786,234,42,35,s.oral,'white number','color:#ff4472');paint(989,234,41,35,s.resolved.length,'white number','color:#1671ff');
 paint(370,335,284,94,`完成爱干净单词任务（1/1）<br>${s.initialWrong?`补练解决 ${s.resolved.length} 道真实错题`:'四个词的理解和开口都通过啦'}<br>${state.results.wash==='mastered'?'会用 wash hands 表达洗手':'认识 wash hands，下次再独立说'}`,'session-good summary-field');
 paint(773,335,295,94,s.weak.length?s.weak.slice(0,3).map(k=>escapeText(weakDescription(k))).join('<br>'):'简短回顾 room 和 clean<br>在生活里使用 wash hands<br>试着完整表达自己的想法','session-weak summary-field');
 paint(479,455,331,32,'今天表现很棒，明天继续加油哦～','cream','font-size:18px');hit(511,494,374,67,'完成今天学习',()=>enter(7));
}

function masteryDescription(k){return k==='wash'?'会说 wash hands':k+' 的意思和开口已通过'}

function weakDescription(k){const r=unresolvedRecords().find(r=>r.key===k);return WORDS[k].en+(r?(r.type==='speech'?' 再完整说一说':' 的意思再分清一点'):' 再独立说一次')}

function tomorrowPlans(){const plans=stats().weak.slice(0,2);for(const k of ['room','clean'])if(plans.length<2&&!plans.includes(k))plans.push(k);return plans}
function tomorrowText(k){return `复习 ${WORDS[k].en}（${WORDS[k].cn}）`}

function byeSpeech(){return `今天辛苦啦，你学得很棒！明天我们先复习 ${tomorrowPlans().map(k=>WORDS[k].en).join(' 和 ')}，再学习新的内容。今天已经完成，可以休息了。明天见！`}
function nativeSprite(x,y,w,h){const n=document.createElement('div');n.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background-size:1280px 590px;background-position:-${x}px -${y}px`;n.style.backgroundImage=`url("${ASSETS.frames[FRAME_MAP[state.page]]}")`;fields.append(n)}
function renderBye(){const plans=tomorrowPlans();paint(509,136,490,143,'今天你真的<strong style="color:#ff7b05">很棒！</strong><br>要先休息啦，<strong style="color:#ff7b05">明天</strong>我们继续学习哦～<br>明天我们一起复习这些内容：','goodbye-text');nativeSprite(790,140,44,43);for(let i=0;i<2;i++){paint(586,341+i*51,297,39,escapeText(tomorrowText(plans[i])),'tomorrow-line','font-size:18px');paint(887,333+i*51,86,47,{room:'🏠',dirty:'🧸',clean:'✨',tidy:'🧺',wash:'🧼'}[plans[i]],'tomorrow-line','font-size:31px;justify-content:center;text-align:center')}hit(571,451,360,94,'明天见，结束学习',()=>finish(),!state.byePlayed&&!state.ended);}
function playBye(){speak(byeSpeech(),'zh-CN',()=>{if(state.page===7){state.byePlayed=true;render()}})}
function makeReport(type){const s=stats(type==='module'?'module':'session');return {id:state.id+'-'+type,type,title:type==='module'?'单词模块总结':'今日学习总结',topic:'爱干净',moduleId:'words',moduleName:'单词',plannedModuleIds:['words'],completedModuleIds:state.moduleCompleted?['words']:[],totalTopicModules:4,statistics:s,oral:state.oral.filter(o=>type!=='module'||o.scope==='module').slice(),events:state.events.filter(e=>type!=='module'||WORD_KEYS.includes(e.key)).slice(),exercises:state.exerciseRecords.map(r=>({...r})),reviews:state.reviewRecords.map(r=>({...r})),practiceReads:state.practiceReads.slice(),deepDialog:state.deepLogs.slice(),journey:state.journey.slice(),generated:Date.now(),simulation:'统计来自本次实际选择或输入；AI 回复、识别与评分为本地规则演示，不是真实模型评估。'};}

function saveReport(r){reports=reports.filter(x=>x.id!==r.id);reports.push(r);try{localStorage.setItem(STORE,JSON.stringify(reports.slice(-30)))}catch{toast('本地记录保存受限，仍可下载报告。')}if(settings.autoDownload)downloadReport(r);}
function saveModule(){if(!state.moduleReport){state.moduleCompleted=true;state.resumePage=5;state.journey.push({action:'完成单词模块',module:'words',time:Date.now()});state.moduleReport=makeReport('module');saveReport(state.moduleReport);render()}}

function saveSession(){if(!state.sessionReport){state.sessionReport=makeReport('session');saveReport(state.sessionReport)}}
function reportText(r){const s=r.statistics;return `${r.title}\n主题：${r.topic}\n本次学习模块：${r.moduleName}\n今日计划：${r.completedModuleIds.length}/${r.plannedModuleIds.length}（单词）\n主题目录：绘本、单词、视频、习题；另三项待开放，未计为完成\n单词小检查：${s.exercises} 次 · 首次正确 ${s.initialCorrect} 次 · 首次错误 ${s.initialWrong} 次\n补练解决：${s.resolved.length} 个难点 · 仍待巩固：${s.remainingWrong} 项检查\n已掌握：${s.good.map(k=>WORDS[k].en).join('、')||'暂无'}\n待巩固：${s.weak.map(k=>WORDS[k].en).join('、')||'无'}\n孩子模拟开口：${s.oral} 次（选择点击与老师示范不计）\n\n原始学习记录：\n${r.exercises.map((e,i)=>`${i+1}. ${e.prompt}\n教学来源：${e.teachingLine}\n孩子答案：${e.answer}\n正确答案：${e.expected}\n首次结果：${e.pass?'通过':e.reason}`).join('\n\n')}\n\n对应补练：\n${r.reviews.length?r.reviews.map(e=>`${e.questionId} · 第 ${e.attempt} 次 · ${e.answer} · ${e.guided?'老师示范，保留待巩固':e.pass?'补练通过':e.reason}`).join('\n'):'本轮全部通过，跳过错题补练。'}\n\n主题生活问答（本主题一次）：\n${r.deepDialog.map(x=>(x.role==='teacher'?'雪梨老师':'孩子')+'：'+x.text).join('\n')}\n\n用户学习路径：\n${r.journey.map(x=>x.action).join(' → ')}\n\n${r.simulation}`}

function downloadReport(r){const html='<!doctype html><meta charset="utf-8"><title>雪梨智学学习报告</title><style>body{max-width:850px;margin:40px auto;font:16px/1.8 system-ui;background:#fff9ea;color:#673b1c;padding:25px}pre{font:inherit;white-space:pre-wrap;background:white;padding:25px;border:1px solid #e8d9b5;border-radius:20px}</style><h1>雪梨智学 · '+escapeText(r.title)+'</h1><pre>'+escapeText(reportText(r))+'</pre>';const u=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='雪梨智学-'+r.title+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function finish(){if(!state.byePlayed)return;state.ended=true;stopSpeech();render();show('今天的学习已完成','<p>你今天认识了四个单词，也把英语用到了生活里。今天已经完成，可以休息了。明天见！</p><button onclick="enter(8)">回到首页</button> <button class="secondary" onclick="openParent()">查看学习记录</button>');}

function show(title,body){modalMode='info';modal.innerHTML=`<div class="modal"><header><h2>${escapeText(title)}</h2><button class="secondary" onclick="dismiss()">关闭 ×</button></header>${body}</div>`;modal.classList.remove('hidden')}
function dismiss(){modal.classList.add('hidden');modalMode='';}
function openTeacherChat(){openInput(true)}
function openMic(){
 if(state.ended)return;
 if(state.page===1&&state.lessonPhase==='learn'){modalMode='ask';dispatch('__read__');return}
 if(state.page===1&&state.lessonPhase==='quiz'&&currentQuestion().type!=='speech'){toast('先看图选答案，轮到开口时再点麦克风说词。');return}
 if([2,5,6].includes(state.page)){toast('现在是学习回顾。想问问题，可以点雪梨老师。');return}
 openInput();
}
function openInput(teacher=false){
 if(state.ended)return;let title='和雪梨老师说说话',options=[],intro='',mode='ask',disabled=false;
 if(state.page===0){mode='welcome';title='和老师打个招呼';options=[['老师好！','老师好！']];intro='打个招呼后，我们一起选择今天的学习主题。'}
 else if(state.page===8||state.page===9){mode='catalog';title=state.page===8?'今天想学什么？':'想从哪个模块开始？';intro=state.page===8?'可以点击主题卡，也可以告诉老师你想学什么。':state.moduleCompleted?'今天的单词任务完成啦，可以看看今日收获。':'今天开放单词模块，老师陪你看图、理解、开口。';options=state.page===8?[['我想学爱干净','我想学爱干净'],['我想看动物','我想看动物']]:state.moduleCompleted?[['看看今天的收获','看看今天的收获']]:[['我想学单词','我想学单词'],['我想看视频','我想看视频']];}
 else if(!teacher&&state.page===1&&state.lessonPhase==='quiz'&&currentQuestion().type==='speech'){
  mode='quiz';title='开口说词 · '+currentQuestion().target;const q=currentQuestion();disabled=state.exerciseRecords.some(r=>r.questionId===q.id);intro=disabled?'这个词已经提交，请返回继续学习。':q.prompt;
  if(!disabled)options=[['识别为：'+q.target,q.target],['识别为：'+q.sampleWrong,q.sampleWrong],['识别不清楚','__unclear__']];
 }
 else if(!teacher&&state.page===3){mode='review';const q=currentReview();disabled=state.reviewDone||state.reviewPending;title='再练 '+q.target+' · '+(q.type==='speech'?'开口':'理解');intro=disabled?'这一项已完成，点击页面主按钮继续。':q.prompt;if(!disabled)options=q.type==='speech'?[[q.target+' · 完整说词',q.target],['识别不清楚','__unclear__']]:q.choices.map((t,i)=>[t,i]);}
 else if(!teacher&&state.page===4){mode='deep';title='把英语用到生活里';intro='可以先说中文，老师会帮你连接到英语。';disabled=!['awaiting','expression'].includes(state.deepPhase)||state.deepFinished;options=state.deepPhase==='awaiting'?[['洗手','洗手'],['收玩具','收玩具'],['我想聊恐龙','恐龙']]:state.deepPhase==='expression'?[['wash hands','wash hands'],['表达还没完整','wash']]:[];}
 else if(state.page===7){mode='bye';title='和雪梨老师道别';options=[['老师再见！','老师再见！']];}
 else if(state.page===1){const w=WORDS[WORD_KEYS[state.wordIndex]];intro='老师知道你正在学 '+w.en+'，问完后回到当前词卡继续。';options=[[w.en+' 是什么意思？',w.en+' 是什么意思'],['这张图片里有什么？','这张图片里有什么'],...(state.lessonPhase==='learn'?[['我想跟读这个词','__read__']]:[]),['我想聊恐龙','恐龙']]}
 else options=[['这次哪里还需要练？','这次哪里还需要练']];
 const log=mode==='review'?state.reviewLog:mode==='deep'?state.deepLogs:state.aiChat;
 show(title,`<div class="context">${state.selectedTopic?'主题：爱干净':'选择今日主题'}${state.selectedModule?' · 单词模块':''}${state.page===1?' · 当前词：'+WORD_KEYS[state.wordIndex]:''}</div><p>${escapeText(intro)}</p><div class="chat-log">${log.slice(-4).map(x=>`<div class="chat-line ${x.role==='child'?'child':''}">${escapeText(x.text)}</div>`).join('')}</div><div class="choices">${options.map((x,i)=>`<button onclick="chooseMic(${i})">${escapeText(x[0])}</button>`).join('')}</div><div class="input-row"><input id="mic-input" aria-label="孩子的问题或回答" placeholder="输入孩子的话" onkeydown="if(event.key==='Enter')sendMic()"><button onclick="sendMic()">发送</button></div>${mode==='ask'?'<button class="secondary return-task" onclick="dismiss()">继续当前学习</button>':''}<p class="note">演示输入区：预设结果或文字模拟语音识别，不采集录音；老师使用浏览器语音。</p>`);
 modalMode=mode;modal.dataset.options=JSON.stringify(options);
 if(disabled||(['ask','catalog'].includes(mode)&&state.aiTurns>=3)){document.querySelector('#mic-input').disabled=true;modal.querySelectorAll('.choices button,.input-row button').forEach(x=>x.disabled=true)}
}

function chooseMic(i){const x=JSON.parse(modal.dataset.options||'[]')[i];if(x)dispatch(x[1])}
function sendMic(){const n=document.querySelector('#mic-input');if(n?.value.trim())dispatch(n.value.trim())}
function dispatch(text){
 if(modalMode==='catalog'){catalogAnswer(text);return}
 if(modalMode==='quiz'){submitQuiz(text==='__unclear__'?'识别不清楚':text,text==='__unclear__');return}
 if(modalMode==='review'){const q=currentReview(),choice=q.choices?.indexOf(text),response=q.type==='speech'||typeof text==='number'?text:choice>=0?choice:text;submitReview(response,text==='__unclear__',true);return}
 if(modalMode==='deep'){submitDeep(text);return}
 if(modalMode==='welcome'){dismiss();speak('你好呀，我们一起选选今天想学什么吧。','zh-CN',()=>enter(8));return}
 if(modalMode==='bye'){dismiss();speak('明天见！今天已经完成，可以休息啦。','zh-CN',()=>{state.byePlayed=true;finish()});return}
 if(text==='__read__'){const w=WORDS[WORD_KEYS[state.wordIndex]];show('跟着老师说 '+w.en,`<p>${w.en} · ${w.cn}</p><div class="choices"><button onclick="submitLearning('${w.en}')">模拟完整说对</button><button onclick="submitLearning('不清楚')">模拟还不清楚</button></div><div class="input-row"><input id="read-input" aria-label="输入试读内容" placeholder="输入这个词"><button onclick="submitLearning(document.querySelector('#read-input').value)">提交</button></div>`);return}
 answerQuestion(text)
}


function catalogAnswer(text){
 if(state.aiTurns>=3){dismiss();toast('先选今天开放的内容吧。');return}state.aiTurns++;
 if(state.page===8&&/爱干净|clean/i.test(text)){dismiss();selectTopic('cleanliness');return}
 if(state.page===9&&/单词|word/i.test(text)){dismiss();startModule();return}
 if(state.page===9&&state.moduleCompleted&&/收获|总结/.test(text)){dismiss();enter(6);return}
 const answer=state.page===8?'其他主题会陆续开放，今天先选爱干净，老师陪你学。':'其他模块会陆续开放，今天先从单词开始。';state.aiChat.push({role:'child',text},{role:'teacher',text:answer});openInput(modalMode==='ask');speak(answer);if(state.aiTurns>=3)later(()=>dismiss(),3000);
}

function submitLearning(text){if(!text.trim()||state.lessonPhase!=='learn')return;const w=WORDS[WORD_KEYS[state.wordIndex]],pass=norm(text)===norm(w.en);recordChild(text,'词卡试读');state.practiceReads.push({key:w.en,target:w.en,answer:text,pass,time:Date.now()});dismiss();render();toast(pass?'这个词试读完整啦！接下来再检查理解和开口。':'这个词还不清楚，先听老师说一遍。');speak(pass?'说出来啦！我们继续试试这个词。':w.en,pass?'zh-CN':'en-US');}

function answerQuestion(text){
 if(state.aiTurns>=3){dismiss();toast('先完成当前任务，再继续提问。');return}state.aiTurns++;if([1,2,3,4].includes(state.page))recordChild(text,'课程提问');let answer='';const current=WORDS[WORD_KEYS[state.wordIndex]];
 const key=WORD_KEYS.find(k=>new RegExp(k,'i').test(text));
 if(/哪里|练/.test(text))answer=stats().weak.length?'这次再练 '+stats().weak.map(k=>WORDS[k].en).join('、')+'，老师会一次陪你练一个。':'现在已经通过的小检查都记下来啦，继续当前任务吧。';
 else if(key)answer=WORDS[key].tip;
 else if(/意思|什么|图片|这词|这个|怎么说/.test(text))answer=current.tip;
 else if(/脏/.test(text))answer=WORDS.dirty.tip;
 else if(/干净/.test(text))answer=WORDS.clean.tip;
 else if(/房间/.test(text))answer=WORDS.room.tip;
 else if(/整理/.test(text))answer=WORDS.tidy.tip;
 else answer='这个很有趣，我们先把当前的 '+current.en+' 学完，再继续今天的任务吧。';
 if(state.aiTurns>=3)answer+=' 我们先回到当前词卡继续。';state.aiChat.push({role:'child',text},{role:'teacher',text:answer});openInput(modalMode==='ask');speak(answer);if(state.aiTurns>=3)later(()=>dismiss(),4200)
}

function showWeak(){const rows=wrongRecords();show('单词学习 · 原始记录',rows.length?rows.map(r=>`<div class="record-row"><b>${r.target} · ${r.type==='speech'?'开口':'理解'}</b><p>原答案：${escapeText(r.answer)}<br>${escapeText(r.reason)}<br>当前状态：${unresolvedRecords().some(v=>v.questionId===r.questionId)?'待巩固':'补练已通过'}</p></div>`).join(''):'<p>四个单词的理解和开口检查都通过啦，没有生成错题。</p>')}

function openInfo(name){if(name==='个人主页'){show('小宝贝的学习主页',`<p>今日主题：爱干净<br>今日任务：单词模块 ${state.moduleCompleted?'已完成':'待完成'}<br>已学单词：${completedWords()}/4</p><button onclick="goTopics()">去学习首页</button>`)}else show(name,'<p>雪梨老师陪你先完成今天的学习，学习记录和家长中心可以查看真实学习结果。</p><button onclick="dismiss()">回到当前学习</button>')}

function openParent(){show('家长中心 · 学习记录',`<p class="note">报告保存在当前浏览器，模拟家长端接收，不上传远程服务器。</p><div class="report-list">${reports.length?reports.slice().reverse().map(r=>`<button onclick="openReport('${r.id}')">${escapeText(r.title)} · 已掌握 ${r.statistics.good.length} 项 · 模拟开口 ${r.statistics.oral} 次</button>`).join(''):'<p>总结生成后，报告会自动出现在这里。</p>'}</div>`)}
function openReport(id){const r=reports.find(x=>x.id===id);if(!r)return;show(r.title,`<pre>${escapeText(reportText(r))}</pre><button onclick="downloadReport(reports.find(r=>r.id==='${id}'))">下载报告</button> <button class="secondary" onclick="openParent()">返回家长中心</button>`)}
function openSettings(){if(state.page===0){clearTimers();stopSpeech()}show('声音与演示说明',`<div class="setting-line"><span>雪梨老师语音</span><select aria-label="语音设置" onchange="setSetting('voice',this.value==='on')"><option value="on" ${settings.voice?'selected':''}>开启</option><option value="off" ${!settings.voice?'selected':''}>关闭 · 文字流程</option></select></div><div class="setting-line"><span>总结报告自动下载</span><select aria-label="报告自动下载" onchange="setSetting('autoDownload',this.value==='on')"><option value="off" ${!settings.autoDownload?'selected':''}>关闭 · 保存到家长中心</option><option value="on" ${settings.autoDownload?'selected':''}>开启</option></select></div><p>欢迎后选择主题，只开放爱干净。学习地图显示绘本、单词、视频和习题；本次学习计划为一个单词模块，其他入口锁定。</p><p>每个词按“认识 → 理解 → 开口”学习。返回学习地图或重新打开可继续进度；真实作答产生复习清单。生活引导同一主题仅一次，随后回到模块地图查看今日收获。</p><p class="note">识别、AI 回复和评分为本地规则模拟；报告和进度保存在当前浏览器。选择点击和老师示范不计开口。今日完成 1/1 表示单词任务，不表示另外三个模块完成。</p>`)}

function askReset(){show('重新开始演示？','<p>重置本次对话与回答状态，已保存的报告会保留。</p><button onclick="reset()">确认重新开始</button>')}
function reset(){clearTimers();stopSpeech();dismiss();state=createState();render();audioStatus('点击老师或主按钮开始欢迎语音');}
function fullscreen(){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}
document.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss()});addEventListener('beforeunload',stopSpeech);render();later(()=>welcome(true),500);
