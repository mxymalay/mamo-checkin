# Mamo Check-in installation

## English

macOS 12+ and Google Chrome are required. Download the latest `mamo-checkin-mac.zip` from the [GitHub Release](https://github.com/mxymalay/mamo-checkin/releases/latest). Do not download Source code.

1. Extract the ZIP into a permanent folder.
2. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the package's `extension` folder.
3. Run `Install Mac Recognition.command` or `安装 Mac 识别服务.command` from the extracted folder.
4. If macOS blocks the installer or `attendance-ocr`, open **System Settings > Privacy & Security > Open Anyway** for that file, then return to the extension and check again. Do not disable system security.
5. Enter your student email prefix and Attendance name, sign in to Attendance, detect courses, choose Gmail or Moodle sources, and save.

The full package already includes the extension, local OCR service, and installer. No separate OCR download is needed. Images and records stay on this computer.

## 中文

# 马莫签到助手安装指南

仅支持 **macOS 12+ 和 Chrome**。请从[本项目 Release](https://github.com/mxymalay/mamo-checkin/releases/latest)下载 Mac 安装包，不要下载 Source code。

## 1. 解压安装包

把解压后的文件夹放在固定位置，例如“应用程序”或“文稿”。

## 2. 加载 Chrome 扩展

打开 `chrome://extensions` → 开启右上角“开发者模式” → “加载已解压的扩展程序” → 选择包内的 **extension** 文件夹。

从 Chrome 扩展图标打开助手，页面会先引导安装识别服务。

## 3. 安装识别服务

双击包内的 **Install Mac Recognition.command** 或 **安装 Mac 识别服务.command**，按提示完成安装。需要 Python 3；若系统要求安装开发者命令行工具，请先完成安装。

### 如果 macOS 阻止打开

确认文件来自本项目 Release、是你要安装的文件后：

1. 先尝试双击打开一次。
2. 打开 **系统设置 → 隐私与安全性**。
3. 在“安全性”区域找到该文件的提示，点击 **仍要打开**。
4. 按系统提示确认，再回到助手页面。

安装命令与 **attendance-ocr** 识别程序可能需要分别允许。如果安装过程中提示 attendance-ocr 被阻止，请为它重复上面的操作，再回到引导页点击 **“已在系统设置允许，重新检测”**。

只允许此文件即可，无需关闭系统安全保护。不同 macOS 版本的按钮文字可能略有不同。[Apple 官方操作说明](https://support.apple.com/zh-cn/102445)

## 4. 刷新并继续

未安装时，助手每 5 秒检查一次安装状态；识别程序启动受阻时会暂停自动重试，等待你允许后手动重新检测。看到 **“安装成功 · 刷新并继续”** 后点击按钮，不必自己查找终端提示。

接着按页面顺序完成：

学校邮箱只填写前缀（例如 `abcd1234`），必须是 4 个英文字母加 4 个数字，后缀 `@student.monash.edu` 自动补全。

**填写学校姓名和邮箱 → 登录签到系统 → 点击检测课程 → 选择邮件/Moodle 来源 → 保存。**

全部完成后才会显示完整页面。确认来源已登录后，点击“立即签到”即可手动运行，无需开启自动运行。有修改时会先保存再签到；也可在签到设置区单独保存。需要定时检查时，再开启可选的自动运行并保存。

## 设置与使用

设置页中的“登录并检测”在验证通过后单独保存邮箱或姓名。关键词、课程年份和自动检查选项通过“保存设置”保存。Moodle 来源可填写 course_id 或粘贴完整课程网址。

点击“立即签到”进入签到记录页，其他保存操作留在当前分页。请以学校网站显示的签到状态为准，不确定的场次需要手动核对。
