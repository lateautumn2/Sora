# Sora 字体选择复刻设计

## 目标

在当前 Next.js Sora 项目中复刻 `Liksium/halo-theme-sora` 的字体选择、加载来源与回退策略，并让字体在访客端、登录页和后台管理全站生效。

## 字体映射

| 用途 | 首选字体 | 回退字体 |
| --- | --- | --- |
| 非衬线正文与界面 | HarmonyOS Sans SC | `ui-sans-serif`, `sans-serif` |
| 衬线标题 | Noto Serif CJK | `ui-serif`, `serif` |
| 等宽代码与数字 | Maple Mono NF CN | `ui-monospace`, `monospace` |
| 可选半衬线样式 | LXGW WenKai | `ui-serif`, `serif` |

LXGW WenKai 只注册为可选的 `semi-serif` 字体，不替换现有正文或标题。这样既保留参考项目的字体选择，也避免未经需求确认改变内容层级。

## 字体来源与加载

- HarmonyOS Sans SC 使用参考仓库中的分片 WOFF2 字体及对应 `main.css`，存放在项目 `public/fonts/HarmonyOS_Sans_SC` 下，由本站静态资源服务提供。
- Noto Serif CJK 使用 ZeoSeven 字体编号 `285`。
- LXGW WenKai 使用 ZeoSeven 字体编号 `292`。
- Maple Mono NF CN 使用 ZeoSeven 字体编号 `442`。
- 根布局为 ZeoSeven 添加 `preconnect`，并加载三组字体样式表。
- 主 CDN 样式表加载失败时切换到参考项目使用的 `fontsapi-storage.zeoseven.com` 备用地址。
- 主、备用 CDN 都不可用时，浏览器继续使用对应字体栈中的系统回退字体，页面内容与交互不被阻断。

## 样式接入

全局样式定义统一的 sans、serif、mono 和 semi-serif 字体变量。Tailwind 的 `font-serif` 与 `font-mono` 映射到同一组变量，现有自定义样式也复用这些变量，避免同一种语义在不同组件中落到不同字体。

具体应用规则：

- `body` 及表单控件使用 sans 字体栈。
- 标题和当前使用 `font-serif` 的元素使用 serif 字体栈。
- 代码、元数据和当前使用 `font-mono` 的元素使用 mono 字体栈。
- 提供 semi-serif 样式入口，但当前没有默认使用者。

## 组件边界

新增一个只负责字体样式表加载的轻量客户端组件。该组件维护 ZeoSeven 主地址到备用地址的一次性切换，不处理字体展示或页面业务。根布局负责预连接、本地 HarmonyOS 样式表以及该加载组件的挂载。

## 错误处理

- CDN 主地址失败：对应样式表改用备用地址。
- 备用地址失败：不再重试，交由 CSS fallback 处理，避免循环请求。
- 本地 HarmonyOS 资源缺失应由构建前静态检查发现；线上意外缺失时同样回退到系统非衬线字体。

## 验证方案

1. 静态测试验证四组字体变量、三组 CDN 地址、备用地址及 HarmonyOS 本地样式入口存在。
2. 单元测试验证 CDN 错误处理只切换一次，不形成重试循环。
3. 执行类型检查、测试与生产构建。
4. 启动本地服务，在浏览器中检查公开页面与后台页面的网络字体请求和计算后 `font-family`。
5. 模拟 CDN 主地址失败，确认备用地址接管；模拟 CDN 全部失败，确认页面仍以系统 fallback 正常显示。

## 影响与限制

- 项目会增加 HarmonyOS Sans SC 分片字体资源，仓库体积随之增加。
- Noto Serif CJK、LXGW WenKai 与 Maple Mono NF CN 的实际展示依赖 ZeoSeven 可用性；不可用时会自动降级。
- 本次只复刻字体选择和加载，不调整字号、字重、行高或版面布局。
