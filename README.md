# Image2 Studio

一个本地运行的 AI 生图网站，支持 OpenAI Images API 兼容接口。  
可以绑定自己的 `API Base URL` 和 `API Key`，用于文生图、图生图、Mask 局部编辑、尺寸/质量控制和提示词优化。

> 仓库地址：`https://github.com/lczlichunzhe/image2-studio`

## 功能

- 文生图
- 图生图 / 参考图生成
- Mask 局部编辑
- 自定义 API Base URL
- 自定义 API Key
- 支持 OpenAI / 兼容 OpenAI Images API 的第三方接口
- 模型选择：`gpt-image-2`、`gpt-image-1.5`、`gpt-image-1`、`gpt-image-1-mini`、自定义模型
- 几 K 档选择：1K、2K、4K、横图、竖图、方图
- 自定义尺寸
- 质量选择：`auto`、`low`、`medium`、`high`
- 输出格式：`png`、`jpeg`、`webp`
- 输出压缩
- 背景设置
- 审核强度
- 参考图保真度
- AI 提示词优化：均衡增强、精准可控、电影质感、商业成片、不优化
- 费用倍率提示：根据尺寸、质量、数量估算相对消耗
- 接口测试：检查 Base URL 和 Key 是否可用
- 本地历史记录
- 下载图片
- 复制图片
- 复用提示词

## 项目结构

```text
image2-studio/
├─ public/
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
├─ server.js
├─ package.json
├─ README.md
└─ 启动生图网站.cmd
```

## 本地启动

需要 Node.js 20 或更高版本。

### Windows 双击启动

直接双击：

```text
启动生图网站.cmd
```

然后打开：

```text
http://localhost:4173
```

### 命令行启动

```bash
npm start
```

默认地址：

```text
http://localhost:4173
```

## 接口配置

打开网站后，点击右上角钥匙按钮，填写：

```text
服务名称：OpenAI / 第三方接口名称
API Base URL：https://api.openai.com/v1
API Key：你的 API Key
Organization：可选
Project：可选
```

如果使用第三方兼容接口，把 `API Base URL` 改成服务商提供的地址，例如：

```text
https://example.com/v1
```

程序会自动请求：

```text
https://example.com/v1/images/generations
https://example.com/v1/images/edits
```

## 安全说明

- API Key 保存在当前浏览器的 `localStorage` 或 `sessionStorage` 中。
- API Key 不会写入服务端文件。
- 默认服务只监听 `127.0.0.1`，适合自己电脑本地使用。
- 如果部署到公网，请不要内置自己的 API Key。
- 建议让每个使用者填写自己的 Key。

## 费用提示

页面里的费用提示是“相对消耗估算”，不是最终账单价格。

影响费用的因素通常包括：

- 模型
- 图片尺寸
- 图片质量
- 生成数量
- 服务商计费规则

最终费用以 OpenAI 或第三方服务商账单为准。

## 部署说明

### GitHub Pages

不建议直接用 GitHub Pages 部署完整版本。

原因：本项目需要 `server.js` 作为后端代理请求图像接口，而 GitHub Pages 只能托管静态文件，不能运行 Node.js 后端。

如果强行只部署 `public/`，页面可以打开，但 `/api/images` 和 `/api/test` 无法工作。

### 推荐部署方式

推荐使用支持 Node.js 的平台：

- Render
- Railway
- Fly.io
- Vercel
- 自己的 VPS

部署时启动命令：

```bash
npm start
```

默认端口：

```text
4173
```

如果平台要求读取环境变量端口，可以设置：

```bash
PORT=4173
```

如果需要公网访问，可以设置：

```bash
HOST=0.0.0.0
```

## Render 部署示例

1. 把项目推送到 GitHub。
2. 打开 Render。
3. New Web Service。
4. 选择 `lczlichunzhe/image2-studio` 仓库。
5. Build Command 留空或填：

```bash
npm install
```

6. Start Command 填：

```bash
npm start
```

7. 环境变量可选：

```text
HOST=0.0.0.0
PORT=10000
```

注意：有些平台会自动注入 `PORT`，通常不需要手动设置。

## 常见问题

### 1. 页面打不开

确认服务是否已启动：

```bash
npm start
```

然后访问：

```text
http://localhost:4173/api/health
```

如果返回：

```json
{ "ok": true }
```

说明服务正常。

### 2. 提示未绑定 API Key

点击右上角钥匙按钮，填写 API Key 并保存。

### 3. 接口测试失败

检查：

- API Base URL 是否正确
- API Key 是否正确
- Key 是否有图像接口权限
- 服务商是否兼容 OpenAI Images API
- 本地网络是否能访问对应服务商

### 4. 生成失败，但接口测试正常

可能原因：

- 模型名不支持
- 尺寸不支持
- 质量参数不支持
- 服务商不支持图生图或 Mask 编辑
- 账号额度不足

可以尝试：

- 使用 `gpt-image-1`
- 尺寸选择 `1024x1024`
- 质量选择 `auto`
- 输出格式选择 `png`
- 关闭透明背景

## License

Private / Personal use by default.  
如果要公开开源，可以自行补充许可证，例如 MIT。
