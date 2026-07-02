# Image2 Studio

一个本地运行的 AI 生图工作台。支持自定义 `API Base URL` 和 `API Key`，可以调用 OpenAI Images API 兼容接口，用来文生图、图生图、管理历史记录和导出图片。

仓库地址：<https://github.com/lczlichunzhe/image2-studio>

## 适合谁用

- 自己电脑本地生图
- 发给朋友，让对方填写自己的 API Key 使用
- 使用 OpenAI 或兼容 OpenAI Images API 的第三方服务商

注意：这不是纯静态网页，不能只打开 `public/index.html` 完整使用。它需要本地 Node.js 服务转发 API 请求。

## 主要功能

- 文生图
- 图生图 / 多张参考图生成
- 参考图拖拽上传、点击上传、文件夹批量追加
- 参考图可单张移除，也可以一键清空
- Mask 局部编辑
- 结果图一键进入局部修改：画笔涂抹选区后按提示词重绘
- 自定义 API Base URL
- 自定义 API Key
- OpenAI / 第三方兼容接口
- 模型选择：`gpt-image-2`、`gpt-image-1.5`、`gpt-image-1`、`gpt-image-1-mini`、自定义模型
- 固定尺寸选择：常规尺寸、小红书、电商、社媒、壁纸、收藏尺寸
- 1K / 2K / 4K 尺寸预设
- 省钱模式 / 高清模式
- 输出格式：`png`、`jpeg`、`webp`
- 输出压缩、背景、审核强度、参考图保真度
- AI 提示词优化
- 提示词模板库
- 接口测试
- 失败诊断提示
- 本地历史记录
- 历史搜索、筛选、单条删除、一键清空
- 出图时间和生成耗时记录
- 查看大图、下载图片、复制图片、复用提示词
- Curry Splash / Aurora Cockpit / Clean Studio / Creator Pink 主题切换

## Windows 快速启动

先安装 Node.js 20 或更高版本：<https://nodejs.org/>

然后双击项目文件夹里的：

```text
启动生图网站.vbs
```

或：

```text
启动生图网站.cmd
```

启动后打开：

```text
http://localhost:4173
```

如果页面没有变成最新版本，可以按：

```text
Ctrl + F5
```

强制刷新浏览器缓存。

## 命令行启动

```bash
npm start
```

默认地址：

```text
http://localhost:4173
```

健康检查：

```text
http://localhost:4173/api/health
```

正常会返回：

```json
{ "ok": true }
```

## API 配置

打开网站后，点击右上角钥匙按钮，填写：

```text
服务名称：OpenAI 或你的服务商名称
API Base URL：https://api.openai.com/v1
API Key：你的 API Key
Organization：可选
Project：可选
```

如果你用第三方兼容接口，把 `API Base URL` 改成服务商给你的地址，例如：

```text
https://example.com/v1
```

程序会请求：

```text
https://example.com/v1/images/generations
https://example.com/v1/images/edits
```

## 尺寸和展示

页面使用固定尺寸选择，适合直接按用途出图：

- 常规尺寸：1024x1024、1536x1024、1024x1536、2K、4K
- 小红书尺寸：头像、个人背景图、图文封面、视频封面
- 电商尺寸：主图、详情横图、海报
- 社媒尺寸：公众号头图、B 站封面、抖音封面
- 壁纸尺寸：手机壁纸、电脑壁纸

默认是 `1024x1024`，适合先快速出图测试。想要更大可以切到 2K / 4K 或自定义尺寸。

中间画布会完整等比例展示图片，大图会自动缩小到可视区域里，不会只露出一小块。生成后的后处理也会完整保留原图内容，必要时在目标尺寸内居中留白，不再裁掉上方或下方。

## 局部修改

生成图片后，悬停结果图，点击魔法棒按钮可以进入局部修改模式。

用法：

- 在图片上用画笔涂抹需要修改的区域
- 输入修改要求，例如 `把屋子改成红色砖墙，保持天空、人物和树木不变`
- 点击 `提交局部修改`
- 修改后的图片会回到主画布，并保存到历史记录

这个功能会调用图片编辑接口，需要当前图片服务商支持 `image edit / mask / inpainting`。如果服务商只支持文生图，局部修改会返回失败诊断。

## 给别人用

把整个项目文件夹发给对方，或者让对方从 GitHub 下载 ZIP。

对方需要做：

1. 安装 Node.js 20 或更高版本
2. 解压项目
3. 双击 `启动生图网站.vbs`
4. 打开 `http://localhost:4173`
5. 填入自己的 `API Base URL` 和 `API Key`

不要只发 `public/index.html`，那样页面能打开，但生图接口不能正常工作。

## 历史记录

生成成功后，图片会保存到当前浏览器的本地历史里。

历史区支持：

- 右侧滚动列表
- 搜索提示词 / 尺寸 / 模型
- 按 1K / 2K / 4K / 今天筛选
- 单击历史卡片打开到主画布
- 双击历史卡片查看大图
- 单条删除
- 一键清空
- 复用提示词
- 查看生成时间、耗时、目标尺寸和实际接口尺寸

历史记录保存在浏览器本地，不会上传到 GitHub。

如果换浏览器、清理浏览器数据、或使用无痕模式，历史可能会消失。

## 常见问题

### 页面打开了，但不能生图

确认你打开的是：

```text
http://localhost:4173
```

不要只打开：

```text
public/index.html
```

### 提示未绑定 API Key

点击右上角钥匙按钮，填写 `API Base URL` 和 `API Key`，然后保存。

### 接口测试失败

检查：

- API Base URL 是否正确
- API Key 是否正确
- Key 是否有图像接口权限
- 当前网络是否能访问服务商
- 服务商是否兼容 OpenAI Images API

### 生成失败，但接口测试正常

可能是：

- 模型名不支持
- 当前尺寸不支持
- 质量参数不支持
- 当前服务商不支持图生图或 Mask
- 账户额度不足

可以先尝试：

```text
模型：gpt-image-1
尺寸：1024x1024
质量：auto
格式：png
背景：auto
```

### 历史看不到

先按 `Ctrl + F5` 强制刷新。

如果仍然没有：

- 确认当前浏览器没有禁用 IndexedDB
- 确认不是无痕模式
- 旧版本生成的临时远程图片链接可能已经过期

新版本历史会显示为卡片，即使图片预览失效，也会显示提示词和尺寸信息。

## 部署说明

不建议直接用 GitHub Pages 部署完整版本。

原因：GitHub Pages 只能托管静态文件，不能运行 `server.js`，所以 `/api/images` 和 `/api/test` 无法工作。

推荐部署到支持 Node.js 的平台：

- Render
- Railway
- Fly.io
- Vercel
- 自己的 VPS

启动命令：

```bash
npm start
```

环境变量示例：

```text
HOST=0.0.0.0
PORT=4173
```

## 项目结构

```text
image2-studio/
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── server.js
├── package.json
├── README.md
├── start-image2.vbs
├── 启动生图网站.vbs
└── 启动生图网站.cmd
```

## 安全说明

- API Key 保存在当前浏览器本地
- API Key 不会写入仓库文件
- 默认只监听本机地址，适合自己电脑使用
- 如果部署到公网，不要把自己的 API Key 写死在代码里
- 建议每个使用者填写自己的 Key

## License

Private / Personal use by default.
