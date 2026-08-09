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

服务器需要安装 Docker Engine 与 Docker Compose 插件。下载仓库中的 `compose.yaml` 后直接启动：

```shell
docker compose up -d app
```

为 `./data` 创建持久化目录，Linux bind mount 需要允许容器用户 `1001:1001` 写入该目录。首次启动会自动建表并应用数据库迁移，无需手动执行迁移命令；`AUTH_SECRET` 与 `VISITOR_HASH_SECRET` 会首次启动时自动生成并持久化到 `data/secrets/`，之后复用。

`compose.yaml` 默认监听 `3000:3000`，建议使用 Caddy、Nginx 等反向代理提供 HTTPS。启动后访问 `/admin/setup` 创建唯一的管理员账号（无需任何令牌）。站点地址与可信来源默认取 `http://localhost:3000`，可在后台 `/admin/settings` 修改，保存后立即生效，无需重启容器。

升级时直接拉取镜像并重建容器：

```shell
docker compose pull
docker compose up -d app
```

若 GHCR 镜像尚未设为公开，需要先使用具有 `read:packages` 权限的 GitHub Token 执行 `docker login ghcr.io`。

本地构建镜像：先执行 `docker build -t sora-blog:local .`，再将 `compose.yaml` 中 `image` 改为 `sora-blog:local` 后启动。

环境变量优先级：`compose.yaml` 或环境中显式设置的 `APP_URL`、`TRUSTED_ORIGINS`、`AUTH_SECRET`、`VISITOR_HASH_SECRET` 优先于运行期配置；未设置时分别回退到后台配置与自动生成的密钥。因此 `compose.yaml` 刻意不写这些变量，把站点地址与来源的修改权留给后台。

## 备份与恢复

管理员可在 `/admin/data` 下载完整备份 ZIP、导入内容包或提交完整备份恢复，无需进入服务器执行命令。恢复会在应用重启时执行，并保留恢复前的数据副本；提交恢复请求后重启容器即可完成。

## 本地开发

需要 Node.js 22 和 pnpm 10：

```shell
cp .env.example .env.local
corepack enable
corepack install --global pnpm@10
pnpm install
pnpm db:migrate:runtime
pnpm dev
```

Corepack 的启用和 pnpm 10 安装只需为当前 Node.js 安装执行一次，项目支持 pnpm 10.26 及以上的 10.x 版本。Windows PowerShell 使用 `Copy-Item .env.example .env.local`。开发服务默认位于 `http://127.0.0.1:3000`，后台入口是 `/admin`。`.env.example` 中的默认值只适合本地开发；生产环境无需配置密钥，首次启动会自动生成并持久化。

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
scripts/      启动迁移，以及备份、恢复和内容导入脚本
tests/        单元、集成与端到端测试
```
