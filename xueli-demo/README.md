# 雪梨智学 · AI伴读三方案与24张产品 Demo

**[打开完整网页 →](https://kyraxujjj.github.io/trade/xueli-demo/?v=three-schemes)**

- [方案1：集中式AI定向带练，8张](https://kyraxujjj.github.io/trade/xueli-demo/?v=three-schemes#scheme1-gallery)
- [方案2：原页实时教学，8个状态与1张报告](https://kyraxujjj.github.io/trade/xueli-demo/?v=three-schemes#scheme2-gallery)
- [方案3：情境巩固，7张题目、反馈与报告](https://kyraxujjj.github.io/trade/xueli-demo/?v=three-schemes#scheme3-gallery)

三套完整流程图及原架构章节均保留。每套画廊紧随各自流程，支持单行横滑和前后切换；24张画面均附页面定位、目标场景、触发交互、功能联动、建议数据和下游用途六栏说明。顶部新增三方案直达入口。

方案2按八宫格顺序逐项重建，不把8个原页状态当作8个新增导航页面。实时辅导报告关注提示前后变化。

方案3提供听音选动作、选对与选错反馈、听句选人物、作答后短句跟读、模块小结及情境巩固报告。答题前无文字答案标签和预选正确项；人物题老师图标放左侧。情境报告区分认图理解与独立表达。

## 离线保存

源码：[index.html](./index.html)。在源码页点击 Download raw file 下载后，用浏览器打开。老师、绘本封面及参考风格新绘插画均已内嵌；UI使用原生HTML重建，未从参考拼图裁切页面。

## 演示边界与验证

这是产品交互原型。AI回复、语音评测和报告结果为预设演示，不连接后台、不采集录音。朗读使用浏览器语音能力，正式产品需接入审核标准音。数据字段为产品建议，需与研发确认。

Chromium已逐页截图检查24张画面：六栏说明完整、图片正常、内容无溢出、无页面脚本错误。已验证横滑导航、无选择提交、选错重试、选对反馈、人物题提交、点词解释、提示方式切换和报告问答；检查答题前未泄露答案文字。