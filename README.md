<center>

# Sora

Sora 意为「穹」，象征着无限的可能性、广阔的空间和创造力

若君喜欢这个主题，欢迎 🌟Star！

</center>

## 技术栈

Sora 是一个可自行部署的全栈博客系统，视觉与信息结构参考 [halo-theme-sora](https://github.com/Liksium/halo-theme-sora)，完全由Next.js进行构建。

- Next.js 16、React 19、TypeScript 6、Tailwind CSS 4
- SQLite、Drizzle ORM、Better Auth
- ByteMD、Marked、sanitize-html

运行环境需要 Node.js 22 或更高版本。生产 Docker 镜像支持 `linux/amd64` 与 `linux/arm64`。

## Docker Compose 部署

下载仓库中的 `compose.yaml`，在同级目录执行：

```shell
docker compose up -d
```

首次启动会自动创建 SQLite 数据库、应用全部迁移，并生成认证所需的密钥。随后访问 `/admin/setup` 创建管理员账号，初始化完成后通过 `/admin` 登录后台。

### 升级

```shell
docker compose pull
docker compose up -d
```

容器启动时会自动应用新增数据库迁移。升级前建议在管理后台下载完整备份。

## 配置

生产环境通常只需使用后台设置。环境变量适合固定部署策略，并且优先于后台运行配置。

| 变量                  | 用途                                     | 默认行为                 |
| --------------------- | ---------------------------------------- | ------------------------ |
| `APP_URL`             | 公开站点地址、Cookie 与规范链接基础地址  | 回退到后台运行配置       |
| `TRUSTED_ORIGINS`     | 允许提交认证及公开写请求的来源，逗号分隔 | 回退到后台运行配置       |
| `DATABASE_PATH`       | SQLite 数据库路径                        | `./data/blog.db`         |
| `UPLOAD_DIR`          | 上传文件目录                             | `./data/uploads`         |
| `AUTH_SECRET`         | 认证会话签名密钥                         | 生产环境首次启动自动生成 |
| `VISITOR_HASH_SECRET` | 访客标识 HMAC 密钥                       | 生产环境首次启动自动生成 |
| `LOG_LEVEL`           | 日志级别                                 | `info`                   |
| `DATA_ARCHIVE_MAX_*`  | 数据归档文件的安全限制                   | 见 `.env.example`        |

## 本地开发

准备 Node.js 22 和可用的 pnpm：

```shell
cp .env.example .env.local
pnpm install
pnpm dev
```

开发服务默认位于 `http://127.0.0.1:3000`，后台入口为 `/admin`。

### 常用命令

```shell
pnpm dev          # 执行迁移并启动开发服务器
pnpm check        # 格式、Lint 和类型检查
pnpm build        # 生产构建
```
