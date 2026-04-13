# Stripe 支付知识库（纯静态 HTML 版）

## 打开方式
由于本项目使用了 ES Modules（`type="module"`），**请用本地静态服务器打开**（不要直接双击 `index.html`）。

示例（任选其一）：

1) Python
```bash
cd stripe-kb
python3 -m http.server 8000
```
浏览器打开：http://localhost:8000/

2) Node（如果你本机装了）
```bash
npx serve .
```

## 内容数据
当前只内置了少量“示例文章”，用于把页面骨架、进度、收藏、搜索、测验跑通。

后续接入 973 篇全量内容时，建议你把文章整理为统一的数据结构，然后**替换**：
`assets/data/articles.js`

> 如果你把 973 篇原始 Markdown（或打包 zip）上传给我，我可以帮你批量转换为该数据结构并接入站点。

