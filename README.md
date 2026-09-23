# Mamo Check-in · 马莫签到助手

[English](#english) · [中文](#中文)

## English

Collect attendance codes from Gmail, Monash Moodle and Ed, recognize them locally, and check in to matching Monash Malaysia sessions.

**Chrome · macOS 12+ · Windows 10/11 x64 · English / 简体中文 / 繁體中文**

### Install

- [Chrome Web Store](https://chromewebstore.google.com/detail/mamo-check-in/mneachaobiledakoicnkinfdpcjkbnmm): install and follow the setup guide. Store updates undergo separate review.
- [GitHub releases](https://github.com/mxymalay/mamo-checkin/releases/latest): extract the extension ZIP, then use **Load unpacked** in `chrome://extensions`.
- Browser OCR works on both platforms. Mac users can optionally install the [Apple Vision helper](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip).

### New in 2.0.0

- Create, import and share image-recognition rules with a guided practice flow.
- Test rules before assigning them to courses; default search covers the latest two weeks.
- Receive signed official rule updates without reinstalling the extension.

Recognition runs locally, without third-party AI uploads. Automatic checks require Chrome to stay running and the computer to remain awake. Review uncertain results before relying on them.

[Installation](INSTALL.md) · [User guide](USER-GUIDE.md#english) · [Mac OCR setup](OCR-INSTALL.md) · [Shared rules](https://github.com/mxymalay/mamo-checkin-rules)

## 中文

从 Gmail、Monash Moodle 和 Ed 收集签到码，在本机识别并匹配 Monash Malaysia 课程场次完成签到。

**Chrome · macOS 12+ · Windows 10/11 x64 · 简体中文 / 繁體中文 / English**

### 安装

- [Chrome 商店](https://chromewebstore.google.com/detail/mamo-check-in/mneachaobiledakoicnkinfdpcjkbnmm)：安装后按扩展引导配置，商店更新需单独审核。
- [GitHub 发布页](https://github.com/mxymalay/mamo-checkin/releases/latest)：下载扩展 ZIP 并解压，在 `chrome://extensions` 中选择“加载已解压的扩展程序”。
- 两个平台均支持浏览器 OCR；Mac 可选装 [Apple Vision 配套包](https://github.com/mxymalay/mamo-checkin/releases/latest/download/mamo-ocr-mac.zip)。

### 2.0.0 更新

- 分步创建、导入与共享图片识别规则，提供模拟练习。
- 规则先测试、再匹配课程，默认搜索最近两周。
- 官方规则支持签名自动更新，无需为规则调整反复安装扩展。

识别在本机完成，不上传第三方 AI。自动运行需保持 Chrome 运行且电脑不休眠；不确定的结果请自行核对。

[安装指南](INSTALL.md) · [使用指南](USER-GUIDE.md#中文) · [Mac OCR 说明](OCR-INSTALL.md) · [共享规则](https://github.com/mxymalay/mamo-checkin-rules)

## Development / 开发

```sh
npm ci
npm test
npm run build
npm run build:store
```

Mac OCR builds require Xcode command-line tools. / Mac OCR 构建需要 Xcode 命令行工具。
