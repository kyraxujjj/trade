const{chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');
const base=process.env.DEMO_URL||'http://127.0.0.1:8025';const out=path.resolve(__dirname,'../previews');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1280,height:720}});const errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{window.ttsCalls=[];speechSynthesis.speak=u=>{ttsCalls.push(u.text);setTimeout(()=>u.onend?.(),40)};speechSynthesis.cancel=()=>{}});
 const click=async(n)=>p.getByRole('button',{name:n,exact:true}).click();
 async function begin(){await p.goto(base);await p.waitForFunction(()=>state.page===1);await p.evaluate(()=>settings.autoDownload=false)}
 async function quiz(mode){
  await click('开始课堂练习');const correct=['房间','这个','干净的','玩具散落的房间','我们一起整理房间。'],wrong=['玩具','那个','脏的','收拾好的房间','我们一起睡觉。'];
  for(let i=0;i<7;i++){
   if(i<5)await click(mode==='all-wrong'?wrong[i]:correct[i]);else{await click('麦克风：回答或提问');await click('识别为：'+(i===5?(mode==='all-wrong'?'This room clean.':'This room is clean.'):(mode==='correct'?'This room is not clean.':'This room is clean.')))}
   await click(i===6?'查看练习结果':'下一题');
  }
  await p.waitForFunction(()=>state.page===2);
 }
 // All correct: the summary must have zero errors; no review is needed.
 await begin();await quiz('correct');assert.equal(await p.evaluate(()=>wrongRecords().length),0);assert.equal(await p.evaluate(()=>stats().good.length),6);
 await click('查看更多练习记录');assert.match(await p.locator('#modal').innerText(),/没有生成错题/);await click('关闭 ×');await p.screenshot({path:path.join(out,'v5-all-correct.png')});
 await click('继续到生活引导');await p.waitForFunction(()=>state.deepPhase==='awaiting');assert.equal(await p.evaluate(()=>state.reviewRecords.length),0);
 // Reset cancels the delayed answer: no old bubble can appear in a new session.
 await click('麦克风：回答或提问');await click('洗手');await p.evaluate(()=>reset());await p.waitForTimeout(1200);assert.equal(await p.evaluate(()=>state.page),0);assert.equal(await p.locator('.deep-fragment.reply').count(),0);
 // A real missing-not error: two failed retries are followed by teacher support, not fake mastery.
 await begin();await quiz('negative');assert.deepEqual(await p.evaluate(()=>state.queue),['not-reading']);await click('开始错题复习');
 for(let i=0;i<2;i++){await click('麦克风：回答或提问');await p.locator('#mic-input').fill('This room is clean.');await click('发送')}
 assert.equal(await p.evaluate(()=>state.reviewAttempts),2);assert.equal(await p.evaluate(()=>state.reviewPending),true);const before=await p.evaluate(()=>state.oral.length);
 await click('跟老师完成并继续');await p.waitForFunction(()=>state.page===4&&state.deepPhase==='awaiting');assert.equal(await p.evaluate(()=>state.oral.length),before);assert.equal(await p.evaluate(()=>state.results.sentence),'review');assert.equal(await p.evaluate(()=>stats().resolved.length),0);
 for(let i=0;i<3;i++){await click('麦克风：回答或提问');await click('我想聊恐龙');await p.waitForFunction(()=>['awaiting','guided'].includes(state.deepPhase))}
 assert.equal(await p.evaluate(()=>state.deepTurns),3);assert.equal(await p.evaluate(()=>state.deepPhase),'guided');await click('跟读并继续');await p.waitForFunction(()=>state.page===5);
 assert.equal(await p.evaluate(()=>state.results.wash),'review');assert.equal(await p.evaluate(()=>state.moduleReport.statistics.oral),7);assert.equal(await p.evaluate(()=>state.moduleReport.statistics.good.length),5);
 assert.deepEqual(await p.evaluate(()=>tomorrowPlans()),['sentence','wash']);await p.screenshot({path:path.join(out,'v5-unresolved-summary.png')});await click('查看今日学习总结');await click('完成今天学习');await p.waitForFunction(()=>state.byePlayed);
 assert.match(await p.evaluate(()=>byeSpeech()),/This room is not clean.*wash hands/);await p.screenshot({path:path.join(out,'v5-unresolved-goodbye.png')});
 // None of the quiz answers pass: the same-question queue contains all seven errors.
 await begin();await quiz('all-wrong');assert.equal(await p.evaluate(()=>state.queue.length),7);assert.equal(await p.evaluate(()=>stats().good.length),0);await click('开始错题复习');
 const wrong=['玩具','那个','脏的','收拾好的房间','我们一起睡觉。'];
 for(let i=0;i<7;i++){
  for(let attempt=0;attempt<2;attempt++){if(i<5)await click(wrong[i]);else{await click('麦克风：回答或提问');await click('识别不清楚')}}
  assert.equal(await p.evaluate(()=>state.reviewPending),true);await click('跟老师完成并继续');
  if(i<6)await p.waitForFunction(i=>state.reviewIndex===i+1,i);else await p.waitForFunction(()=>state.deepPhase==='awaiting');
 }
 assert.equal(await p.evaluate(()=>unresolvedRecords().length),7);assert.equal(await p.evaluate(()=>stats().good.length),0);
 for(let i=0;i<3;i++){await click('麦克风：回答或提问');await click('我想聊恐龙');await p.waitForFunction(()=>['awaiting','guided'].includes(state.deepPhase))}
 await click('跟读并继续');await p.waitForFunction(()=>state.page===5);assert.equal(await p.evaluate(()=>state.moduleReport.statistics.good.length),0);assert.equal(await p.evaluate(()=>state.moduleReport.statistics.resolved.length),0);await p.screenshot({path:path.join(out,'v5-no-false-mastery.png')});
 // Teacher replay/settings keep the owning callback intact; fresh ID prevents stale callbacks.
 await begin();await quiz('correct');await click('继续到生活引导');await p.waitForFunction(()=>state.deepPhase==='asking');await click('雪梨老师：播放当前引导');await click('声音 / 演示说明');await p.waitForFunction(()=>state.deepPhase==='awaiting');await click('关闭 ×');
 assert.equal(await p.getByRole('button',{name:'麦克风：回答或提问',exact:true}).isEnabled(),true);
 await p.setViewportSize({width:1024,height:768});await p.waitForTimeout(100);const box=await p.locator('#stage').boundingBox();assert.ok(box.x>=-1&&box.x+box.width<=1025);
 // The delivered HTML loads with networking disabled and makes no external asset request. This managed browser blocks file://; setContent validates the exact standalone bytes.
 const offline=await b.newPage();const requests=[];offline.on('request',r=>requests.push(r.url()));await offline.context().setOffline(true);await offline.setContent(fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),{waitUntil:'load'});await offline.waitForFunction(()=>typeof state!=='undefined');assert.equal(await offline.locator('#background').evaluate(img=>img.complete&&img.naturalWidth>0),true);assert.ok(requests.every(url=>url.startsWith('file:')||url.startsWith('data:')));await offline.close();
 const blocked=await b.newPage();await blocked.addInitScript(()=>{window.ttsFailures=0;speechSynthesis.speak=u=>{ttsFailures++;setTimeout(()=>u.onerror?.(),10)};speechSynthesis.cancel=()=>{}});await blocked.goto(base);await blocked.waitForFunction(()=>ttsFailures>0);await blocked.waitForTimeout(50);assert.equal(await blocked.evaluate(()=>state.page),0);await blocked.getByRole('button',{name:'开始今天的学习',exact:true}).click();await blocked.waitForFunction(()=>state.page===1);await blocked.close();
 assert.deepEqual(errors,[]);console.log('PASS: all-correct skips review; actual missing-not error, retry cap, guided work counts neither mastery nor child speech; 3-turn fallback; exact weak-item plan and speech; 7 wrong questions all retained, zero fabricated mastery; reset, replay/settings, tablet fit, offline HTML, autoplay recovery.');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
