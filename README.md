# Nya AI

English | [简体中文](README.zh-CN.md)

Nya AI combines AI chat client and collaboration platform, enabling you to chat with AI, search the web, take notes, write documents, communicate/collaborate with your team, manage files, and more within one unified workspace.

## First-class AI Chat

Unlike the added AI features of other collaboration platforms, AI Chat is our core feature, designed to fully replace standalone AI chat clients.

- Message Branching: Switch between multiple branches
- Document Input: Parse .docx, .pdf, .pptx, etc., into text input
- MCP: Connect to MCP servers to extend AI capabilities, supporting MCP Tools, Resources, and Prompts
- Multimodal Input/Output: Support for models like Nano Banana
- Web Search & Crawl: Built-in extensions for web search and web page crawling
- BYOK: Add custom providers to use any custom models
- Detailed configuration for model parameters and provider options
- User input preview, message TOC, quick scrolling, keyboard shortcuts, and other detailed features

## Workspaces

The workspace has a file system-like storage structure, allowing you to create folders and flexibly organize various types of content according to a custom structure.

The workspace is also a place for collaboration. You can create new workspaces, invite your team to join your workspace, manage roles of workspace members, and more. All members of the workspace can browse and edit the workspace content. All members of the workspace share the workspace's AI quota and storage space.

## Access anytime, anywhere

All content is stored in the cloud, allowing you to access everything from any device at any time. Thanks to [Zero](https://github.com/rocicorp/mono?tab=readme-ov-file#zero), we achieved this while enabling live queries and optimistic mutations, delivering an interaction experience close to local-first applications!

Thanks to our responsive interface design, mobile devices can also access Nya AI directly. It's also a PWA; you can install it to your home screen for an experience close to native apps.

## Interactions between different features

Currently, we support:

- Opening chat within pages to allow AI browsing/editing the page
- Automatically creating a chat when searching to generate an AI overview and facilitate follow-up conversations
- Quickly searching and translating via the floating menu that appears when selecting a chat message
- Using uploaded files anytime in chat, channels, and pages

We plan to add more cross-functional features in the future, such as calling the AI assistant directly within channels or enabling the AI to independently read workspace content.

## More

Search, pages, channels, translation, files... Learn more features by [getting started](https://nyaai.cc)!

## Self host

Please refer to [docker-compose.example.yml](docker-compose.example.yml).

## Development

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
