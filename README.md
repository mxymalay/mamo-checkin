# 马莫签到助手 · Mamo Check-in

从 Gmail 和 Monash Moodle 识别签到码，自动匹配课程并签到。支持文字和图片，使用 Mac 本机识别。

**[下载最新版](https://github.com/mxymalay/mamo-checkin/releases/latest)** · 仅支持 macOS 12+ 与 Chrome

## 安装

1. 下载 Release 中的 Mac 安装包，解压到固定位置。
2. 双击 `安装Mac识别服务.command`，按提示完成安装。需要 Python 3；系统提示安装开发者命令行工具时，请先安装。
3. 打开 Chrome 的 `chrome://extensions`，开启开发者模式，点击“加载已解压的扩展程序”，选择包内的 `extension` 文件夹。

升级时覆盖原扩展文件夹，点击“重新加载”并重新打开设置页；不要卸载，以保留配置。

## 使用

1. 在同一 Chrome 配置文件登录学校 Gmail、Moodle 和[签到系统](https://attendance.monash.edu.my/student/Units.aspx)。
2. 打开助手，确认检测课程，核对自动生成的课表。
3. 填写学校邮箱和姓名，为每门课选择邮件、Moodle 或两者作为签到码来源。
4. 保存并开启自动运行，或点击“立即检查”。也可在右上角导入个人配置。

课表可修改或重新检测；记录按课程和 Week 分组，支持复制签到码和导出 CSV。

只处理最近 7 天内、网站仍开放且课程信息匹配的场次。识别不确定时提示核对。默认每天检查一次，可改为每 3、5、7 天；关闭助手页面后仍可运行，但 Chrome 需保持运行、电脑不能睡眠。

原图与记录保存在本机，不上传至第三方 AI。归档目录为 `文稿/签到助手归档/`。

## 开发

```sh
npm ci
npm test
npm run build
```

构建需要 Mac 和 Xcode 命令行工具。公开测试使用虚构数据；真实校园账号的完整自动签到流程仍需验证。
