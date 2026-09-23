# Visual Rule Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在签到助手中提供无需 AI 的图片点选、规则生成、真实引擎预览及本地保存启用闭环。

**Architecture:** 点选代码运行在当前来源页面的隔离世界，后台持有有期限的授权会话，模块页提供正常用户可用的向导。复用来源适配器的内容范围、现有 v1 定位引擎和 preview-only OCR；规则库以单次写入保存规则与绑定。

**Tech Stack:** Chrome MV3、原生 JavaScript ES modules、DOM/CSS、Node.js test runner、jsdom、现有 fflate 打包工具，不新增依赖。

**Spec:** `docs/superpowers/specs/2026-09-23-visual-rule-builder-design.md`，用户已于本文编写前回复“开始”确认设计。

## Global Constraints

- 保持规则 schemaVersion 1。
- 本次不修改版本号、不发布主扩展 Release、不自动上传 GitHub。
- 预览阶段不提交签到、不写入正式收集记录、不消耗生产扫描缓存。
- 会话最多存活 10 分钟，同一时刻只允许一个生成会话。
- 最多验证 5 条消息、每条最多 20 个用户标记。
- 每次生成限制 64 个候选、路径最多 6 层，遵守已有 8 选择器/64 KiB 包及引擎节点预算。
- 沿用社区与本地合计最多 8 条绑定限制。
- 第一版只在这些既有授权站点工作，不新增所有网站权限，不自动增加 activeTab、debugger、外部扩展通信或远程脚本权限。
- 新增全部文案使用现有翻译机制，提供 en、zh_CN、zh_TW 对应规则模块文案。
- 覆盖长英文、390/768/1280 像素视口、键盘操作、焦点恢复、屏幕阅读器及减少动画偏好。
- 保留当前工作区已有修改。当前 `codex/course-parser-plugins` 的未提交源规则模块是本计划的依赖，不能只从 HEAD 创建不含这些文件的 worktree。
- 实施前记录当前 diff/文件清单；提交只包含本任务自己的修改，不能把此前全部未提交文件顺手提交。无法干净拆分的文件保留未提交并如实报告。
- Shell 验证使用 `/Users/xy/.local/bin/node`；浏览器测试遵守屏幕保持休眠规则，不用原生桌面抓图唤醒设备。

## Review Focus

1. Gmail 的会话已打开但主题无法唯一确认课程：不能把用户下拉选择直接当作已验证课程；Task 1 覆盖。
2. 源页面 SPA 跳转但 tabId 没变，或同 URL 的消息 DOM 已被换掉：旧选中图与预览不可继续启用；Task 3/4 覆盖。
3. 同一图片 URL 出现在多个 DOM 节点：不能因下载去重而漏掉被排除的节点；Task 2/5 覆盖。
4. 多门课共享规则时，其中一门课已满 8 条、配置变化或未验证：不能部分启用；Task 6 覆盖。
5. 自动检查、worker 重启、关闭编辑器及慢速 OCR 同时发生：不并行提交、不接受迟到结果、不保留孤立覆盖层；Task 4/5/8 覆盖。

## 文件与职责

新增目录 `extension/source-rules/builder/`，避免继续扩大 `options.js`：

| 文件 | 职责 |
| --- | --- |
| `picker.js` | 自包含隔离世界安装函数；根节点注册、图片句柄、覆盖层、键盘及清理 |
| `selector-generator.js` | 纯候选生成与正反例评估，不接触 Chrome API 或存储 |
| `page-bridge.js` | executeScript 调度、指定 document 的适配器验证与点选命令 |
| `session.js` | 后台会话、owner 校验、期限、草稿修订、采样与取消 |
| `preview.js` | 命中图片的有界下载、预览资源和 preview-only OCR |
| `ui.js` | 创建向导状态、交互、返回、草稿保留与安全导出 |
| `style.css` | 编辑器布局；隔离世界点选样式在 picker.js 的专用 shadow root 内 |

修改适配器、background.js、background-rules.js、library.js、模块页与 popup。新测试按上述边界分别命名为 `tests/rule-builder-*.test.js`；已有生产测试必须保持通过。

## 共同接口约定

```js
// Page-local only: never put DOM nodes or this metadata into storage/export.
// Root: {rootId, element, source, course, messageKey, contextText, isThread}
// Mark: {sampleId, imageId, include: boolean}
// Sample: {sampleId, course, rootId, documentId, root, positives: Element[], negatives: Element[]}
// The Sample DOM fields remain inside the isolated page world.

// Builder UI state (no body, raw DOM, source credentials or arbitrary URLs):
// {sessionId, expiresAt, revision, phase, source, courses, rule,
//  samples:[{sampleId,course,matchedCount,markedCount,validation}],
//  images:[{imageId,sampleId,width,height,state,marked}],
//  canEnable, reasonCodes, previewRevision}

// Commands from the exact extension owner document:
// builderTabs {course,source}
// builderStart {tabId,course,source}
// builderSample {sessionId,tabId,course}
// builderMark {sessionId,sampleId,imageId,include}
// builderDraft {sessionId,revision,name,courses}
// builderPreview {sessionId,revision}
// builderImage {sessionId,imageId}
// builderRecognize {sessionId,imageId,previewRevision}
// builderConfirm {sessionId,previewRevision,imageIds}
// builderSave {sessionId,revision,previewRevision,enableCourses,replace}
// builderExport {sessionId,revision}
// builderStatus / builderCancel {sessionId}

// Only content-script event accepted:
// builderPickEvent {sessionId,rootId,imageId,event:'selected'|'cancelled'|'invalidated'}
// Background checks actual sender, then re-reads the authoritative page registry.
// No event accepts a raw rule, image URL, course override or enabled bindings.
```

每个接受用户输入的消息只保留允许字段并校验类型、长度、枚举与修订。错误通过稳定的 `builder-*` 代码翻译，不输出原始网页错误或私密 URL。

---

### Task 1: 共用经过验证的消息范围

**Files:** Modify `extension/gmail.js`, `extension/moodle.js`, `extension/ed-adapter.js`; Create `extension/source-rules/builder/picker.js` 的根注册部分; Test `tests/rule-builder-context.test.js`, `tests/source-rule-adapters.test.js`。

**Interfaces:** 三个适配器增加 `builderDescribe` 命令，参数由后台已保存配置产生。它在原有验证与根节点计算后调用 `globalThis.__mamoRulePicker.registerRoots({source,course,roots})`，返回 `{roots:[{rootId,course,imageCount}],verification}`；不能返回 DOM 或正文。`installRulePicker({sessionId,expiresAt,labels},doc=document)` 为可序列化的自包含安装函数。

- [ ] 在新测试中用注册器桩捕获根节点，先固定 Moodle 错误姓名、错误课程、Gmail 多课程主题、邻接消息及 Ed 只读行为。使用与既有测试相同的 jsdom 初始化方式；例如：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {moodleAdapter} from '../extension/moodle.js';
test('builder rejects a different Moodle account before exposing a root',()=>{
 const dom=new JSDOM('<div class="usermenu"><img alt="Other Student"></div><h1>DEMO1000 2026</h1><main><img src="https://learning.monash.edu/a.png"></main>',{url:'https://learning.monash.edu/course/view.php?id=1'});
 try {assert.throws(()=>moodleAdapter('builderDescribe',{name:'Example Student',course:'DEMO1000',academicYear:2026},dom.window.document),/账号|identity/);}
 finally {dom.window.close();}
});
```

- [ ] Run `/Users/xy/.local/bin/node --test tests/rule-builder-context.test.js`; verify RED from missing command/registration, not broken fixtures.
- [ ] 将各适配器现有身份与根节点计算路径与新命令共用，而不是新建一个更宽松的整页选择器。Gmail 不传未经列表验证的 `threadCourse` fallback；主题多匹配直接拒绝。`builderDescribe` 在 Ed Load more、Gmail expand、其他会改变网页的操作前返回。
- [ ] Ed 当前只检查登录页及课程，不能宣称已经唯一验证账号。生成器需有可复核的显式账号证据才允许注册；缺证据返回 `builder-identity-unverified`。用脱敏 fixture 固定可接受的账号证据，不能猜接口、读隐藏 token 或用课程标题冒充账号；无法取得这种 fixture 时报告 Ed 点选尚受此限制，不放宽生产验证。
- [ ] 实现根注册返回不透明 rootId，DOM 句柄留在闭包。示意分支必须在验证后：

```js
if(command==='builderDescribe') {
 return globalThis.__mamoRulePicker.registerRoots({source:'moodle',course:args.course,roots});
}
```

- [ ] Run context + `tests/adapters.test.js tests/moodle.test.js tests/ed-source.test.js tests/source-rule-adapters.test.js`；生产提取结果不变，新路径无点击行为。审查并仅提交可独立归属此任务的改动。

### Task 2: 有界的相对选择器生成

**Files:** Create `extension/source-rules/builder/selector-generator.js`; Test `tests/rule-builder-selector.test.js`。

**Interfaces:** 自包含 `installBuilderSelectorEngine()` 安装 `globalThis.__mamoBuilderSelector.generateRule({id,name,source,courses,samples,locate}) -> {rule,validation,reasonCodes}`。samples 使用共同接口中的页面内 Sample；`locate` 是 `__mamoSourceRules.locate`。validation 为 `unmatched | needs-adjustment | sample-passed`；不得创建后台权限或持久化副作用。安装函数不能捕获模块 import，页面内仅按固定 v1 语法构造候选；后台收到后仍用现有 validateSelector/validateRule 做权威校验，拒绝不符合格式的任何结果。

- [ ] 建立正例、反例、随机类、私密属性、超深路径、只剩 img、Ed 附件和相同 URL 不同节点 fixtures。核心失败测试：

```js
const dom=new JSDOM('<main><div class="attendance"><img class="code"></div><img class="avatar"></main>');
const root=dom.window.document.querySelector('main');
const sample={sampleId:'s1',course:'DEMO1000',root,
 positives:[root.querySelector('.code')],negatives:[root.querySelector('.avatar')]};
installBuilderSelectorEngine();
const out=globalThis.__mamoBuilderSelector.generateRule({id:'local.generated.test',name:{en:'Demo images'},source:'moodle',courses:['DEMO1000'],samples:[sample],locate:globalThis.__mamoSourceRules.locate});
assert.doesNotThrow(()=>validateRule(out.rule));
assert.ok(out.rule.images.selectors.some(s=>root.querySelector('.code').matches(s)));
assert.ok(out.rule.images.selectors.every(s=>!s.includes('src=')&&!s.includes('nth-child')));
```

测试文件显式导入 `JSDOM`、`validateRule`、`installBuilderSelectorEngine` 和 `./helpers/install-source-runtime.js`；图片用测试属性设置 naturalWidth/naturalHeight、complete 和允许域 URL，以便走真实引擎。测试结束删除安装的全局生成器。

- [ ] Run `/Users/xy/.local/bin/node --test tests/rule-builder-selector.test.js`，确认 RED。
- [ ] 生成标签、允许的通用结构 class/属性、最多六层子路径。禁止 src/href、正文、title/alt、实例 ID、未知属性、动态哈希和账号样式 token；默认不生成导航关键词。按候选可表达性、正例覆盖、负例排除及长度排序，最多 64 个候选。
- [ ] 仅输出通过现有格式验证的选择器。以节点身份评估正反例，随后由 runtime 验证接受/过滤结果；URL 去重不消除负例。excludeSelectors 只按节点 matches 语义生成。宽泛 img 或未确认额外匹配必须 needs-adjustment。
- [ ] Run selector + `tests/source-rule-format.test.js tests/source-rule-runtime.test.js`。审查候选规则导出不含 fixture 私密 canary 字符串，按归属提交。

### Task 3: 页面点选器与指定文档桥接

**Files:** Complete `builder/picker.js`; Create `builder/page-bridge.js`; Modify `extension/background.js` 的注入接点; Test `tests/rule-builder-picker.test.js`, `tests/rule-builder-bridge.test.js`。

**Interfaces:** `createBuilderPageBridge({scripting,tabs,extensionId}) -> {describe,beginPick,mark,evaluate,dispose}`。每个方法接受 `{sessionId,tabId,documentId,course,source,settings}` 及该操作的字段。picker 提供 `registerRoots`, `begin`, `mark`, `evaluate`, `inspect`, `dispose`，都只接受当前 sessionId。evaluate 调用 Task 2 生成器和正式 runtime；只返回共同接口中的安全状态及页面侧临时图片映射。

- [ ] RED tests：点选不会触发网页链接；Escape 完全清理；键盘选择；不接管输入框；相同 URL 下根节点被替换失效；导航的旧 documentId 注入失败；绑定消息外图片不可选。

```js
installRulePicker({sessionId:'s1',expiresAt:Date.now()+600000,labels:{cancel:'Cancel'}},doc);
const picker=globalThis.__mamoRulePicker;
picker.registerRoots({source:'moodle',course:'DEMO1000',roots:[{root:doc.querySelector('main')}]});
picker.begin({sessionId:'s1'});
doc.dispatchEvent(new doc.defaultView.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
assert.equal(doc.querySelector('[data-mamo-picker]'),null);
assert.equal(picker.inspect({sessionId:'s1'}).phase,'cancelled');
```

测试中 doc 为 jsdom 文档，安装函数的 DOM/API 全由 doc/defaultView 获取；不要调用测试进程真实 Chrome。

- [ ] Run `/Users/xy/.local/bin/node --test tests/rule-builder-picker.test.js tests/rule-builder-bridge.test.js`。
- [ ] 实现 pointer-events 不覆盖整页的边框和专用工具条 shadow root；捕获阶段只阻止有效目标的点击，恢复焦点。Tab/方向键选择有界候选，Enter 标记，Escape 取消；不受页面 CSS 影响，不动画飞入。
- [ ] bridge 首次注入读取 Chrome InjectionResult.documentId；以后只向该 documentId 的主框架发命令，不向 allFrames 注入。安装函数及生成器以已打包代码注入隔离世界，无 eval、远程模块或网页 postMessage。每次检查 root.isConnected、文档 URL、来源验证及目标节点的引用/允许 URL 一致性。
- [ ] 用 executeScript 顺序安装自包含的 installSourceRuleRuntime、installBuilderSelectorEngine、installRulePicker；禁止序列化捕获 ESM import 的闭包，禁止为解决注入问题新增 web_accessible_resources 或 remote import。加入“函数源码独立执行”测试，确认没有依赖模块外的变量。
- [ ] 在页面内建立绝对期限计时器、pagehide/导航及 MutationObserver 失效检测；dispose 撤销监听/观察器、轮廓、节点引用。超过候选或节点预算报告截断，不把部分结果标记成功。
- [ ] Run picker/bridge/context tests，并检查既有 adapter 注入测试；按归属提交。

### Task 4: 后台授权会话及生产互斥

**Files:** Create `builder/session.js`; Modify `extension/background.js`, `extension/background-rules.js`; Test `tests/rule-builder-session.test.js`, `tests/background-schedule.test.js`。

**Interfaces:** `createBuilderSession({extensionId,ownerOrigin,storage,tabs,pageBridge,library,preview,isBusy,now}) -> {owns,handle(message,sender),busy,cancel}`。library 为 Task 6 的库对象，preview 为 Task 5 对象；测试先用限定接口 stub。owner 保存实际扩展 UI 的 documentId 和 tabId，不能信任消息中自报的 owner。闭包内保存设置摘要、库编辑 token、草稿 revision 和 previewRevision。

- [ ] RED tests：网页及别的扩展不能 start/save；有效 content event 只允许选图；不同 tab/frame/document、过期/worker 重启 token 均拒绝；会话开始与 scan 在第一个 await 前竞争，只允许一方占用。

```js
assert.equal(control.owns('scan'),false);
await assert.rejects(control.handle({type:'builderSave',sessionId:'s1'},
 {id:'other-extension',url:'https://mail.google.com/mail/u/0/'}),/builder-owner/);
nowValue+=600001;
assert.equal(control.busy,false);
assert.equal((await control.handle({type:'builderStatus',sessionId},owner)).phase,'expired');
```

测试通过 `createBuilderSession` 构造 control，now 为 `()=>nowValue`，owner 用 `chrome-extension://test/options.html`、固定 tab/document 字段；所有 pageBridge 方法为记录调用的异步 stub。

- [ ] Run `/Users/xy/.local/bin/node --test tests/rule-builder-session.test.js tests/background-schedule.test.js`，先验证 RED。
- [ ] 将 builder 消息分为扩展 UI 指令与唯一 `builderPickEvent`。在现有 `sender.url` 总门禁前只为这个事件增加窄分支，严格核验 sender.id、tabId、frameId=0、documentId、会话和允许来源；不能把现有全部后台消息暴露给页面。
- [ ] builderTabs 返回受支持已打开标签页的 tabId、来源和不含主题的显示名；用户明确选择后才聚焦原标签页。会话开始前验证配置来源、忙碌、目标域和真实发送者；先预留会话再 await。
- [ ] 纳入 ruleControl 的 busy 与 production guarded/alarm/start 检查；普通模式不放开 ruleTest*。编辑课程、身份、导入配置时取消会话或阻止该变更，保存前重新验证配置摘要。开发者模式关闭不关闭普通生成器，但停止详细诊断输出。
- [ ] 状态转换：selecting -> editing -> previewing -> ready -> saved，另有 cancelled/expired/invalidated/error。修改标记、名称、课程或目标文档后递增 revision，并清除 previewRevision、确认集合和启用资格。UI 断开、tab 删除及绝对 10 分钟期限触发 cancel；worker 重启不从存储重建会话。
- [ ] 多样本使用最多 5 个仍打开的来源文档，按 sampleId 保存各自的 tab/frame/document/root 绑定；追加样本不复用原 tab 导航。每个文档分别评估同一候选，后台聚合结果，不跨文档传 DOM。已有样本页关闭、跳转或根节点变更则清除该样本资格并要求重新验证；向导提示保留样本标签页。生成候选可在各样本页分别提出，再在每一页评估受限并集，不能把“当前页通过”冒充所有样本通过。
- [ ] Run session、background-schedule、background-rules tests；确认 settings.enabled、alarms 和签到记录没有被生成器写入，按归属提交。

### Task 5: 单草稿预览与无归档 OCR

**Files:** Create `builder/preview.js`; Reuse `source-rules/ocr-service.js`; Modify `builder/session.js` 的预览接点; Test `tests/rule-builder-preview.test.js`, `tests/preview-ocr-service.test.js`。

**Interfaces:** `createBuilderPreview({downloadImage,connectOcr,now}) -> {load({sessionId,revision,images,tabId,signal}),image({sessionId,imageId}),recognize({sessionId,imageId,signal}),clear()}`。images 仅来自当前 pageBridge 验证后的命中列表，后台保存 URL 映射；UI 不能提供下载地址。每次载入绑定 revision，迟到结果不写入新预览。

- [ ] RED tests：草稿未命中不能借 builtin 通过；URL 重复图片的节点标记保留；取消后的下载/OCR 结果被丢弃；不接受任意 URL；PNG/JPEG 与大小限制；native 无 previewOcr 时回退浏览器。

```js
const calls=[];
const service=await previewOcrService({isWindows:false,
 nativeService:async()=>({call:async request=>{calls.push(request);return request.op==='ping'?{binaryReady:true,previewOcr:true}:{observations:[]};},close:async()=>{}}),
 browserService:async()=>{throw new Error('unexpected fallback');}});
await service.call({imageBase64:'AA==',mimeType:'image/png',meta:{private:'must-not-forward'}});
assert.equal(calls.at(-1).op,'ocr-preview');
assert.equal(Object.hasOwn(calls.at(-1),'meta'),false);
```

- [ ] Run preview tests and verify missing module/failing invariants before implementation。
- [ ] 复用已有下载器及 previewOcrService，不调用 collectors.start、workflow 或正式 OCR op。最多缓存 20 张预览、单图 8 MiB、总计 32 MiB；支持取消和 20 秒下载期限。超过预览容量标记 incomplete，允许删减样本后重新验证，不允许启用被截断结果。
- [ ] 页面用纯草稿 rules、mode=community 调用 runtime。包括所有正例、所有负例及额外命中，UI 对每个未标记命中确认；后台的 previewRevision 必须对应当前草稿摘要和样本修订。检测到加载中、失效、下载错误或预算截断时 canEnable=false。
- [ ] OCR 返回最多 1000 条、每条最多 2000 字的瞬态 observations，不生成正式 records，不缓存到 storage，不导出正文或图片。关闭页面、清理预览及迟到结果回收所有 payload/ObjectURL。
- [ ] Run builder-preview、preview-ocr-service、rule-test-runner tests；验证 records/seenMessages/seenThreads/moodleProgress/diagnostics 无写入；按归属提交。

### Task 6: 原子保存与启用

**Files:** Modify `source-rules/library.js`, `builder/session.js`; Test `tests/rule-builder-save.test.js`, `tests/source-rule-origin.test.js`。

**Interfaces:** 库新增 `editToken() -> Promise<string>` 与 `saveGenerated({text,settings,enableCourses,expectedToken,replace=false}) -> {key,digest,enabledCourses}`。token 是规范化 library/bindings/revisions 状态的摘要，包括未绑定草稿，库方法在现有 serial 队列里读取后比较。固定 origin=local，不接受调用方覆盖 origin。后台只把持有的规则和有效预览证据传入，页面不直接调用库方法。

- [ ] RED test 单次 storage.set 同时写规则、绑定、修订；满额课程或 stale token 没有任何写入：

```js
const store=memoryStorage(),writes=[];
const set=store.set;store.set=async patch=>{writes.push(structuredClone(patch));await set(patch);};
const library=createRuleLibrary({storage:store,builtins:{}});
const settings={courses:['DEMO1000'],sourceModes:{DEMO1000:'moodle'}};
const expectedToken=await library.editToken();
const result=await library.saveGenerated({text:JSON.stringify(fixtureRule()),settings,enableCourses:['DEMO1000'],expectedToken});
assert.equal(writes.length,1);
assert.deepEqual(writes[0].sourceRuleBindings.DEMO1000.moodle,[result.key]);
assert.ok(writes[0].sourceRuleLibrary[result.key]);
```

测试导入现有 memoryStorage、fixtureRule、createRuleLibrary；补充真实失败 set 的前后快照及重试案例。

- [ ] Run `/Users/xy/.local/bin/node --test tests/rule-builder-save.test.js tests/source-rule-origin.test.js`，确认 RED。
- [ ] 在 serial 内先验证 token、rule、settings、所有启用课程、当前绑定及容量，再计算一个 patch。合并原绑定而非替换其他规则；每个受影响来源仅递增一次 revision。对本地同 ID 差异要求 replace，保留 previous；不能写 community key 或 builtin ID。
- [ ] 一次 await storage.set 完成持久化，不修改读取对象的共享引用；失败保持 UI 编辑态、不显示成功。重试先读取最新 token/规则，已保存相同内容视为幂等，不能重复追加绑定。
- [ ] 后台在锁内校验 previewRevision、逐图片确认、所有 enableCourses 的已验证样本和当前设置摘要；只保存草稿允许没有通过预览，启用则不允许。导出使用 validateRule 后的纯 JSON，不含 origin、sample、tabId、URL、OCR。
- [ ] Run builder-save、source-rule-origin、source-rule-configuration、configuration tests；确认多课程失败不会部分成功，按归属提交。

### Task 7: 正常用户创建向导与弹窗入口

**Files:** Create `builder/ui.js`, `builder/style.css`; Modify `modules-view.js`, `module-tabs.js`, `modules-page.js`, `modules-host.js`, `source-rules/manager-ui.js`, `source-rules/strings.js`, `popup.html`, `popup.js`, `popup.css`; Test `tests/rule-builder-ui.test.js`, `tests/modules-host.test.js`, `tests/popup-ui.test.js`。

**Interfaces:** `installRuleBuilder({root,request,translate,onExit,onSaved}) -> {open({tabId,course,source}={}),update(state),cancel(),dispose()}`。manager 增加 onCreate 回调，不直接控制后台。modules 路由新增 `#modules/create`，创建页作为辅助视图而非永久占据正常模块 tab；popup 只传递选中 tabId hint，不预先创建由 popup owner 持有的会话。

- [ ] RED UI tests：普通模式入口可见；切页保留主 header 和未保存 email/course 草稿；退出恢复原 library 分页/焦点；名称编辑使旧预览失效；多余命中需确认；busy/expired/unsupported 提示；双击保存只发一次。

```js
const ui=installRuleBuilder({root,request:async message=>{calls.push(message);return state;},translate:key=>ruleText(key,'en'),onExit:()=>{exits++;},onSaved:()=>{saves++;}});
await ui.open({tabId:7,source:'moodle',course:'DEMO1000'});
assert.equal(root.querySelector('[data-action=save-enable]').disabled,true);
assert.equal(calls.some(message=>message.type==='scan'),false);
await ui.cancel();assert.equal(exits,1);
```

测试 fixture 由 JSDOM `<section id="builder"></section>`、数组 calls、计数 exits/saves 和共同接口完整 state 构成；测试各种后端状态不能仅检查静态 HTML。

- [ ] Run builder-ui、modules-host、popup-ui tests，确认新入口及状态机测试 RED。
- [ ] 构建三阶段向导：来源/课程/标签页选择，图片预览正反标记，名称/启用课程/保存。按钮使用独立 type=button，表单 Enter 只作用当前步骤，不触发主页全部保存。必要错误提示正常模式也可见，JSON 和详细轨迹仅开发者模式可见。
- [ ] 点击开始点选后，用户在来源 tab 操作；使用关闭即失效的 owner UI port 保持会话归属，不依赖 popup 持续打开。选中后可由页面工具条“返回编辑器”聚焦仍存在的 owner tab；不重新创建丢草稿的新页面。owner 已关闭则清理并提示重启。
- [ ] 使用 DOM 创建与 textContent 渲染所有不可信名称；不把页面 HTML 放进 innerHTML。图片只展示已验证后台 payload 的短期 ObjectURL，失败用就地占位，不引入外部示意素材。图标沿用现有项目图标习惯，提供 tooltip/aria-label。
- [ ] 国际化键至少包括 create/start-pick/cancel/mark-include/mark-exclude/preview/save-draft/save-enable/export/identity-unverified/expired/source-changed/broad-selector/incomplete-preview/stale-library/enabled-later。设置普通模式不删除用户编辑草稿。导出文件名只含规则 ID 和版本。
- [ ] Run UI、i18n、module-tabs/modules-page、popup tests，补键盘与减少动画 CSS 检查；按归属提交。

### Task 8: 端到端合成验收、打包与交付

**Files:** Create `tests/rule-builder-flow.test.js`; Extend `tests/source-rules-packaging.test.js`; Update project README 的功能与隐私说明；本地 QA fixture/server 放 `.superpowers/`，不包含真实学校资料。

**Interfaces:** 使用真正 library、session、generator、runtime，Chrome API 和来源页面用测试适配层代替；网络与 OCR 注入 stub。浏览器验收使用实际页面 UI 和合成图片，不进行真实签到。

- [ ] 集成测试先固定完整闭环及所有清理路径，必须证明 export 可被 parseRule 接受：

```js
const exported=await control.handle({type:'builderExport',sessionId,revision},owner);
assert.doesNotThrow(()=>parseRule(exported.text));
for(const secret of ['PRIVATE_EMAIL_CANARY','PRIVATE_SUBJECT_CANARY','signed-token'])
 assert.equal(exported.text.includes(secret),false);
assert.equal(productionCalls.length,0);
assert.deepEqual(storage.values.records,initialRecords);
```

上述 control/sessionId/revision/owner 来自同测试的真实 builderStart、点选及 preview 路径；不能手动塞入 ready state 跳过验证。增加导航后迟到 OCR、owner 关闭、worker 重启、定时任务竞争、同 URL 双节点、两课程其中一门满额测试。

- [ ] Run flow tests，确认预期断点后补齐集成接线，不通过降低身份/课程/预览门槛使测试通过。
- [ ] 浏览器验收：规则库创建、popup 创建、鼠标/键盘点选、预览误选排除、保存草稿、保存启用、导出重导入、本地/社区同 ID 共存；在 390/768/1280 宽度及中英文下检查截图与文本溢出。繁体文案进行字典和渲染测试。不得用原生桌面工具绕过休眠保护。
- [ ] 如没有经授权的真实来源账号 DOM，只报告合成页面验证通过；不声称 Gmail/Moodle/Ed 真实页面全支持。尤其 Ed 身份证据缺失必须明确列为受限情形，不能用测试 fixture 代替实测声明。
- [ ] Run `/Users/xy/.local/bin/node --test tests/*.test.js`；新增包文件递归校验，确认两种 ZIP 包含 builder 文件且字节与源文件相同，无额外权限、开发测试数据或远程脚本。
- [ ] Run `/Users/xy/.local/bin/node scripts/build-extension.mjs` 和 `/Users/xy/.local/bin/node scripts/build-webstore.mjs`。与社区 toolkit 有共享 runtime 改动时先 `scripts/sync-rules-toolkit.mjs --check` 并遵守其独立发布授权，不默认推送。
- [ ] 独立复核身份/消息范围、后台消息门禁、原子写入与无提交保证；修复必需问题后重跑受影响及全量测试。关闭测试浏览器空间和服务器，列出完成项、限制、测试结果及本地包链接，不上传 Release。

## 自检与执行交接

覆盖关系：点选范围 Task 1/3，生成 Task 2，多样本 Task 3/4/5，预览与 OCR Task 5，普通/开发者权限 Task 4/7，保存与导出 Task 6/7，生命周期 Task 3/4/5/8，国际化/视觉 Task 7/8。

主要依赖顺序：1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8。Task 6 库层可与 Task 3 并行，但后台/UI 接点仍由一个实现者串行整合，避免多人改 background.js 和模块路由。

推荐本任务采用当前会话串行实现、最后独立复核：适配器、页面注入、后台 session 和模块 UI 的接口紧密依赖，统一实现可减少接口漂移。用户审阅本计划并选择执行方式后开始产品代码修改。
