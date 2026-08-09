# Sora

Sora 是一个可自行部署的全栈博客系统，视觉与信息结构参考 [halo-theme-sora](https://github.com/Liksium/halo-theme-sora)，但运行时不依赖 Halo。公开站点、管理后台与 API 均由 Next.js 提供，文章、评论和站点配置保存到 SQLite，上传图片保存在本地持久化目录中。

## 功能概览

### 公开站点

- Markdown 文章与独立页面，支持草稿、发布、归档、置顶、定时可见、修订记录和自定义 SEO
- 首页、归档、分类、标签、独立页面、友链与响应式导航
- 文章即时搜索弹窗与 `/search` 完整搜索页，支持标题、摘要和正文检索
- 文章点赞、访客浏览统计、上一篇/下一篇、RSS、Sitemap 与规范链接
- 评论审核、楼中楼回复、管理员回复、分批加载，以及评论者浏览器和城市标签
- 自动生成评论头像；评论邮箱不会在公开页面直接展示
- 可配置页脚文字，或启用 Hitokoto 一言作为动态页脚
- HarmonyOS Sans SC 本地字体与远程字体样式降级加载

### 管理后台

- 单管理员首次初始化、登录、退出与后台权限保护
- 仪表盘统计、文章访问排行，以及文章和独立页面的完整内容管理
- Markdown 编辑器、封面图、摘要、分类、标签、评论开关、置顶和 SEO 设置
- 分类、标签、菜单、友链与图片媒体库管理
- 按文章和状态管理评论，支持审核、垃圾评论、回收站与折叠式管理员回复
- 站点身份、评论策略、页脚一言、站点地址、可信来源和管理员密码设置
- 通用内容包分析、试运行、导入与校验
- 完整备份导出、校验和恢复，恢复前自动保留数据副本

### 部署与安全

- SQLite + Drizzle ORM，启动时自动建表并执行数据库迁移
- Docker Compose 部署与 GHCR `linux/amd64`、`linux/arm64` 多架构镜像
- 运行期自动生成并持久化认证密钥和访客哈希密钥
- 写请求可信来源校验、后台会话保护、访客标识哈希与基础安全响应头
- 评论环境信息由服务端从请求头解析，公网 IP 城市查询失败时自动降级，不阻断评论提交

## 技术栈

- Next.js 16、React 19、TypeScript 6、Tailwind CSS 4
- SQLite、Drizzle ORM、Better Auth
- ByteMD、Marked、sanitize-html
- Vitest、Testing Library、Playwright、ESLint、Prettier

运行环境需要 Node.js 22 或更高版本。生产镜像支持 `linux/amd64` 与 `linux/arm64`。

## Docker Compose 部署

服务器需要安装 Docker Engine 与 Docker Compose 插件。下载仓库中的 `compose.yaml`，在同级目录执行：

```shell
docker compose up -d app
```

Compose 会把 `./data` 挂载为持久化目录。Linux bind mount 需要允许容器用户 `1001:1001` 写入该目录。默认端口为 `3000:3000`，建议使用 Caddy、Nginx 等反向代理提供 HTTPS。

首次启动会自动完成以下工作：

1. 创建 SQLite 数据库并应用全部迁移。
2. 自动生成 `AUTH_SECRET` 与 `VISITOR_HASH_SECRET`，保存到 `data/secrets/`。
3. 提供 `/admin/setup` 初始化入口，用于创建唯一的管理员账号。

初始化完成后访问 `/admin` 登录后台。站点地址与可信来源默认取 `http://localhost:3000`，可在 `/admin/settings` 修改，保存后立即生效，无需重启容器。

### 升级

```shell
docker compose pull
docker compose up -d app
```

容器启动时会自动应用新增数据库迁移。升级前仍建议在 `/admin/data` 下载完整备份。

若 GHCR 镜像尚未设为公开，需要先使用具有 `read:packages` 权限的 GitHub Token 执行 `docker login ghcr.io`。

本地构建镜像：

```shell
docker build -t sora-blog:local .
```

然后将 `compose.yaml` 中的 `image` 改为 `sora-blog:local` 后启动。

## 配置

生产环境通常只需使用后台设置。环境变量适合固定部署策略，并且优先于后台运行配置。

| 变量                  | 用途                                     | 默认行为                 |
| --------------------- | ---------------------------------------- | ------------------------ |
| `APP_URL`             | 公开站点地址、Cookie 与规范链接基础地址  | 回退到后台运行配置       |
| `TRUSTED_ORIGINS`     | 允许提交认证及公开写请求的来源，逗号分隔 | 回退到后台运行配置       |
| `DATABASE_PATH`       | SQLite 数据库路径                        | `./data/blog.db`         |
| `UPLOAD_DIR`          | 上传图片目录                             | `./data/uploads`         |
| `AUTH_SECRET`         | 认证会话签名密钥                         | 生产环境首次启动自动生成 |
| `VISITOR_HASH_SECRET` | 访客标识 HMAC 密钥                       | 生产环境首次启动自动生成 |
| `LOG_LEVEL`           | 日志级别                                 | `info`                   |
| `DATA_ARCHIVE_MAX_*`  | 导入、备份与恢复 ZIP 的安全限制          | 见 `.env.example`        |

`compose.yaml` 刻意不固定 `APP_URL`、`TRUSTED_ORIGINS` 和两个密钥，使站点地址、可信来源与密钥持久化逻辑保持可配置。

## 外部请求与隐私

- 启用页脚一言后，访客浏览器会请求 `v1.hitokoto.cn`；关闭后只显示后台填写的静态页脚文字。
- 提交评论时，服务端可能请求 `ipwho.is` 查询公网 IP 对应城市；私有、环回和链路本地地址不会发送，查询失败不会影响评论。
- 页面会加载 ZeoSeven 字体样式；首选地址失败时会切换备用地址，本地 HarmonyOS Sans SC 字体可独立使用。
- 完整备份包含管理员凭据和评论者信息，请妥善保管备份文件。

## 备份、恢复与内容导入

管理员可在 `/admin/data` 完成以下操作，无需进入服务器执行命令：

- 下载完整备份 ZIP
- 校验备份内容
- 提交完整备份恢复
- 分析、试运行、导入和校验通用内容包

完整恢复会在应用重启时执行，并保留恢复前的数据副本。提交恢复请求后重启容器即可完成。

## 本地开发

准备 Node.js 22 和可用的 pnpm：

```shell
cp .env.example .env.local
corepack enable
pnpm install
pnpm db:migrate:runtime
pnpm dev
```

Windows PowerShell 使用：

```powershell
Copy-Item .env.example .env.local
```

开发服务默认位于 `http://127.0.0.1:3000`，后台入口为 `/admin`。`.env.example` 中的密钥只适合本地开发；生产环境可不显式配置，首次启动时会自动生成并持久化。

项目不通过清单限制本机 pnpm 主版本；CI 与 Docker 当前使用 pnpm 10 作为官方构建基线。

### 常用命令

```shell
pnpm dev                 # 执行迁移并启动开发服务器
pnpm check               # 格式、Lint、类型检查和单元/集成测试
pnpm build               # 生产构建
pnpm test:e2e            # Playwright 端到端测试
pnpm db:migrate:runtime  # 手动执行运行期数据库迁移
```

提交前建议执行：

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
components/   页面、业务组件与通用 UI 组件
lib/          认证、内容、评论、媒体、配置和数据服务
db/           SQLite Schema 与迁移
public/       静态资源与本地字体
scripts/      启动迁移、备份、恢复和内容导入脚本
tests/        单元、集成与端到端测试
```
