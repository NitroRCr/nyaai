# Nya AI

[English](README.md) | 简体中文

Nya AI 结合了 AI 对话客户端和协作平台，让你能够在一个统一的工作空间中进行 AI 对话、网络搜索、记笔记、编写文档、与团队沟通/协作、管理文件等操作。

## 一流的 AI 对话

与其他协作平台中附加的 AI 功能不同，AI 对话是我们的核心功能，旨在完全取代单独的 AI 对话客户端。

- 消息分支：在多个分支之间切换
- 文档输入：将 .docx、.pdf、.pptx 等解析为文本输入
- MCP：连接 MCP 服务器以扩展 AI 功能，支持 MCP Tools、Resources 和 Prompts
- 多模态输入/输出：支持 Nano Banana 等模型
- 网络搜索与爬取：内置网页搜索和网页爬取的扩展
- BYOK：添加自定义服务商以使用任何自定义模型
- 具体的模型参数和服务商选项配置
- 用户输入预览、消息 TOC、快速滚动、键盘快捷键及其他细节功能

## 工作区

工作区拥有类似文件系统的储存结构，你可以创建文件夹，按照自定义的结构灵活地组织各种类型的内容。

工作区也是协作的地方，你可以创建新的工作区，邀请你的团队加入你的工作区，管理工作区成员的角色等。工作区的所有成员都可以浏览、编辑工作区的内容。工作区的所有成员共享工作区的 AI 额度和储存空间。

## 随时随地访问

所有内容都储存在云端，你可以随时通过任意设备访问所有内容。得益于 [Zero](https://github.com/rocicorp/mono?tab=readme-ov-file#zero)，我们得以在实现这一切的同时实现实时查询和乐观突变，达到接近本地优先应用的交互体验！

得益于响应式的界面设计，移动端也能够直接访问。本应用也是 PWA，你可以将其安装至主屏幕以获得接近原生应用的体验。

## 不同功能之间的交互

目前我们支持：

- 在页面中打开对话，以让 AI 浏览/编辑 页面
- 搜索时会自动创建对话以生成 AI 概览 和 进行后续对话
- 通过选中对话消息时的浮动菜单，可快捷搜索和翻译
- 上传的文件可随时在对话、频道、页面中使用

我们计划会添加更多交叉功能，比如在频道中直接调用 AI 助手，或是让 AI 能够自主地读取工作区内容。

## 更多

搜索、页面、频道、翻译、文件... 通过 [开始使用](https://nyaai.cc) 来了解更多功能！

## 自部署

请参考 [docker-compose.example.yml](docker-compose.example.yml)。

## 开发

```sh
# Copy and udpate .env
cp .env.example .env

# Install dependencies
bun install

# Prepare for linting, type-checking, etc
bun quasar prepare

# Startup dev db
bun dev:db-up

# Startup dev server
bun dev:server

# zero-cache is not yet compatible with bun; run it with node.
npm i -g @rocicorp/zero
zero-cache-dev

# Dev user frontend
bun dev:frontend

# Dev admin frontend
bun dev:admin
```
