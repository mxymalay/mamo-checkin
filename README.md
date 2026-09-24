# Mamo Check-in · 马莫签到助手

[![Latest release](https://img.shields.io/github/v/release/mxymalay/mamo-checkin?style=flat-square)](https://github.com/mxymalay/mamo-checkin/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
![Platforms: macOS and Windows](https://img.shields.io/badge/Platforms-macOS%20%7C%20Windows-blue?style=flat-square)
![Built with OpenAI Codex](https://img.shields.io/badge/Built%20with-OpenAI%20Codex-222222?style=flat-square)

[English](#english) · [中文](#中文)

## English

Collect attendance codes from Gmail, Monash Moodle and Ed, recognize them locally, and check in to matching Monash Malaysia sessions.

Created by **mxymalay** in collaboration with **OpenAI Codex**.

**Chrome · macOS 12+ · Windows 10/11 x64 · English / 简体中文 / 繁體中文**

### Install

- [Chrome Web Store](https://chromewebstore.google.com/detail/mamo-check-in/mneachaobiledakoicnkinfdpcjkbnmm): install and follow the setup guide. Store updates undergo separate review.
- [GitHub releases](https://github.com/mxymalay/mamo-checkin/releases/latest): extract the extension ZIP, then use **Load unpacked** in `chrome://extensions`.
- Browser OCR works on both platforms. Mac users can optionally install the [Apple Vision helper](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip).

### New in 2.0.1

- Skip unnecessary code searches after checking website attendance status.
- Clearer login prompts, setup guidance, completion status and run logs.
- Fix incorrect expiry labels; preserve recognized codes and caches.

Recognition runs locally, without third-party AI uploads. Automatic checks require Chrome to stay running and the computer to remain awake. Review uncertain results before relying on them.

Students at other schools are welcome to adapt this project. Its modular design separates website adapters, recognition rules and the check-in flow, making it easier to customize school branding and integrate your own systems. Keep the original author attribution; adapting another school may require code changes, not just replacing a logo.

[Installation](INSTALL.md) · [User guide](USER-GUIDE.md#english) · [Mac OCR setup](OCR-INSTALL.md) · [Shared rules](https://github.com/mxymalay/mamo-checkin-rules)

## 中文

从 Gmail、Monash Moodle 和 Ed 收集签到码，在本机识别并匹配 Monash Malaysia 课程场次完成签到。

本项目由 **mxymalay** 与 **OpenAI Codex** 共同完成。

**Chrome · macOS 12+ · Windows 10/11 x64 · 简体中文 / 繁體中文 / English**

### 安装

- [Chrome 商店](https://chromewebstore.google.com/detail/mamo-check-in/mneachaobiledakoicnkinfdpcjkbnmm)：安装后按扩展引导配置，商店更新需单独审核。
- [GitHub 发布页](https://github.com/mxymalay/mamo-checkin/releases/latest)：下载扩展 ZIP 并解压，在 `chrome://extensions` 中选择“加载已解压的扩展程序”。
- 两个平台均支持浏览器 OCR；Mac 可选装 [Apple Vision 配套包](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip)。

### 2.0.1 更新

- 先核对网站签到状态，跳过不必要的签到码检索。
- 优化登录提醒、配置引导、完成状态和运行日志。
- 修正过期状态误判，保留已识别签到码与缓存。

识别在本机完成，不上传第三方 AI。自动运行需保持 Chrome 运行且电脑不休眠；不确定的结果请自行核对。

欢迎其他学校有需要的同学基于本项目改造。项目采用模块化设计，将网站适配、识别规则与签到流程分离，便于调整学校名称、标识并接入自己的学校系统。改造时请保留原作者署名；适配其他学校可能需要修改代码，并非只换标志即可使用。

[安装指南](INSTALL.md) · [使用指南](USER-GUIDE.md#中文) · [Mac OCR 说明](OCR-INSTALL.md) · [共享规则](https://github.com/mxymalay/mamo-checkin-rules)

## License / 协议

[MIT](LICENSE) · Copyright (c) 2026 [mxymalay](https://github.com/mxymalay).

Free to download, use, modify and redistribute, including commercially. Retain the original author's copyright notice and the MIT license. Third-party components retain their own licenses.

允许自由下载、使用、修改和再分发，包括商业用途；须保留原作者 **mxymalay** 的版权署名及 MIT 许可声明。第三方组件遵循各自协议。

## Development / 开发

```sh
npm ci
npm test
npm run build
npm run build:store
```

Mac OCR builds require Xcode command-line tools. / Mac OCR 构建需要 Xcode 命令行工具。
