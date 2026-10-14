const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const base=process.env.DEMO_URL||'http://127.0.0.1:8025';const out=path.resolve(__dirname,'../previews');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1536,height:820},acceptDownloads:true});const errors=[],downloads=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d));
 await page.addInitScript(()=>{window.ttsCalls=[];const s=speechSynthesis;s.speak=u=>{ttsCalls.push({text:u.text,lang:u.lang});setTimeout(()=>u.onstart?.(),5);setTimeout(()=>u.onend?.(),70)};s.cancel=()=>{}});
 await page.goto(base);const click=async name=>page.getByRole('button',{name,exact:true}).click();const scene=async n=>page.waitForFunction(n=>state.page===n,n);
 await scene(1);assert.equal(await page.evaluate(()=>ttsCalls[0].text),'你好呀，我是雪梨老师，今天我会陪你一起学英语，让我们开始今天的学习吧。');
 assert.deepEqual(await page.evaluate(()=>state.results),{});assert.equal(await page.evaluate(()=>state.exerciseRecords.length),0);
 await page.screenshot({path:path.join(out,'v5-learning.png')});await click('开始课堂练习');
 // The seven answers are submitted through visible controls; there are no injected records.
 const choices=['玩具','这个','干净的','收拾好的房间','我们一起整理房间。'];
 for(let i=0;i<7;i++){
  assert.equal(await page.evaluate(()=>state.quizIndex),i);
  assert.equal(await page.getByRole('button',{name:'先完成这道题',exact:true}).isDisabled(),true);
  if(i===0)await page.screenshot({path:path.join(out,'v5-choice-question.png')});
  if(i===3)await page.screenshot({path:path.join(out,'v5-picture-question.png')});
  if(i<5)await click(choices[i]);else{
   if(i===6)await page.screenshot({path:path.join(out,'v5-reading-question.png')});
   await click('麦克风：回答或提问');await click('识别为：'+(i===5?'This room is clean.':'This room is clean.'));
  }
  assert.equal(await page.evaluate(()=>state.exerciseRecords.length),i+1);
  await click(i===6?'查看练习结果':'下一题');
 }
 await scene(2);assert.equal(await page.evaluate(()=>stats().initialCorrect),4);assert.equal(await page.evaluate(()=>stats().initialWrong),3);
 assert.deepEqual(await page.evaluate(()=>state.queue),['room-meaning','not-picture','not-reading']);
 await page.screenshot({path:path.join(out,'v5-actual-errors.png')});await click('查看更多练习记录');
 const evidence=await page.locator('#modal').innerText();assert.match(evidence,/原答案：玩具/);assert.match(evidence,/原答案：This room is clean/);assert.match(evidence,/漏掉了 not/);await click('关闭 ×');
 await click('开始错题复习');await scene(3);await page.screenshot({path:path.join(out,'v5-meaning-review.png')});
 await click('麦克风：回答或提问');await page.locator('#mic-input').fill('我还不知道');await click('发送');assert.equal(await page.evaluate(()=>state.reviewRecords[0].answer),'我还不知道');assert.equal(await page.evaluate(()=>state.reviewAttempts),1);assert.equal(await page.evaluate(()=>state.reviewDone),false);
 await click('房间');assert.equal(await page.evaluate(()=>state.results.room),'mastered');await click('下一个错题');
 assert.equal(await page.evaluate(()=>currentReview().id),'not-picture');await click('玩具散落的房间');
 // Meaning and speaking are different checks: solving the picture error does not solve the missing-not error.
 assert.equal(await page.evaluate(()=>state.results.sentence),'review');await click('下一个错题');
 await click('麦克风：回答或提问');await page.locator('#mic-input').fill('This room is clean.');await click('发送');
 assert.match(await page.locator('.review-feedback').innerText(),/not/);await click('麦克风：回答或提问');await click('This room is not clean. · 完整表达');
 assert.equal(await page.evaluate(()=>state.results.sentence),'mastered');assert.equal(await page.evaluate(()=>stats().resolved.length),3);
 await page.screenshot({path:path.join(out,'v5-resolved-review.png')});await click('进入生活引导');await scene(4);await page.waitForFunction(()=>state.deepPhase==='awaiting');
 assert.equal(await page.locator('.deep-fragment.reply').count(),0);assert.equal(await page.locator('.deep-fragment.expression').count(),0);
 await page.screenshot({path:path.join(out,'v5-deep-question.png')});
 const now=await page.evaluate(()=>Date.now());await page.clock.install({time:new Date(now)});await page.clock.pauseAt(new Date(now+1000));
 await click('麦克风：回答或提问');await click('洗手');assert.equal(await page.evaluate(()=>state.deepPhase),'child-shown');
 assert.equal(await page.locator('.deep-fragment.child').count(),1);assert.equal(await page.locator('.deep-fragment.reply').count(),0);
 await page.clock.fastForward(801);assert.equal(await page.locator('.deep-fragment.reply').count(),1);assert.equal(await page.locator('.deep-fragment.expression').count(),0);
 await page.clock.fastForward(71);await page.clock.fastForward(261);assert.equal(await page.evaluate(()=>state.deepPhase),'expression');await page.clock.resume();await page.waitForTimeout(450);
 await page.screenshot({path:path.join(out,'v5-deep-dialog.png')});await click('麦克风：回答或提问');await click('wash hands');await page.waitForFunction(()=>state.deepPhase==='done');
 await click('继续，查看模块学习总结');await scene(5);const stats=await page.evaluate(()=>state.moduleReport.statistics);
 assert.equal(stats.good.length,7);assert.equal(stats.weak.length,0);assert.equal(stats.exercises,7);assert.equal(stats.resolved.length,3);assert.equal(stats.oral,7);
 assert.equal(await page.evaluate(()=>state.moduleReport.exercises[0].answer),'玩具');assert.equal(await page.evaluate(()=>state.moduleReport.exercises[0].pass),false);
 assert.equal(await page.evaluate(()=>state.moduleReport.deepDialog.filter(x=>x.role==='teacher'&&x.text==='除了整理房间，你还知道哪些爱干净的事情呀？').length),1);
 await page.screenshot({path:path.join(out,'v5-module-summary.png')});await click('查看今日学习总结');await scene(6);assert.equal(downloads.length,2);
 await page.screenshot({path:path.join(out,'v5-session-summary.png')});await click('完成今天学习');await scene(7);await page.waitForFunction(()=>state.byePlayed);
 assert.match(await page.evaluate(()=>ttsCalls.at(-1).text),/今天已经完成，可以休息了。明天见/);await page.screenshot({path:path.join(out,'v5-goodbye.png')});
 await click('明天见，结束学习');assert.equal(await page.evaluate(()=>state.ended),true);assert.equal(await page.getByRole('button',{name:'麦克风：回答或提问',exact:true}).isDisabled(),true);
 await click('查看家长报告');assert.equal(await page.locator('.report-list button').count(),2);await click('关闭 ×');
 for(let i=0;i<downloads.length;i++){const target=path.resolve('/tmp',`xueli-v5-report-${i}.html`);await downloads[i].saveAs(target);const text=fs.readFileSync(target,'utf8');assert.match(text,/首次错误 3 题/);assert.match(text,/孩子答案：玩具/);assert.match(text,/room-meaning/);assert.doesNotMatch(text,/预置|baseline/)}
 assert.deepEqual(errors,[]);console.log('PASS: actual 7-question UI route -> 3 specific original errors -> same-question review -> separate not meaning/speaking mastery -> one sequential deep dialogue -> actual report downloads and goodbye; 7 child utterances (including a spoken meaning answer), 7 mastered targets, no JS errors.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
