# Sora

Sora 是一个可自行部署的全栈博客系统，视觉与信息结构参考 [halo-theme-sora](https://github.com/Liksium/halo-theme-sora)，但运行时不依赖 Halo。公开站点、管理后台与 API 均由 Next.js 提供，文章、评论和站点配置保存到 SQLite，图片保存在本地持久化目录中。

## 功能

- Markdown 文章与独立页面编辑、草稿、发布、归档、置顶和修订记录
- 分类、标签、导航、站点设置与图片媒体库
- 评论审核与回复、点赞、浏览统计、全文搜索、RSS、Sitemap 和 SEO
- 单管理员初始化、登录与后台权限保护
- 通用内容包导入，以及完整备份导出、校验和恢复
- Docker Compose 部署与 GHCR 多架构镜像发布

技术栈为 Next.js 16、React 19、TypeScript、Tailwind CSS、SQLite、Drizzle ORM 和 Better Auth。生产镜像支持 `linux/amd64` 与 `linux/arm64`。

## Docker Compose 部署

服务器需要安装 Docker Engine 与 Docker Compose 插件。下载仓库中的 `compose.yaml`，在同一目录创建 `.env`：

```dotenv
APP_URL=https://blog.example.com
AUTH_SECRET=请替换为至少32字符的独立随机值
VISITOR_HASH_SECRET=请替换为另一个至少32字符的独立随机值
SETUP_TOKEN=请替换为至少32字符的一次性初始化令牌
TRUSTED_ORIGINS=https://blog.example.com

# 可选配置
SORA_VERSION=latest
BIND_ADDRESS=127.0.0.1
PORT=3000
LOG_LEVEL=info
```

为 `./data` 和 `./backups` 创建持久化目录。Linux bind mount 需要允许容器用户 `1001:1001` 写入这些目录。首次部署先迁移数据库，再启动应用：

```shell
docker compose --profile tools run --rm migrate
docker compose up -d app
```

默认只监听 `127.0.0.1:3000`，建议使用 Caddy、Nginx 等反向代理提供 HTTPS。启动后访问 `/admin/setup`，输入 `.env` 中的 `SETUP_TOKEN` 创建管理员；令牌仅用于首次初始化，不是管理员登录密码。

升级时修改 `SORA_VERSION`，或保持 `latest`，然后拉取镜像并重建容器：

```shell
docker compose pull
docker compose --profile tools run --rm migrate
docker compose up -d app
```

若 GHCR 镜像尚未设为公开，需要先使用具有 `read:packages` 权限的 GitHub Token 执行 `docker login ghcr.io`。

本地构建镜像：先执行 `docker build -t sora-blog:local .`，再在 `.env` 中设置 `SORA_IMAGE=sora-blog:local`，即可让 Compose 使用本地镜像。

## 备份与恢复

管理员可在 `/admin/data` 下载完整备份 ZIP、导入内容包或提交完整备份恢复。恢复会在应用重启时执行，并保留恢复前的数据副本。

也可以从服务器执行离线备份：

```shell
docker compose --profile tools run --rm backup
```

离线恢复前先停止应用。`RESTORE_BACKUP` 是 `./backups` 下由备份命令生成的目录名：

```shell
docker compose stop app
RESTORE_BACKUP=2026-08-07T00-00-00-000Z docker compose --profile tools run --rm restore
docker compose up -d app
```

PowerShell 请先设置 `$env:RESTORE_BACKUP`，再执行相同的 Compose 恢复命令。

## 本地开发

需要 Node.js 22 和 pnpm 10：

```shell
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm db:migrate:runtime
pnpm dev
```

Windows PowerShell 使用 `Copy-Item .env.example .env.local`。开发服务默认位于 `http://127.0.0.1:3000`，后台入口是 `/admin`。`.env.example` 中的默认值只适合本地开发，生产环境必须使用不同的随机密钥。

提交前可执行完整检查：

```shell
pnpm check
pnpm build
pnpm test:e2e
```

## 镜像发布

推送任意 Git Tag 会触发 GitHub Actions，将当前版本构建为多架构镜像并发布至 `ghcr.io/lateautumn2/sora`。`v` 开头的版本 Tag 还会更新 `latest`，也可以在 GitHub Actions 的 **Publish image** 页面手动运行并指定镜像标签。

## 目录结构

```text
app/          公开站点、管理后台和 API
components/   页面与交互组件
lib/          认证、内容、评论、媒体和数据服务
db/           SQLite Schema 与迁移
scripts/      迁移、备份、恢复和内容导入脚本
tests/        单元、集成与端到端测试
```
