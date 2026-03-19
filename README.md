# Nya AI

[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/NitroRCr/nyaai)

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

## Documentation

We have not set up documentation yet, but you can ask the AI in [Zread](https://zread.ai/NitroRCr/nyaai) to learn more details about this project.

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
