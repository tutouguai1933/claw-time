# 爪点时间：服务器账号与部署实施计划

> 按 subagent-driven-development 在本轮实施，先验证后端契约，再验证前端集成与部署。

**目标：** 保留静态页面及本地体验，通过 Node.js 内置 HTTP、Crypto、SQLite 实现服务器注册登录和用户独立存档，并部署至用户指定服务器。

**技术：** 支持 `node:sqlite` 的 Node.js 22.13+（本机验证使用 24，服务器复用已有镜像中的 22.23.2），无 npm 依赖；SQLite WAL；同源 HttpOnly Cookie 会话。

## 范围与契约

- `server/` 负责数据库、密码派生、会话、API 和受限静态资源服务；数据库默认位于 `data/`，不提供静态访问、不提交 Git。
- `GET /api/session` 返回 `{user,snapshot,revision}`，未登录返回空值。
- `POST /api/register` 接受 `{username,password,snapshot}`，创建用户及会话；snapshot 仅在用户勾选导入游客数据后提供。
- `POST /api/login` 接受用户名密码；`POST /api/logout` 撤销会话；登录响应同 session。
- `PUT /api/snapshot` 接受 `{snapshot,revision}`，通过会话识别用户，CAS 版本冲突返回 409。
- 写请求要求 `X-Claw-Request: 1` 与 JSON，校验 Origin，禁止跨站写入；密码使用服务端 scrypt，登录限制重试次数。
- `GET /api/health` 只返回运行状态；`GET /assets/runtime-config.js` 动态启用服务器账号；静态文件模式仍为本地账号。
- 客户端复用同步持久化边界：先保存当前用户隔离的待同步副本，后台顺序提交，合并待写数据；切换/退出前先刷新队列。
- 网络失败保留待同步副本并重试，明确标示“本机保存/待同步”；版本冲突停止覆盖并允许刷新远程，旧副本保留。
- 会话过期禁止把旧账号数据写到其他账号；账号切换清理异步工作；已有本地账号不自动转换为服务器凭据。
- 保留鱼币、PK等原型逻辑，不提供真实支付、在线对战和服务端防作弊。

## 实施步骤

- [x] 1. 后端先写集成测试，验证注册登录、错误密码、登出撤销、用户隔离、CAS 冲突、CSRF、静态资源白名单、重启恢复；观察失败后实现。
- [x] 2. 前端先写 HTTP 浏览器集成测试，验证同账号跨浏览器恢复、游客不上传、刷新/登出/会话过期、离线待同步与冲突不覆盖；实现远程存储模块和账号界面接入。
- [x] 3. 执行原有主要交互回归和新增检查，进行独立规格与代码审查，修复实际问题。17 项 API/outbox 检查通过，浏览器云端账号流程及原有账号/主要页面检查通过；完整旧回归在宠物行走检查处失败，已在原始 main 复现并记录于开发说明。
- [x] 4. 更新 README 与部署文档，添加复用现有镜像的 Docker 启动脚本，忽略数据库与本机缓存，检查未改变依赖声明。
- [x] 5. 读取远程环境，使用独立 3080 端口、用户 UID/GID 与持久数据目录；复用服务器已有 Docker 镜像中的 Node.js 22.23.2，不执行安装或镜像拉取。用户确认先使用 IP＋HTTP 部署验证。
- [ ] 6. 打包受版本控制的运行资源，上传版本目录；部署服务并以健康检查、浏览器账号存档验证验收；保留回滚入口。
- [ ] 7. 提交并推送源代码，合并回主工作区，核对线上版本与提交一致。

## 验证命令（PowerShell）

本机 `node` 默认为旧版，使用电脑已有 Node.js 24，以下命令均无安装/恢复操作。

```powershell
$authNode = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $authNode --test .\tests\server-api.test.cjs
& $authNode .\tests\cloud-account-browser.cjs
& $authNode .\tests\review-regression.cjs
& $authNode .\tests\task-meal-followup.cjs
& $authNode .\tests\scene-portrait-nav.cjs
git diff --check
```

预期：新增账号检查全部通过；原有主要交互回归无失败；改动无空白错误。线上另验证健康接口、注册登录、跨会话存档和非公开目录返回 404。

## 回滚

上线采用独立目录与服务。部署失败停止新服务并恢复上一版本链接；保留 SQLite 文件及一致性备份，不用覆盖数据库回滚代码。原有静态模式继续可用。
