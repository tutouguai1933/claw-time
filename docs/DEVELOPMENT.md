# 开发与验证说明

## 日常修改

页面无需安装依赖、打包或编译。修改 HTML、CSS 或 JavaScript 后，在浏览器刷新验证即可。核心页面仍为根目录 `current_project.html`，`index.html` 仅提供静态站点默认入口。

新增功能优先参考现有 `assets/` 模块和 [项目交接文档](PROJECT_HANDOVER.md)。交接文档包含历史迭代记录，具体行为以当前代码和实际验证结果为准。

## 工具与已有依赖

运行测试前，先确认 Node.js 可用。预期输出可执行文件位置与版本：

```powershell
Get-Command node
node --version
```

纯逻辑检查仅使用 Node.js 内置模块；浏览器检查需要已有的 Playwright 和 Chrome，部分图像检查还需要 `pngjs` 或 `sharp`。Playwright 对 Node.js 的版本要求应以本机已有版本为准；本项目整理时使用 Node.js 24 运行验证。

仓库没有 `package.json` 或锁文件，也没有统一封装开发依赖。**目前不少历史脚本仍引用开发机的 Codex 缓存目录，部分脚本还写死了用户名或 Chrome 路径。** 克隆项目后不能假定全量测试可以直接运行；这些路径不影响浏览器打开页面。

本文列出的命令不会安装依赖。缺少工具或模块时，应先确定本机环境并单独配置，不要把开发机运行时复制进仓库。

## 纯逻辑检查

在项目根目录执行，预期各脚本打印 `PASS` 并以状态码 0 退出：

```powershell
node .\tests\companion-progress.cjs
node .\tests\house-support.cjs
```

## 浏览器回归

以下三个入口支持通过环境变量指定已有的 Playwright 模块和 Chrome 可执行文件路径：

- `tests/review-regression.cjs`
- `tests/task-meal-followup.cjs`
- `tests/scene-portrait-nav.cjs`

将下列示例路径替换为本机实际存在的位置。预期路径检查均为 `True`，随后脚本打印检查结果并正常退出：

```powershell
$env:PLAYWRIGHT_PATH = 'D:\existing-tools\node_modules\playwright'
$env:CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
Test-Path -LiteralPath $env:PLAYWRIGHT_PATH
Test-Path -LiteralPath $env:CHROME_PATH
node .\tests\review-regression.cjs
node .\tests\task-meal-followup.cjs
node .\tests\scene-portrait-nav.cjs
```

这些变量**尚未被所有历史脚本采用**。仅设置它们不能解决全量测试中的全部路径限制。

## 全量回归

`tests/run-all.cjs` 顺序执行 62 套检查。仅在其引用的开发依赖、运行时路径和 Chrome 都已就绪时执行。预期末行是 `RESULT all 62 suites passed`；任一套失败会中止执行并返回非零状态码：

```powershell
node .\tests\run-all.cjs
```

测试会启动临时浏览器，部分测试还会在 `docs/research/` 下生成截图或记录；该目录默认不提交。全量运行可能需要数分钟。

## 场景缓存

替换 `assets/scenes/`、`scene-clean/`、`house-art/`、`decor-art/` 或 `window-repair/` 下的场景 PNG 后，可重新生成本地场景数据。该命令只使用 Node.js 内置模块，**会改写 `assets/scene-cache/`**，仅在确实修改场景后执行。预期输出打包数量，之后需检查生成差异并验证场景显示与导出：

```powershell
node .\scripts\build-scene-cache.cjs
```

其他 `prepare-*.cjs` 是历史素材处理工具，部分会覆盖素材与清单。普通页面开发无需运行这些脚本。

## 手工检查

1. 从 `index.html` 和 `current_project.html` 分别打开，确认首页可用。
2. 切换五个页面，检查主要角色、场景和导航。
3. 修改一个专注任务或装扮，刷新后确认数据恢复。
4. 检查专注开始、暂停和结束，以及小屋编辑与图片导出。
5. 在桌面与窄屏下检查弹窗、底栏和操作按钮。

从本地文件切换到 HTTP 或在线部署时，浏览器使用另一份存储，不能用旧入口的数据判断新入口是否丢失记录。
