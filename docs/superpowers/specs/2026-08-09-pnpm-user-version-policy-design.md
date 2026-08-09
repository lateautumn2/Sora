# pnpm 用户版本策略调整设计

## 目标

项目不再通过 `package.json#engines.pnpm` 阻止开发者使用较新的 pnpm。开发者应自行处理其 pnpm 版本与依赖安装失败之间的兼容问题，而不是由项目清单预先拒绝安装。

## 现状

- `package.json` 将 pnpm 限制为 `>=10.26.0 <11.0.0`，pnpm 11 会在安装前直接报错。
- README 要求本地开发者安装 pnpm 10，并声明项目仅支持 pnpm 10.26 以上的 10.x 版本。
- CI 与 Docker 显式选择 pnpm 10，用于保持官方验证和镜像构建环境稳定。
- 现有依赖版本策略文档将 pnpm 11 排除在支持范围之外，与新的用户版本策略冲突。

## 方案

1. 从 `package.json#engines` 中删除 `pnpm`，保留 Node.js 版本要求。
2. README 不再要求开发者安装 pnpm 10，也不再声明本地 pnpm 主版本限制；保留启用 Corepack 和执行普通 `pnpm install` 的说明。
3. CI 继续通过 `pnpm/action-setup` 使用 pnpm 10，Docker 继续安装 `pnpm@10`。这些属于项目官方构建环境选择，不限制用户本机版本。
4. 更新现有依赖版本策略设计与实施计划，明确本地开发者不受 pnpm 主版本限制，官方构建链路仍使用 pnpm 10。
5. 不修改锁文件和依赖版本；此次调整只改变版本准入策略与说明。

## 验证

- 检查 `package.json` 不再包含 `engines.pnpm`。
- 检查 README 不再要求本地安装 pnpm 10 或声明仅支持 pnpm 10。
- 检查 CI 和 Docker 仍明确使用 pnpm 10。
- 使用当前 pnpm 11 执行清单读取与安装前验证，确认不再出现 `engines.pnpm` 版本拒绝错误。
- 运行格式检查，确保修改后的 JSON 与 Markdown 格式正确。

## 风险与边界

- 项目不会承诺所有未来 pnpm 主版本都完全兼容；若实际安装失败，开发者需根据错误检查版本或切换工具版本。
- 官方 CI 与 Docker 的 pnpm 10 结果仍是项目当前的基准验证结果。
- `pnpm-workspace.yaml` 中的构建许可配置保持不变；若未来 pnpm 改变配置语义，应另行评估。
