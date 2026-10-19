# Node.js＋SQLite 部署

## 当前部署

2026-10-20 已部署至 [爪点时间](http://39.106.11.65/)，使用独立 `claw-time` 容器，对外端口 80。运行版本为 `2f749de`，复用服务器已有镜像中的 Node.js 22.23.2，没有安装 npm 依赖或拉取新镜像。SQLite 数据独立挂载，容器启用 `unless-stopped` 重启策略。

已从公网通过实际界面验证注册、错误密码拒绝、跨浏览器登录与存档恢复、刷新保留会话、登出和私有目录拒绝访问。验证账号已删除，并建立初始一致性数据库备份。当前为 HTTP，配置域名后应切换 HTTPS。

本次清理了 11 个无容器引用的历史镜像标签与一周前的构建缓存，保留运行镜像和最近回滚镜像；磁盘可用空间由约 250 MB 恢复至约 1.5 GB。

## 运行方式

后端仅使用 Node.js 内置模块，没有 npm 安装步骤。要求 Node.js 22.13+ 支持 `node:sqlite`，推荐 Node.js 24。页面直接打开仍为本地模式；通过本服务访问自动启用服务器账号。

在项目根目录执行以下 PowerShell 命令，预期监听本机 3080 端口：

```powershell
Get-Command node
node --version
$env:HOST = '127.0.0.1'
$env:PORT = '3080'
node .\server\index.cjs
```

## 配置

| 环境变量 | 默认值／用途 |
| --- | --- |
| `HOST` | `127.0.0.1`，直接对外提供服务时按需设为 `0.0.0.0` |
| `PORT` | `3080` |
| `DATA_DIR` | 项目根目录的 `data/`，存放 SQLite、WAL 与 SHM 文件 |
| `PUBLIC_ORIGIN` | 对外访问地址，例如 `http://服务器IP:3080`；包含协议和端口，用于写入来源校验 |
| `SECURE_COOKIES` | `true` 时 Cookie 仅通过 HTTPS 发送；HTTPS 的 `PUBLIC_ORIGIN` 会自动启用 |
| `APP_VERSION` | 可设为 Git 提交号，健康接口会返回此版本 |

`PUBLIC_ORIGIN` 应与浏览器使用的地址完全一致。首次通过 IP 验证可使用 HTTP；公开接收正式用户密码前应配置域名、HTTPS，并切换至 HTTPS 地址。会话有效期 30 天；没有找回密码、邮件验证和第三方登录。

## 服务器目录

推荐将代码版本与持久数据分开：

```text
claw-time/
├── releases/<提交号>/       # 只包含 index.html、current_project.html、assets/、server/、deploy/
└── data/                  # 独立持久目录，权限 700
    ├── claw-time.sqlite
    ├── claw-time.sqlite-wal
    └── claw-time.sqlite-shm
```

更新代码时复用同一个 `data/`，不要用代码同步工具覆盖它。Node 服务仅公开页面和允许的 `assets/` 资源，不能下载后端源码、数据库、`.git` 或文档。

## Docker 部署

`deploy/run-container.sh` 使用本机已有、包含 `/usr/local/bin/node` 的镜像，设置 `--pull=never`，不会拉取依赖。下列命令在 Linux 服务器执行；将示例镜像、路径和 IP 替换为本机实际值。预期容器启动，健康接口返回 `ok: true`：

```sh
export NODE_IMAGE='existing-node-runtime:local'
export APP_DIR='/home/your-user/claw-time/releases/COMMIT'
export DATA_DIR='/home/your-user/claw-time/data'
export PUBLIC_ORIGIN='http://SERVER_IP:3080'
export APP_VERSION='COMMIT'
sh "$APP_DIR/deploy/run-container.sh"
curl --fail http://127.0.0.1:3080/api/health
```

容器以部署用户的 UID/GID 运行，代码只读、数据库单独挂载；日志有大小限制。已有同名容器时脚本会退出，由部署者先明确保留或替换旧版本。公网访问还需要云安全组和系统防火墙允许所选端口。

## API 与数据边界

`GET /api/session` 读取会话；`POST /api/register`、`POST /api/login`、`POST /api/logout` 管理账号；`PUT /api/snapshot` 保存当前用户 JSON 存档。

写请求要求 JSON 和 `X-Claw-Request: 1`。存档写入及登出还校验 `X-Claw-User` 与会话用户一致，避免同一浏览器的其他标签页切换账号后把旧数据写入新账号。存档使用 `revision` 乐观锁，冲突返回 409。客户端收到冲突会停止覆盖，可导出本机副本并重新载入云端；网络失败保留本机待同步数据，恢复连接后重试。

每次请求最大 12 MiB。账号名规范化并忽略大小写，密码 8–128 字符，服务端使用 scrypt 和独立随机盐。登录与注册按来源 IP 限制尝试次数；一次只进行一个密码派生，避免小服务器内存耗尽。前置反向代理时，此限制按连接源 IP 生效，需要按实际架构配置代理侧的限流。

数据库保存的是原型状态快照。鱼币、奖励、成就和 PK 由客户端计算；当前实现不提供真实支付校验、防作弊或在线用户匹配。

## 备份与恢复

SQLite 使用 WAL。在线运行时不要只复制主 `.sqlite` 文件；可使用 SQLite 一致性备份接口。最简单的停机备份是先停止本项目容器，再备份整个 `data/`，随后启动。以下命令在 Linux 服务器执行，预期生成独立备份文件并恢复服务：

```sh
docker stop claw-time
tar -czf /path/to/backups/claw-time-data.tar.gz -C /home/your-user/claw-time data
docker start claw-time
```

备份应放在其他磁盘或离线位置，避免小磁盘耗尽。密码哈希、会话与个人作品都属于私有数据，不上传 Git。

回滚代码时使用上一个 release 目录重新启动容器，继续挂载原来的持久数据。首版数据库无破坏性迁移；将来有迁移时需先做一致性备份并检查向后兼容性。

## 验证

在项目根目录执行以下 PowerShell 命令；预期所有 API 与浏览器检查通过。浏览器检查使用本机已有 Playwright 和 Chrome，路径限制同 [开发说明](DEVELOPMENT.md)：

```powershell
node --test .\tests\server-api.test.cjs
node .\tests\cloud-account-browser.cjs
```

上线后另验证注册、退出、重新登录、另一个浏览器读取存档、`/api/health` 的版本号，以及 `/data/`、`/server/`、`/.git/` 返回 404。
