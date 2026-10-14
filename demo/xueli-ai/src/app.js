'use strict';
const ASSETS=__ASSETS__;
const TITLES=['首页欢迎','正常课程学习','错误汇总','针对性二次练习','深度引导对话','模块练习总结','整次学习总结','学习提醒与道别'];
const WORDS={clean:{en:'clean',cn:'干净的',scene:'clean'},room:{en:'room',cn:'房间',scene:'clean'},this:{en:'this',cn:'这个',scene:'clean'},sentence:{en:'This room is not clean.',label:'not clean',cn:'这个房间不干净。',scene:'dirty'},positive:{en:'This room is clean.',label:'clean room',cn:'这个房间干净。',scene:'clean'},action:{en:'Let’s clean the room.',label:'clean the room',cn:'我们一起整理房间。',scene:'tidy'},wash:{en:'wash hands',cn:'洗手',scene:'hands'}};
const LINES=['This is my room.','This room is not clean.','Let’s clean the room.','Look! This room is clean.'];
const LINE_CN=['这是我的房间。this 指“这个”，room 是“房间”。','这个房间不干净。not 表示“不”，clean 是“干净的”。','我们一起整理房间。这里的 clean 表示“打扫”。','看！这个房间干净啦。'];
// Every assessed target has an explicit teaching source and a stable question ID.
const QUESTIONS=[
 {id:'room-meaning',key:'room',type:'choice',line:0,scene:'clean',prompt:'故事中的 room 是什么意思？',target:'room',choices:['房间','玩具','食物'],correct:0,hint:'room 是“房间”。This is my room. 是“这是我的房间”。'},
 {id:'this-meaning',key:'this',type:'choice',line:0,scene:'clean',prompt:'This is my room. 中，this 指什么？',target:'this',choices:['这个','那个','这些'],correct:0,hint:'this 指“这个”。男孩正在介绍自己的这个房间。'},
 {id:'clean-meaning',key:'clean',type:'choice',line:3,scene:'clean',prompt:'房间整理好了，clean 是什么意思？',target:'clean',choices:['脏的','干净的','困的'],correct:1,hint:'整理好后房间是干净的，clean 在这里是“干净的”。'},
 {id:'not-picture',key:'sentence',type:'picture',line:1,scene:'dirty',prompt:'听句子，选出对应的房间。',target:'This room is not clean.',choices:['收拾好的房间','玩具散落的房间'],scenes:['clean','dirty'],correct:1,hint:'not 表示“不”。not clean 是“不干净”，对应玩具散落的房间。'},
 {id:'clean-action',key:'action',type:'choice',line:2,scene:'tidy',prompt:'Let’s clean the room. 是什么意思？',target:'Let’s clean the room.',choices:['我们一起整理房间。','我们一起吃食物。','我们一起睡觉。'],correct:0,hint:'这里的 clean 表示“打扫”，整句是“我们一起整理房间”。'},
 {id:'clean-reading',key:'positive',type:'speech',line:3,scene:'clean',prompt:'整理好的房间，用英语完整说一说。',target:'This room is clean.',hint:'This room is clean. 把“房间是干净的”完整说出来。'},
 {id:'not-reading',key:'sentence',type:'speech',line:1,scene:'dirty',prompt:'房间还没整理好，把这句话说完整。',target:'This room is not clean.',hint:'not 表示“不”，这句话需要说出 not：This room is not clean.'}
];
const WELCOME='你好呀，我是雪梨老师，今天我会陪你一起学英语，让我们开始今天的学习吧。';
const STORE='xueli-interactive-frames-v5';let reports=[];try{reports=JSON.parse(localStorage.getItem(STORE)||'[]');if(!Array.isArray(reports))reports=[]}catch{reports=[]}
let settings={voice:true,autoDownload:true},state,timers=[],speechTimer=null,speechId=0,pendingSpeechCallback=null,modalMode='',currentVoice='',toastTimer=null;
const stage=document.querySelector('#stage'),fields=document.querySelector('#fields'),buttons=document.querySelector('#buttons'),modal=document.querySelector('#modal');
function escapeText(t){return String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(t){return String(t).toLowerCase().replace(/[’']/g,'').replace(/[^a-z\u4e00-\u9fff]/g,'')}
function createState(){return {id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),page:0,welcomePlayed:false,line:0,lineHeard:[],lessonPhase:'learn',quizIndex:0,quizFeedback:'',exerciseRecords:[],reviewRecords:[],practiceReads:[],aiTurns:0,aiChat:[],queue:[],reviewIndex:0,reviewAttempts:0,reviewDone:false,reviewGuided:false,reviewPending:false,reviewFeedback:'',reviewLog:[],deepStarted:false,deepFinished:false,deepPhase:'intro',deepTurns:0,deepPrompt:false,deepChild:false,deepReply:false,deepCard:false,deepAnswer:'',deepResponse:'',deepLogs:[],deepReplyCount:0,newPart:'',oral:[],events:[],results:{},moduleReport:null,sessionReport:null,byePlayed:false,ended:false};}
state=createState();
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
function render(){document.querySelector('#background').src=ASSETS.frames[state.page];document.querySelector('#background').alt=TITLES[state.page];fields.innerHTML='';buttons.innerHTML='';document.querySelector('#scene-label').textContent=TITLES[state.page];setupCommon();[renderWelcome,renderLearning,renderErrors,renderReview,renderDeep,renderModule,renderSession,renderBye][state.page]();resize()}
function setupCommon(){const xs=state.page===0?[811,901,992,1085,1170]:[810,902,994,1088,1180];['商城','积分兑换','学习记录','活动中心','家长中心'].forEach((n,i)=>hit(xs[i],12,82,90,n,()=>n==='家长中心'||n==='学习记录'?openParent():openInfo(n)));hit(40,10,250,90,'个人主页',()=>openInfo('个人主页'));const mic=state.page===0?[1102,416,145,139]:state.page===3?[1116,439,133,122]:state.page===4?[1110,423,136,137]:state.page===7?[1117,435,136,129]:[1141,443,133,124];hit(...mic,'麦克风：回答或提问',openMic,state.ended||(state.page===4&&!['awaiting','expression'].includes(state.deepPhase)));
const rect=state.page===0?[131,96,266,446]:state.page===7?[135,105,350,485]:state.page===3?[83,130,224,417]:[22,158,246,398];hit(...rect,'雪梨老师：播放当前引导',teacherSpeak);const w=document.querySelector('#speech-wave');w.style.cssText=`left:${rect[0]+35}px;top:${rect[1]+30}px;width:145px;height:145px`;}
function enter(page){
 if(state.ended)return;
 if(page>=2&&state.exerciseRecords.length!==QUESTIONS.length){toast('先完成课堂练习，老师才有你的学习记录。');return}
 if(page===4&&state.queue.length&&!state.reviewDone){toast('先完成当前补练，再进入生活问答。');return}
 if(page>=5&&!state.deepFinished){toast('先完成本次生活表达，再查看学习总结。');return}
 clearTimers();stopSpeech();dismiss();state.page=page;state.aiTurns=0;state.aiChat=[];render();
 if(page===4)startDeep();if(page===5)saveModule();if(page===6)saveSession();if(page===7)later(()=>playBye(),250)
}
function teacherText(){if(state.page===0)return WELCOME;if(state.page===1)return state.lessonPhase==='quiz'?currentQuestion().prompt+' '+(currentQuestion().type==='speech'?currentQuestion().target:'选一个答案，再继续。'):'我们一起读爱干净的故事。this 是这个，room 是房间，clean 是干净的，not 表示不。';if(state.page===2)return wrongRecords().length?`刚才你完成了七道题，${wrongRecords().length} 道需要再练。我们按你刚才的答案，每次练一个难点。`:'七道题全部答对啦！我们直接把英语用到生活里吧。';if(state.page===3)return state.reviewFeedback||reviewPrompt();if(state.page===4)return state.deepReply?state.deepResponse:'除了整理房间，你还知道哪些爱干净的事情呀？';if(state.page===5)return moduleSpeech();if(state.page===6)return sessionSpeech();return byeSpeech()}
function teacherSpeak(){if(state.page===0)welcome(true,true);else if(state.page===7)playBye();else speak(teacherText())}
function renderWelcome(){paint(376,87,267,112,escapeText(WELCOME),'welcome-copy');hit(470,424,461,109,'开始今天的学习',()=>state.welcomePlayed?enter(1):welcome(true,true));}
function welcome(advance,initiated=false){clearTimers();speak(WELCOME,'zh-CN',ok=>{state.welcomePlayed=ok;if(ok&&advance)enter(1);else if(!ok&&initiated&&advance){enter(1);toast('当前设备未能播报声音，先用文字继续；可在声音设置中重试。')}else if(!ok)toast('浏览器需要一次点击才能发声。请点击雪梨老师或“开始今天的学习”。')})}

function question(id){return QUESTIONS.find(q=>q.id===id)}
function currentQuestion(){return QUESTIONS[state.quizIndex]}
function currentReview(){return question(state.queue[state.reviewIndex])}
function answerText(q,response){return q.type==='speech'?String(response):(q.choices[Number(response)]??String(response))}
function targetText(q){return q.type==='speech'?q.target:q.choices[q.correct]}
function wrongReason(q,response,unclear=false){
 if(unclear)return '这次识别结果不够清楚，还不能确认句子说完整。';
 if(q.type==='speech')return q.key==='sentence'&&!norm(response).includes('not')?'漏掉了 not，句子从“不干净”变成了“干净”。':`识别到“${response}”，目标句子还没有说完整。`;
 return `选了“${answerText(q,response)}”。${q.hint}`;
}
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
function startQuiz(){
 if(state.lessonPhase!=='learn')return;
 stopSpeech();dismiss();state.lessonPhase='quiz';state.quizIndex=0;state.aiTurns=0;state.aiChat=[];render();speak('故事读完啦！我们做七道小练习，看看哪些已经会了。第一题，故事中的 room 是什么意思？');
}
function renderQuiz(){
 const q=currentQuestion(),r=state.exerciseRecords.find(r=>r.questionId===q.id);
 sceneArt(300,184,434,334,q.scene,'course-art');
 paint(962,136,48,29,`${state.quizIndex+1}/${QUESTIONS.length}`,'progress-copy');courseProgress(state.exerciseRecords.length/QUESTIONS.length);
 paint(750,182,435,267,'','exercise-board');
 paint(772,188,395,51,escapeText(q.prompt),'quiz-prompt');
 if(q.type==='picture'){
  paint(806,230,345,29,escapeText(q.target),'quiz-target','font-size:20px');
  hit(772,230,32,31,'听题目句子',()=>speak(q.target,'en-US'));paint(774,230,26,29,'♪','quiz-target','color:#1c79ff');
  q.scenes.forEach((scene,i)=>{sceneArt(780+i*196,270,175,95,scene,'quiz-option-art');choiceButton(780+i*196,370,175,30,q.choices[i],()=>submitQuiz(i),r?(r.response===i?(r.pass?'correct':'incorrect'):''):'',!!r)});
 }else if(q.type==='choice')q.choices.forEach((label,i)=>choiceButton(773,245+i*49,390,40,label,()=>submitQuiz(i),r?(r.response===i?(r.pass?'correct':'incorrect'):''):'',!!r));
 else{
  paint(775,255,390,66,escapeText(q.target),'quiz-reading');
  choiceButton(784,332,157,45,'先听一遍',()=>speak(q.target,'en-US'));
  choiceButton(960,332,197,45,r?'已提交回答':'点击麦克风回答',openMic,'',!!r);
 }
 paint(774,404,391,42,r?escapeText(state.quizFeedback):(q.type==='speech'?'点击右下角麦克风，说出完整句子。':'选一个答案，提交后再继续。'),'quiz-feedback '+(r?(r.pass?'pass':'fail'):''));
 paint(843,477,226,37,r?(state.quizIndex===QUESTIONS.length-1?'查看练习结果 ›':'下一题 ›'):'先完成这道题','button-copy');
 hit(813,460,288,70,r?(state.quizIndex===QUESTIONS.length-1?'查看练习结果':'下一题'):'先完成这道题',nextQuiz,!r);
}
function submitQuiz(response,unclear=false){
 const q=currentQuestion();if(state.page!==1||state.lessonPhase!=='quiz'||state.exerciseRecords.some(r=>r.questionId===q.id))return;
 const pass=grade(q,response,unclear),text=answerText(q,response);
 if(q.type==='speech')recordChild(unclear?'识别不清楚':text,'正式练习');
 const r={questionId:q.id,key:q.key,type:q.type,prompt:q.prompt,target:q.target,teachingLine:LINES[q.line],response,answer:text,expected:targetText(q),pass,reason:pass?'本题通过':wrongReason(q,response,unclear),time:Date.now()};
 state.exerciseRecords.push(r);state.events.push({key:q.key,questionId:q.id,pass,guided:false,source:'正式练习',answer:text,time:r.time});syncResults();
 state.quizFeedback=pass?'答对啦！继续下一题。':q.type==='speech'&&q.key==='sentence'&&!norm(response).includes('not')?'刚才漏掉了 not，老师记下了，复习时再一起练。':'这题还需要练一练，老师记下了，稍后会针对它复习。';
 dismiss();render();speak(state.quizFeedback);
}
function nextQuiz(){
 if(!state.exerciseRecords.some(r=>r.questionId===currentQuestion().id))return;
 if(state.quizIndex<QUESTIONS.length-1){stopSpeech();state.quizIndex++;state.line=currentQuestion().line;state.quizFeedback='';state.aiTurns=0;state.aiChat=[];render();speak(currentQuestion().prompt);}
 else{state.queue=wrongRecords().map(r=>r.questionId);enter(2)}
}

function renderLearning(){
 courseFrame();if(state.lessonPhase==='quiz'){renderQuiz();return}
 paint(962,136,48,29,`${state.line+1}/4`,'progress-copy');courseProgress((state.line+1)/4);
 for(let i=0;i<4;i++){
  const text=escapeText(LINES[i]).replace('room','<span style="color:#2279e8">room</span>').replace('not','<span style="color:#f16b32">not</span>').replace('clean','<span style="color:#ff950d">clean</span>');
  paint(830,198+i*60,329,50,text+`<br><small>${escapeText(LINE_CN[i])}</small>`,'lesson-line-copy'+(state.line===i?' current':''));
  hit(768,196+i*60,400,61,'朗读句子：'+LINES[i],()=>listen(i));
 }
 paint(843,477,226,37,'开始课堂练习 ›','button-copy');
 hit(813,460,288,70,'开始课堂练习',startQuiz);
}
function listen(i){state.line=i;if(!state.lineHeard.includes(i))state.lineHeard.push(i);render();speak(LINES[i],'en-US')}
function renderErrors(){
 const wrong=wrongRecords(),n=state.exerciseRecords.length,weak=[...new Set(wrong.map(r=>r.key))];
 paint(925,126,150,43,wrong.length?`${wrong.length} 道待复习`:'本轮全对！','cream','font-size:18px');
 if(!wrong.length)paint(680,125,145,40,'全部通过','cream','font-size:29px');
 const wordKeys=weak.filter(k=>['room','this','clean'].includes(k));for(const k of ['room','this','clean'])if(wordKeys.length<3&&!wordKeys.includes(k))wordKeys.push(k);
 wordKeys.slice(0,3).forEach((k,i)=>{
  const x=[500,660,811][i];paint(x,199,134,60,`<strong>${WORDS[k].en}</strong><br><small>${WORDS[k].cn} · ${weak.includes(k)?'待复习':'已通过'}</small>`,'cream word-copy '+(weak.includes(k)?'needs-review':'passed-word'));
  hit(x,192,143,78,'查看 '+WORDS[k].en+' 的练习记录',()=>showQuestionRecords(k));paint(x+112,205,19,27,'♪','cream','font-size:22px;color:#ffb01b');hit(x+109,199,25,38,'朗读复习词：'+WORDS[k].en,()=>speak(WORDS[k].en,'en-US'));
 });
 const sentenceRecords=state.exerciseRecords.filter(r=>['sentence','action','positive'].includes(r.key));
 const displayed=[...sentenceRecords.filter(r=>!r.pass),...sentenceRecords.filter(r=>r.pass)].slice(0,2);
 displayed.forEach((r,i)=>{
  const x=i===0?494:818;paint(x,292,i===0?314:256,70,`<span class="answer-state ${r.pass?'yes':'no'}">${r.pass?'✓':'×'}</span><div><b>${escapeText(WORDS[r.key].label||r.target)}</b><small>第 ${QUESTIONS.findIndex(q=>q.id===r.questionId)+1} 题 · ${r.pass?'本题通过':'待复习'}<br>${escapeText(r.answer)}</small></div>`,r.pass?'green error-sentence':'rose error-sentence');
  hit(x,289,i===0?313:257,75,'查看第 '+(QUESTIONS.findIndex(q=>q.id===r.questionId)+1)+' 题记录',()=>showQuestionRecords(r.key));
 });
 paint(579,421,29,34,n,'white number','color:#ff7a03');paint(776,421,32,34,n-wrong.length,'white number','color:#ff7a03');paint(957,421,34,34,wrong.length,'white number','color:#ff7a03');
 hit(494,471,347,67,wrong.length?'开始错题复习':'继续到生活引导',()=>wrong.length?beginReview():enter(4));
 if(!wrong.length)paint(565,489,205,32,'继续到生活引导','button-copy','font-size:22px');
 hit(952,195,124,77,'查看更多练习记录',showWeak);
}

function showQuestionRecords(key){
 const rows=state.exerciseRecords.filter(r=>!key||r.key===key);
 show('课堂练习 · 原始作答记录',rows.map(r=>`<div class="record-row"><b>第 ${QUESTIONS.findIndex(q=>q.id===r.questionId)+1} 题：${escapeText(r.prompt)}</b><p>孩子的答案：${escapeText(r.answer)}<br>正确答案：${escapeText(r.expected)}<br>${escapeText(r.reason)}</p><small>对应教学：${escapeText(r.teachingLine)}</small></div>`).join(''));
}

function reviewPrompt(){const q=currentReview(),r=state.exerciseRecords.find(r=>r.questionId===q.id);return q.type==='speech'&&q.key==='sentence'&&!norm(r.answer).includes('not')?'刚才漏掉了 not，我们把“不干净”再完整说一次吧～':q.type==='speech'?'刚才这句还没说完整，我们再练习一次吧～':`刚才 ${WORDS[q.key].label||WORDS[q.key].en} 的意思还没分清，我们再试一次吧～`}
function beginReview(){state.queue=wrongRecords().map(r=>r.questionId);if(!state.queue.length){enter(4);return}state.reviewIndex=0;prepareReview();enter(3)}
function prepareReview(){state.reviewAttempts=0;state.reviewDone=false;state.reviewGuided=false;state.reviewPending=false;state.reviewFeedback='';state.reviewLog=[{role:'teacher',text:reviewPrompt()}]}
function renderReview(){
 const q=currentReview();if(!q)return;const word=WORDS[q.key],original=state.exerciseRecords.find(r=>r.questionId===q.id);
 sceneArt(368,188,231,197,q.scene,'review-art');
 paint(411,400,183,42,escapeText(q.target),'review-target','font-size:'+(q.target.length>12?16:30)+'px;line-height:1.25');
 paint(326,75,394,73,escapeText(reviewPrompt()),'review-prompt','font-size:21px;line-height:1.45');
 if(q.type!=='speech'&&!state.reviewDone&&!state.reviewPending){
  paint(746,202,262,141,`<strong>再试同一道题</strong><p>${escapeText(q.prompt)}</p>`,'review-feedback review-task');
  q.choices.forEach((label,i)=>choiceButton(753,253+i*29,248,25,label,()=>submitReview(i),'review-choice'));
 }else paint(745,207,262,132,`<strong>${state.reviewDone?(state.reviewGuided?'一起完成啦！':'Well done!'):state.reviewPending?'跟着老师试试':state.reviewAttempts?'再试一次吧':'说出完整句子'}</strong><p>${escapeText(state.reviewFeedback||'原答案：'+original.answer+'。听一遍，再完整说出来。')}</p><span class="stars">${state.reviewDone&&!state.reviewGuided?'★★★':state.reviewDone?'★☆☆':'☆☆☆'}</span>`,'review-feedback');
 hit(348,392,67,63,'目标标准发音',()=>speak(q.target,'en-US'));hit(710,365,78,89,'再听一遍',()=>speak(q.target,'en-US'));
 hit(853,365,86,91,'提示一下',()=>{state.reviewFeedback=q.hint;render();toast(q.hint);speak(q.hint)});
 hit(474,472,378,78,state.reviewPending?'跟老师完成并继续':state.reviewIndex===state.queue.length-1?'进入生活引导':'下一个错题',nextReview,!state.reviewDone&&!state.reviewPending);
 paint(533,495,270,34,state.reviewPending?'跟老师完成并继续 ›':state.reviewDone?(state.reviewIndex===state.queue.length-1?'进入生活引导 ›':'下一个错题 ›'):`补练 ${state.reviewIndex+1}/${state.queue.length}`,'button-copy','font-size:23px');
}
function recordChild(text,source){state.oral.push({text,source,time:Date.now(),scope:state.page===4?'book':'module'})}
function setResult(key,pass,source,guided=false){state.results[key]=pass&&!guided?'mastered':'review';state.events.push({key,pass,guided,source,time:Date.now()})}
function submitReview(response,unclear=false,oralInput=false){
 if(state.page!==3||state.reviewDone||state.reviewPending)return;const q=currentReview(),text=unclear?'识别不清楚':answerText(q,response);state.reviewAttempts++;
 if(q.type==='speech'||oralInput)recordChild(unclear?'识别不清楚':text,'错题补练');
 const pass=grade(q,response,unclear),r={questionId:q.id,key:q.key,type:q.type,response,answer:text,pass,guided:false,attempt:state.reviewAttempts,reason:pass?'同一难点补练通过':wrongReason(q,response,unclear),time:Date.now()};
 state.reviewRecords.push(r);state.events.push({key:q.key,questionId:q.id,pass,guided:false,source:'错题补练',answer:text,time:r.time});syncResults();state.reviewLog.push({role:'child',text});
 if(pass){state.reviewDone=true;state.reviewFeedback=q.type==='speech'?'这次完整说出来啦！这道错题已解决。':'这次意思分清啦！这道错题已解决。'}
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
function advanceReview(){if(state.reviewIndex<state.queue.length-1){state.reviewIndex++;prepareReview();render()}else enter(4)}
function fragment(part){fields.insertAdjacentHTML('beforeend',`<div class="deep-fragment ${part} ${state.newPart===part?'fresh':''}"></div>`);fields.lastElementChild.style.backgroundImage=`url("${ASSETS.frames[state.page]}")`}
function blankStrip(x,y,w,h){const n=document.createElement('div');n.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden`;const strip=document.createElement('div');strip.style.cssText=`width:6px;height:${h}px;transform:scaleX(${w/6});transform-origin:left top;background-size:1280px 590px;background-position:-300px -${y}px`;strip.style.backgroundImage=`url("${ASSETS.frames[state.page]}")`;n.append(strip);fields.append(n)}
function renderDeep(){blankStrip(307,88,477,14);blankStrip(307,102,661,390);if(state.deepPrompt)fragment('prompt');if(state.deepChild){fragment('child');paint(724,195,128,39,escapeText(state.deepAnswer),'deep-child-copy','font-size:'+(state.deepAnswer.length>6?16:23)+'px')};if(state.deepReply){fragment('reply');paint(429,258,440,98,escapeText(state.deepResponse).replaceAll('wash hands','<span style="color:#ff6410">wash hands</span>'),'deep-reply-copy','font-size:'+(state.deepResponse.length>65?18:21)+'px');nativeSprite(849,289,62,59)};if(state.deepCard){fragment('expression');hit(846,395,83,82,'朗读 wash hands',()=>speak('wash hands','en-US'))}if(state.deepPrompt)hit(777,107,49,61,'重听老师的问题',()=>speak('除了整理房间，你还知道哪些爱干净的事情呀？'));if(state.deepReply)hit(848,285,62,63,'重听老师反馈',()=>speak(state.deepResponse));hit(485,492,310,72,state.deepPhase==='guided'?'跟读并继续':'继续，查看模块学习总结',deepContinue,!state.deepFinished&&state.deepPhase!=='guided');if(state.deepPhase==='guided')paint(552,508,171,35,'跟读并继续','button-copy');state.newPart='';}
function startDeep(){if(state.deepStarted)return;state.deepStarted=true;state.deepPhase='intro';later(()=>{state.deepPrompt=true;state.newPart='prompt';state.deepPhase='asking';render();const text='除了整理房间，你还知道哪些爱干净的事情呀？';state.deepLogs.push({role:'teacher',text});speak(text,'zh-CN',()=>{if(state.page===4){state.deepPhase='awaiting';render()}})},400)}
function submitDeep(text){if(!['awaiting','expression'].includes(state.deepPhase)||state.deepFinished)return;const expression=state.deepPhase==='expression';state.deepTurns++;recordChild(text,'深度引导');state.deepLogs.push({role:'child',text});if(!expression){state.deepAnswer=text;state.deepChild=true;state.newPart='child';state.deepReply=false}state.deepPhase='child-shown';dismiss();render();if(expression)toast('孩子说：“'+text+'”');later(()=>{let response='',next='awaiting';if(expression){if(norm(text)===norm('wash hands')){response='你会说 wash hands 啦！饭前和玩耍后要洗手，也可以提醒爸爸妈妈。';state.deepFinished=true;next='done';setResult('wash',true,'生活表达验证')}else if(state.deepTurns>=3){response='我们一起跟读 wash hands，今天先认识它，下次再自己说一说。';next='guided'}else{response='试着把英语表达说完整：wash hands。我们再试一次就好。';next='expression'}}else{const related=/洗手|wash|hand|整理|收.*玩具|刷牙|洗澡|擦|打扫|clean|tidy/i.test(text);if(related){response=/洗手|wash|hand/i.test(text)?'对啦！如果手脏了我们要 wash hands，爸爸妈妈手脏了也要提醒他们 wash hands 哦。':'这也是爱干净的好习惯！今天我们再认识 wash hands，饭前要洗手，也可以提醒爸爸妈妈。';next=state.deepTurns>=3?'guided':'expression'}else if(state.deepTurns>=3){response='我们先看一个例子：饭前要洗手，wash hands。跟着老师读一遍，完成今天的小挑战。';next='guided'}else response='这个很有趣，不过我们先把刚才的问题完成吧。除了整理房间，还有哪些爱干净的事情？'}state.deepResponse=response;state.deepReply=true;state.newPart='reply';state.deepReplyCount++;state.deepPhase='reply-speaking';state.deepLogs.push({role:'teacher',text:response});render();speak(response,'zh-CN',()=>{if(state.page!==4)return;later(()=>{if(['expression','guided','done'].includes(next)&&!state.deepCard){state.deepCard=true;state.newPart='expression';}state.deepPhase=next;render();if(next==='expression')toast('点击右下角麦克风，试着说一次 wash hands。')},260)})},800)}
function deepContinue(){if(state.deepPhase==='guided'){setResult('wash',false,'引导跟读',true);state.deepFinished=true;state.deepPhase='done';speak('wash hands','en-US',()=>enter(5));return}if(state.deepFinished)enter(5)}
function stats(){const keys=Object.keys(state.results),good=keys.filter(k=>state.results[k]==='mastered'),weak=keys.filter(k=>state.results[k]==='review'),resolved=wrongRecords().filter(r=>!unresolvedRecords().some(v=>v.questionId===r.questionId)).map(r=>r.questionId);return {keys,good,weak,resolved,oral:state.oral.length,exercises:state.exerciseRecords.length,initialCorrect:state.exerciseRecords.filter(r=>r.pass).length,initialWrong:wrongRecords().length,remainingWrong:unresolvedRecords().length}}
function moduleSpeech(){const s=stats();return `这次我们学习了 ${s.keys.length} 个知识点，你已经掌握 ${s.good.length} 个，开口 ${s.oral} 次。${s.weak.length?'下次再练 '+s.weak.slice(0,2).map(k=>WORDS[k].en).join(' 和 ')+'。':'今天的几个小难点都解决啦！'} 继续加油！`}
function renderModule(){
 const s=stats();paint(441,172,40,39,s.keys.length,'cream number','color:#ff7e03');paint(445,207,102,30,`已掌握 ${s.good.length} 个`,'cream','font-size:15px;font-weight:500;white-space:nowrap');paint(703,172,36,39,s.oral,'cream number','color:#ff7e03');paint(942,172,40,39,s.resolved.length,'cream number','color:#ff7e03');
 if(!s.good.length){paint(416,268,201,43,'这些还要再练啦','module-good','font-size:23px');paint(355,268,54,49,'↻','module-good','font-size:38px;color:#f9a417')}if(!s.resolved.length)paint(946,209,115,24,s.initialWrong?'老师陪你继续练':'本轮全部答对','cream','font-size:15px;color:#92714c');
 paint(359,316,280,108,s.good.length?s.good.slice(0,4).map(k=>`<div class="mastered-row"><span class="summary-check">✓</span>${escapeText(masteryDescription(k))}</div>`).join(''):'今天完成了练习<br>先练会一个难点，再逐步进步','module-good summary-field');
 paint(800,316,213,98,s.weak.length?s.weak.slice(0,2).map(k=>escapeText(weakDescription(k))).join('<br>'):'本轮练习全部通过<br>下次简短回顾今天的表达','module-weak summary-field');
 paint(564,454,405,29,s.initialWrong?(s.resolved.length?`你解决了 ${s.resolved.length} 道错题，老师陪你继续练！`:'你愿意认真试一试，老师会陪你继续练！'):'这轮七道题全部通过，继续加油！','teacher-feedback');paint(629,505,187,33,'查看今日总结 ›','button-copy');hit(570,489,291,67,'查看今日学习总结',()=>enter(6));
}
function sessionSpeech(){const s=stats();return `今天的绘本学习完成啦！你掌握了 ${s.good.length} 个知识点，开口练习 ${s.oral} 次。${s.weak.length?'下次重点练 '+s.weak.slice(0,2).map(k=>WORDS[k].en).join(' 和 ')+'。':'完整表达和生活好习惯都练过啦。'} 今天可以好好休息了！`}
function renderSession(){
 const s=stats();paint(392,234,60,35,'1/1','white number','color:#00bd72');paint(598,234,42,35,s.good.length,'white number','color:#ff7614');paint(786,234,42,35,s.oral,'white number','color:#ff4472');paint(989,234,41,35,s.resolved.length,'white number','color:#1671ff');
 paint(370,335,284,94,`完成爱干净绘本和 ${s.exercises} 道练习<br>${s.initialWrong?`补练解决 ${s.resolved.length} 道真实错题`:'七道练习全对，直接进入生活问答'}<br>${state.results.wash==='mastered'?'会用 wash hands 表达洗手':'认识 wash hands，下次再独立说'}`,'session-good summary-field');
 paint(773,335,295,94,s.weak.length?s.weak.slice(0,3).map(k=>escapeText(weakDescription(k))).join('<br>'):'简短回顾 room 和 clean<br>在生活里使用 wash hands<br>试着完整表达自己的想法','session-weak summary-field');
 paint(479,455,331,32,'今天表现很棒，明天继续加油哦～','cream','font-size:18px');hit(511,494,374,67,'完成今天学习',()=>enter(7));
}

function masteryDescription(k){if(k==='wash')return '会说 wash hands';if(['sentence','positive','action'].includes(k))return (WORDS[k].label||WORDS[k].en)+' 已通过';return WORDS[k].en+' 的意思已理解'}
function weakDescription(k){const r=unresolvedRecords().find(r=>r.key===k);return (WORDS[k].label||WORDS[k].en)+(r?(r.type==='speech'?' 的完整表达再练一下':' 的意思再分清一点'):' 再独立说一次')}
function tomorrowPlans(){const plans=stats().weak.slice(0,2);for(const k of ['room','clean'])if(plans.length<2&&!plans.includes(k))plans.push(k);return plans}
function tomorrowText(k){if(k==='sentence')return '复习 not（否定句）';if(k==='positive')return '复习“房间干净”的完整表达';if(k==='action')return '复习 clean（打扫房间）';return `复习 ${WORDS[k].en}（${WORDS[k].cn}）`}

function byeSpeech(){return `今天辛苦啦，你学得很棒！明天我们先复习 ${tomorrowPlans().map(k=>WORDS[k].en).join(' 和 ')}，再学习新的内容。今天已经完成，可以休息了。明天见！`}
function nativeSprite(x,y,w,h){const n=document.createElement('div');n.style.cssText=`position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;background-size:1280px 590px;background-position:-${x}px -${y}px`;n.style.backgroundImage=`url("${ASSETS.frames[state.page]}")`;fields.append(n)}
function renderBye(){const plans=tomorrowPlans();paint(509,136,490,143,'今天你真的<strong style="color:#ff7b05">很棒！</strong><br>要先休息啦，<strong style="color:#ff7b05">明天</strong>我们继续学习哦～<br>明天我们一起复习这些内容：','goodbye-text');nativeSprite(790,140,44,43);for(let i=0;i<2;i++){paint(586,341+i*51,297,39,escapeText(tomorrowText(plans[i])),'tomorrow-line','font-size:18px');paint(887,333+i*51,86,47,{room:'🏠',this:'👈',clean:'✨',sentence:'🏠',positive:'✨🏠',action:'🧺',wash:'🧼'}[plans[i]],'tomorrow-line','font-size:31px;justify-content:center;text-align:center')}hit(571,451,360,94,'明天见，结束学习',()=>finish(),!state.byePlayed&&!state.ended);}
function playBye(){speak(byeSpeech(),'zh-CN',()=>{if(state.page===7){state.byePlayed=true;render()}})}
function makeReport(type){const s=stats();return {id:state.id+'-'+type,type,title:type==='module'?'模块练习总结':'整次学习总结',book:'A Clean Room（干净的房间）',completedBooks:1,totalBooks:1,statistics:s,oral:state.oral.slice(),events:state.events.slice(),exercises:state.exerciseRecords.map(r=>({...r})),reviews:state.reviewRecords.map(r=>({...r})),practiceReads:state.practiceReads.slice(),deepDialog:state.deepLogs.slice(),generated:Date.now(),simulation:'所有统计来自本次实际选择或输入；AI 回复、语音识别与评分使用本地演示规则，不是真实模型评估。'};}
function saveReport(r){reports=reports.filter(x=>x.id!==r.id);reports.push(r);try{localStorage.setItem(STORE,JSON.stringify(reports.slice(-30)))}catch{toast('本地记录保存受限，仍可下载报告。')}if(settings.autoDownload)downloadReport(r);}
function saveModule(){if(!state.moduleReport){state.moduleReport=makeReport('module');saveReport(state.moduleReport)}}
function saveSession(){if(!state.sessionReport){state.sessionReport=makeReport('session');saveReport(state.sessionReport)}}
function reportText(r){const s=r.statistics;return `${r.title}\n绘本：${r.book}\n完成绘本：1/1\n课堂练习：${s.exercises} 题 · 首次正确 ${s.initialCorrect} 题 · 首次错误 ${s.initialWrong} 题\n通过补练解决：${s.resolved.length} 道 · 尚待巩固：${s.remainingWrong} 道\n已掌握：${s.good.map(k=>WORDS[k].en).join('、')||'暂无'}\n待巩固：${s.weak.map(k=>WORDS[k].en).join('、')||'无'}\n孩子实际模拟开口：${s.oral} 次（不含选择题点击、老师播报或带练）\n\n原始课堂作答：\n${r.exercises.map((e,i)=>`${i+1}. ${e.prompt}\n教学来源：${e.teachingLine}\n孩子答案：${e.answer}\n正确答案：${e.expected}\n首次结果：${e.pass?'通过':e.reason}`).join('\n\n')}\n\n对应错题补练：\n${r.reviews.length?r.reviews.map(e=>`${e.questionId} · 第 ${e.attempt} 次 · ${e.answer} · ${e.guided?'老师带练，保留待巩固':e.pass?'补练通过':e.reason}`).join('\n'):'本轮全对，跳过错题补练。'}\n\n深度引导对话：\n${r.deepDialog.map(x=>(x.role==='teacher'?'雪梨老师':'孩子')+'：'+x.text).join('\n')}\n\n${r.simulation}`}
function downloadReport(r){const html='<!doctype html><meta charset="utf-8"><title>雪梨智学学习报告</title><style>body{max-width:850px;margin:40px auto;font:16px/1.8 system-ui;background:#fff9ea;color:#673b1c;padding:25px}pre{font:inherit;white-space:pre-wrap;background:white;padding:25px;border:1px solid #e8d9b5;border-radius:20px}</style><h1>雪梨智学 · '+escapeText(r.title)+'</h1><pre>'+escapeText(reportText(r))+'</pre>';const u=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='雪梨智学-'+r.title+'.html';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function finish(){if(!state.byePlayed)return;state.ended=true;stopSpeech();render();show('今天的学习已结束','<p>明天见！今天已经完成，可以休息了。可以关闭浏览器页面。</p><button onclick="openParent()">查看家长报告</button>');}
function show(title,body){modalMode='info';modal.innerHTML=`<div class="modal"><header><h2>${escapeText(title)}</h2><button class="secondary" onclick="dismiss()">关闭 ×</button></header>${body}</div>`;modal.classList.remove('hidden')}
function dismiss(){modal.classList.add('hidden');modalMode='';}
function openMic(){
 if(state.ended)return;let title='和雪梨老师说说话',options=[],intro='',mode='ask',disabled=false;
 if(state.page===0){mode='welcome';title='和老师打个招呼';options=[['老师好！','老师好！']];intro='老师简短回应后开始今天的学习。'}
 else if(state.page===1&&state.lessonPhase==='quiz'&&currentQuestion().type==='speech'){
  mode='quiz';title='课堂练习 · 说出完整句子';const q=currentQuestion();disabled=state.exerciseRecords.some(r=>r.questionId===q.id);intro=disabled?'本题已经提交，请返回页面继续。':q.prompt;
  if(!disabled)options=[['识别为：'+q.target,q.target],['识别为：'+(q.key==='sentence'?'This room is clean.':'This room clean.'),q.key==='sentence'?'This room is clean.':'This room clean.'],['识别不清楚','__unclear__']];
 }
 else if(state.page===3){
  mode='review';const q=currentReview();disabled=state.reviewDone||state.reviewPending;title='错题补练 · '+(q.type==='speech'?'完整表达':'重新理解');intro=disabled?'当前补练已完成，请返回页面继续。':q.prompt;
  if(!disabled)options=q.type==='speech'?[[q.target+' · 完整表达',q.target],['识别不清楚','__unclear__']]:q.choices.map((t,i)=>[t,i]);
 }
 else if(state.page===4){mode='deep';title='爱干净的生活问答';intro='可以说中文，也可以试着说英文。';disabled=!['awaiting','expression'].includes(state.deepPhase)||state.deepFinished;options=state.deepPhase==='awaiting'?[['洗手','洗手'],['收玩具','收玩具'],['我想聊恐龙','恐龙']]:state.deepPhase==='expression'?[['wash hands','wash hands'],['表达还没完整','wash']]:[];}
 else if(state.page===7){mode='bye';title='和雪梨老师道别';options=[['老师再见！','老师再见！']];}
 else if(state.page===1){intro=state.lessonPhase==='quiz'?'当前是选择题，请在课程页面选择答案；老师也可以解释当前词句。':'老师知道你正在学哪一句，不需要重新说明课程。';options=[['clean 是什么意思？','clean 是什么意思'],['这句话是什么意思？','这句话是什么意思'],...(state.lessonPhase==='learn'?[['我想跟读这句','__read__']]:[]),['我想聊恐龙','恐龙']]}
 else options=[['这次哪里还需要练？','这次哪里还需要练']];
 show(title,`<div class="context">当前绘本：A Clean Room（干净的房间） · ${TITLES[state.page]}${state.page===1&&state.lessonPhase==='quiz'?' · 第 '+(state.quizIndex+1)+' 题':''}</div><p>${escapeText(intro)}</p><div class="chat-log">${(state.page===3?state.reviewLog:state.page===4?state.deepLogs:state.aiChat).slice(-4).map(x=>`<div class="chat-line ${x.role==='child'?'child':''}">${escapeText(x.text)}</div>`).join('')}</div><div class="choices">${options.map((x,i)=>`<button onclick="chooseMic(${i})">${escapeText(x[0])}</button>`).join('')}</div><div class="input-row"><input id="mic-input" aria-label="孩子的问题或回答" placeholder="输入孩子的话，模拟语音识别" onkeydown="if(event.key==='Enter')sendMic()"><button onclick="sendMic()">发送</button></div><p class="note">演示输入区：用预设识别结果或文字模拟孩子说话，不采集录音。老师使用浏览器语音。</p>`);
 modalMode=mode;modal.dataset.options=JSON.stringify(options);
 if(disabled||(mode==='ask'&&state.aiTurns>=3)){document.querySelector('#mic-input').disabled=true;modal.querySelectorAll('.choices button,.input-row button').forEach(x=>x.disabled=true)}
}
function chooseMic(i){const x=JSON.parse(modal.dataset.options||'[]')[i];if(x)dispatch(x[1])}
function sendMic(){const n=document.querySelector('#mic-input');if(n?.value.trim())dispatch(n.value.trim())}
function dispatch(text){
 if(modalMode==='quiz'){submitQuiz(text==='__unclear__'?'识别不清楚':text,text==='__unclear__');return}
 if(modalMode==='review'){const q=currentReview(),choice=q.choices?.indexOf(text),response=q.type==='speech'||typeof text==='number'?text:choice>=0?choice:text;submitReview(response,text==='__unclear__',true);return}
 if(modalMode==='deep'){submitDeep(text);return}
 if(modalMode==='welcome'){dismiss();speak('你好呀，我们先开始今天的学习吧。','zh-CN',()=>enter(1));return}
 if(modalMode==='bye'){dismiss();speak('明天见！今天已经完成，可以休息啦。','zh-CN',()=>{state.byePlayed=true;finish()});return}
 if(text==='__read__'){show('试着读当前这一句',`<p>${escapeText(LINES[state.line])}</p><div class="choices"><button onclick="submitLearning('${LINES[state.line]}')">模拟完整读对</button><button onclick="submitLearning('不完整表达')">模拟还没读完整</button></div><div class="input-row"><input id="read-input" aria-label="输入跟读内容" placeholder="输入刚才读的句子"><button onclick="submitLearning(document.querySelector('#read-input').value)">提交</button></div>`);return}
 answerQuestion(text)
}
function submitLearning(text){if(!text.trim()||state.lessonPhase!=='learn')return;const pass=norm(text)===norm(LINES[state.line]);recordChild(text,'课文试读');state.practiceReads.push({line:state.line,target:LINES[state.line],answer:text,pass,time:Date.now()});dismiss();toast(pass?'这句试读完整啦！正式练习时再验证一次。':'这句还没读完整，先听老师示范，再试试。');speak(pass?'这句说出来啦，继续学习吧。':'先听老师示范：'+LINES[state.line]);}
function answerQuestion(text){
 if(state.aiTurns>=3){dismiss();toast('先完成当前任务，再继续提问。');return}
 state.aiTurns++;if(state.page<5)recordChild(text,'课程提问');let answer='';
 if(/这句话|这句/.test(text))answer=LINE_CN[state.line];
 else if(/clean|干净/i.test(text))answer=state.line===2?'clean 在这句表示“打扫”。Let’s clean the room. 就是“我们一起整理房间”。':'clean 在这里是“干净的”。房间整理好了，可以说 This room is clean.';
 else if(/room|房间/i.test(text))answer='room 是“房间”。This is my room. 就是“这是我的房间”。';
 else if(/this|这个/i.test(text))answer='this 指“这个”，男孩介绍自己的房间时说 This is my room.';
 else if(/not/i.test(text))answer='not 表示“不”。This room is not clean. 是“这个房间不干净”。';
 else if(/哪里|练/.test(text))answer=stats().weak.length?'这轮需要再练 '+stats().weak.map(k=>WORDS[k].label||WORDS[k].en).join('、')+'，我们每次只看一个难点。':'本轮目前没有待巩固项，可以简短回顾今天的表达。';
 else answer='这个很有趣，不过我们先把当前的爱干净课程完成吧。';
 if(state.aiTurns>=3)answer+=' 我们先回到当前任务继续。';
 state.aiChat.push({role:'child',text},{role:'teacher',text:answer});openMic();speak(answer);if(state.aiTurns>=3)later(()=>dismiss(),4200)
}
function showWeak(){const rows=wrongRecords();show('本轮错题清单',rows.length?rows.map(r=>`<div class="record-row"><b>第 ${QUESTIONS.findIndex(q=>q.id===r.questionId)+1} 题 · ${escapeText(r.prompt)}</b><p>原答案：${escapeText(r.answer)}<br>${escapeText(r.reason)}<br>当前状态：${unresolvedRecords().some(v=>v.questionId===r.questionId)?'待巩固':'补练已通过'}</p></div>`).join(''):'<p>七道题全部通过，没有生成错题。</p>')}
function openInfo(name){show(name,name==='个人主页'?'<p>当前示例学习者：小宝贝。今日绘本：A Clean Room（干净的房间）。</p>':'<p>顶部入口保留原图位置，本次演示聚焦学习与 AI 伴读。关闭后继续当前任务。</p>')}
function openParent(){show('家长中心 · 学习记录',`<p class="note">报告保存在当前浏览器，模拟家长端接收，不上传远程服务器。</p><div class="report-list">${reports.length?reports.slice().reverse().map(r=>`<button onclick="openReport('${r.id}')">${escapeText(r.title)} · 已掌握 ${r.statistics.good.length} 项 · 模拟开口 ${r.statistics.oral} 次</button>`).join(''):'<p>总结生成后，报告会自动出现在这里。</p>'}</div>`)}
function openReport(id){const r=reports.find(x=>x.id===id);if(!r)return;show(r.title,`<pre>${escapeText(reportText(r))}</pre><button onclick="downloadReport(reports.find(r=>r.id==='${id}'))">下载报告</button> <button class="secondary" onclick="openParent()">返回家长中心</button>`)}
function openSettings(){if(state.page===0){clearTimers();stopSpeech()}show('声音与演示说明',`<div class="setting-line"><span>雪梨老师语音</span><select aria-label="语音设置" onchange="settings.voice=this.value==='on'"><option value="on" ${settings.voice?'selected':''}>开启</option><option value="off" ${!settings.voice?'selected':''}>关闭 · 文字流程</option></select></div><div class="setting-line"><span>总结报告自动下载</span><select onchange="settings.autoDownload=this.value==='on'"><option value="off" ${!settings.autoDownload?'selected':''}>关闭 · 保存到家长中心</option><option value="on" ${settings.autoDownload?'selected':''}>开启</option></select></div><p>先读爱干净绘本，再完成七道课堂练习。实际错题进入同一难点补练，全对时跳过补练。同一绘本在总结前只进行一次生活引导。</p><p class="note">选择题点击不计开口，老师示范不算孩子掌握。原始作答与补练结果分别保存。欢迎和道别自动播报，部分浏览器首次需要点击。AI 回复、识别与评分使用本地规则模拟。</p>`)}
function askReset(){show('重新开始演示？','<p>重置本次对话与回答状态，已保存的报告会保留。</p><button onclick="reset()">确认重新开始</button>')}
function reset(){clearTimers();stopSpeech();dismiss();state=createState();render();audioStatus('点击老师或主按钮开始欢迎语音');}
function fullscreen(){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}
document.addEventListener('keydown',e=>{if(e.key==='Escape')dismiss()});addEventListener('beforeunload',stopSpeech);render();later(()=>welcome(true),500);
