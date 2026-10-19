# 上传 GitHub

## 已整理的提交范围

提交页面入口、完整 `assets/`、开发脚本、测试及正式文档。

以下内容保留在本地，通过 `.gitignore` 排除：

- `output/`：作品集 PDF / PPTX、预览页面和导出图片。
- `docs/research/`：开发研究、调试截图和临时验证记录。
- 本地依赖目录、测试报告、编辑器文件、环境变量文件及常见密钥文件。

README 使用的展示截图单独放在 `docs/images/`，会随项目提交。运行素材中保留历史版本与原稿，便于素材处理和回归验证。`assets/scene-cache/` 供页面运行使用，也必须提交。

## 1. 检查本地仓库

本项目已初始化 Git，默认分支为 `main`。在根目录执行下列命令，预期分支显示 `main`，状态中只出现准备提交的文件：

```powershell
Get-Command git
git branch --show-current
git status --short
```

## 2. 首次提交

先暂存并检查文件清单。预期 `output/`、`docs/research/` 和本地依赖不会出现在暂存列表中：

```powershell
git add .
git diff --cached --stat
git diff --cached --name-only
```

检查后创建首次提交，预期生成一条提交记录：

```powershell
git commit -m "Initial commit: companion focus prototype"
```

如果 Git 提示缺少作者信息，仅为本仓库设置真实姓名和邮箱，再重试提交。以下值需自行替换，预期配置命令正常退出：

```powershell
git config user.name "Your Name"
git config user.email "your-github-email@example.com"
```

## 3. 连接远程仓库

项目远程仓库为 [tutouguai1933/claw-time](https://github.com/tutouguai1933/claw-time)。首次关联时执行下列命令；预期 `git remote -v` 输出该地址，推送后本地 `main` 跟踪 `origin/main`：

```powershell
git remote add origin https://github.com/tutouguai1933/claw-time.git
git remote -v
git push -u origin main
```

推送需要本机已配置的 GitHub 登录凭据。如已存在 `origin`，先检查其地址，不要重复添加或覆盖不明远程。

## 静态站点发布

项目提供根目录 `index.html`，可以作为静态托管入口；主页面继续使用 `current_project.html`，避免改动现有测试和素材相对路径。部署时需包含完整 `assets/`。

若使用 GitHub Pages，可将仓库根目录作为站点发布源。部署后应验证默认入口、五个页面、角色与场景加载、账号保存和图片导出；当前仓库没有配置自动部署工作流。

## 项目介绍建议

项目名：**爪点时间**。GitHub 仓库名：`claw-time`。

仓库简介可使用：

> 爪点时间｜找点时间，和小动物一起专注。包含专注计时、伙伴养成、角色创作与小屋装饰的 Web 交互原型。

建议 Topics：`focus-timer`、`virtual-pet`、`html-css-javascript`、`interactive-prototype`、`ui-design`。

尚未选择统一开源许可证。仓库公开前可按自己的授权意图补充，并分别核对代码、插画和音频的授权范围。
