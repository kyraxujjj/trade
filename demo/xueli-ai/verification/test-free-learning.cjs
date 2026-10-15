const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1536,height:820}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{speechSynthesis.speak=u=>setTimeout(()=>u.onend?.(),10);speechSynthesis.cancel=()=>{}});
 const click=async name=>page.getByRole('button',{name,exact:true}).click(),scene=async n=>page.waitForFunction(n=>state.page===n,n);
 await page.goto(process.env.DEMO_URL||'http://127.0.0.1:8026');await scene(8);
 await click('声音 / 演示说明');await page.getByRole('combobox',{name:'报告自动下载'}).selectOption('off');await click('关闭 ×');
 // Every topic and every module is selectable immediately, including before the core word lesson.
 const topics=['爱干净','美味食物','快乐运动','动物朋友'];
 for(const name of topics){
  await click(name+'，可以学习');await scene(9);assert.equal(await page.locator('.catalog-card.available').count(),4);assert.equal(await page.locator('.catalog-card.locked').count(),0);assert.doesNotMatch(await page.locator('#fields').innerText(),/待解锁|今日任务|明天/);
  for(const module of ['绘本','单词','视频','习题']){
   if(name==='爱干净'&&module==='单词')continue;
   await click(module+'，可以学习');await scene(10);assert.match(await page.locator('#fields').innerText(),new RegExp(name));await click('‹ 返回学习地图');await scene(9);
  }
  await click('‹ 选择其他主题');await scene(8);
 }
 // Finish a book with actual navigation; switching modules and reloading preserve its last page.
 await click('美味食物，可以学习');await click('绘本，继续学习');await scene(10);await click('继续学习 ›');assert.equal(await page.evaluate(()=>freeRecord().index),1);await click('‹ 返回学习地图');await page.reload();await scene(8);await click('美味食物，可以学习');await click('绘本，继续学习');await scene(10);assert.equal(await page.evaluate(()=>freeRecord().index),1);
 await click('麦克风：孩子说话');await click('模拟完整跟读');for(let i=0;i<2;i++)await click('继续学习 ›');await click('查看学习收获 ›');assert.equal(await page.evaluate(()=>freeRecord().completed),true);assert.equal(await page.evaluate(()=>freeRecord().oral.length),1);assert.equal(await page.evaluate(()=>reports.at(-1).statistics.good.length),0);await click('选择其他内容 ›');await scene(9);
 // Wrong choices are stored, without claiming mastery of the wrong answer.
 await click('习题，继续学习');await scene(10);for(let i=0;i<4;i++){const answer=await page.evaluate(i=>FREE_CONTENT.food[i===0?1:i].cn,i);await click(answer);await click(i===3?'查看学习收获 ›':'继续学习 ›')}
 assert.equal(await page.evaluate(()=>Object.values(freeRecord().results).filter(r=>r.pass).length),3);assert.equal(await page.evaluate(()=>freeRecord().answers[0].answer),'bread');await click('选择其他内容 ›');
 // Word study requires the child's speech before advancing and leaves a separate report.
 await click('单词，继续学习');await scene(10);assert.equal(await page.getByRole('button',{name:'继续学习 ›',exact:true}).isDisabled(),true);
 for(const [i,key] of ['apple','bread','milk','banana'].entries()){await click('麦克风：孩子说话');await click('识别为：'+key);await click(i===3?'查看学习收获 ›':'继续学习 ›')}
 assert.equal(await page.evaluate(()=>freeRecord().oral.length),4);assert.equal(await page.evaluate(()=>reports.at(-1).statistics.good.length),4);await click('选择其他内容 ›');
 // Video demonstration is an in-page animation with narrated scenes; pause and resume work.
 await click('视频，继续学习');await scene(10);await click('播放动画');await page.waitForFunction(()=>freeRecord().index>=1);await click('暂停动画');assert.equal(await page.evaluate(()=>state.activeLesson.playing),false);await click('播放动画');await click('雪梨老师：提问或寻求帮助');assert.equal(await page.evaluate(()=>state.activeLesson.playing),false);await click('继续当前学习');await click('播放动画');await page.waitForFunction(()=>freeRecord().completed);assert.equal(await page.evaluate(()=>reports.at(-1).moduleId),'video');
 await page.screenshot({path:path.resolve(__dirname,'../previews/v8-module-summary.png')});await click('选择其他内容 ›');await scene(9);assert.equal(await page.locator('.catalog-card.completed').count(),4);
 const saved=await page.evaluate(()=>reports.map(r=>r.id));await click('绘本，已学 · 可重练');await scene(10);await click('再学一遍 ›');assert.equal(await page.evaluate(()=>freeRecord().attempt),2);assert.equal(await page.evaluate(()=>freeRecord().index),0);assert.deepEqual(await page.evaluate(()=>reports.map(r=>r.id)),saved);await click('‹ 返回学习地图');await click('‹ 选择其他主题');await click('快乐运动，可以学习');await click('视频，继续学习');await scene(10);await page.screenshot({path:path.resolve(__dirname,'../previews/v8-free-animation.png')});
 assert.deepEqual(errors,[]);console.log('PASS: all four topics and modules unlocked; book navigation/child reading; independent progress and reload; actual exercise errors; word speech; narrated animation pause/resume; separate reports; immediate repeat with history retained.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
